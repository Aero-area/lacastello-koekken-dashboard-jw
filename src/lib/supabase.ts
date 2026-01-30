
import { supabase } from "@/integrations/supabase/client";
import { Order } from "@/lib/types";
import { transformOrder } from "@/lib/transform";

export { supabase };

// Function to fetch full order details from orders table
export const fetchOrderDetails = async (orderId: string) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('notes,allergies')
      .eq('id', orderId as any)
      .single();

    if (error) {
      // Handle auth errors specifically
      if (error.code === 'PGRST301' || error.message?.includes('JWT') || error.message?.includes('authentication')) {
        console.error('Authentication required for order details:', error);
        return null;
      }
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error fetching order details:', error);
    return null;
  }
};

// Helper function to subscribe to order updates
export const subscribeOrders = (
  onInsert: (order: Order) => void,
  onUpdate: (order: Order) => void
) => {
  console.log("Setting up Supabase realtime subscription...");
  
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;
  let reconnectTimeoutId: NodeJS.Timeout | null = null;
  let channel: any = null;

  const createSubscription = async () => {
    // Check for valid session before creating subscription
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.warn('Session error:', sessionError);
        return;
      }
    
      if (!session?.access_token) {
        console.log('No valid session found, skipping realtime subscription');
        return;
      }

      console.log('Valid session found, creating realtime subscription');
    } catch (error) {
      console.warn('Error checking session:', error);
      return;
    }

    // Clear any existing subscription
    if (channel) {
      try {
        supabase.removeChannel(channel);
      } catch (error) {
        console.warn('Error removing previous channel:', error);
      }
    }

    channel = supabase
      .channel(`orders-changes-${Date.now()}`, {
        config: {
          broadcast: { self: false },
          presence: { key: `kitchen-${Date.now()}` },
        },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('New order received:', payload.new);
          try {
            transformOrder(payload.new).then(newOrder => {
              onInsert(newOrder);
            }).catch(error => {
              console.error('Error transforming new order:', error);
            });
          } catch (error) {
            console.error('Error processing new order:', error);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('Order updated:', payload.new);
          try {
            transformOrder(payload.new).then(updatedOrder => {
              onUpdate(updatedOrder);
            }).catch(error => {
              console.error('Error transforming updated order:', error);
            });
          } catch (error) {
            console.error('Error processing updated order:', error);
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          reconnectAttempts = 0; // Reset counter on successful connection
          console.log('Successfully subscribed to realtime updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('Realtime channel error occurred');
          
          // Clear the failed channel
          if (channel) {
            try {
              supabase.removeChannel(channel);
              channel = null;
            } catch (error) {
              console.warn('Error removing failed channel:', error);
            }
          }
          
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000); // Exponential backoff, max 30s
            
            console.log(`Attempting to reconnect realtime... (attempt ${reconnectAttempts}/${maxReconnectAttempts}) in ${delay}ms`);
            
            reconnectTimeoutId = setTimeout(async () => {
              // Refresh session before retrying
              try {
                const { error } = await supabase.auth.refreshSession();
                if (error) {
                  console.warn('Failed to refresh session:', error);
                }
                console.log('Session refreshed, retrying subscription');
              } catch (error) {
                console.warn('Failed to refresh session:', error);
              }
              createSubscription();
            }, delay);
          } else {
            console.error('Max reconnection attempts reached. Please refresh the page.');
          }
        } else if (status === 'CLOSED') {
          console.log('Realtime channel closed');
        } else if (status === 'TIMED_OUT') {
          console.warn('Realtime subscription timed out');
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            setTimeout(async () => {
              createSubscription();
            }, 2000);
          }
        }
      });
  };

  // Initial subscription
  createSubscription().catch(error => {
    console.error('Failed to create initial subscription:', error);
  });

  // Return cleanup function
  return () => {
    console.log("Unsubscribing from realtime updates...");
    
    if (reconnectTimeoutId) {
      clearTimeout(reconnectTimeoutId);
      reconnectTimeoutId = null;
    }
    
    try {
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
    } catch (error) {
      console.warn('Error removing realtime channel:', error);
    }
  };
};

// Function to update order status
export const updateOrderStatus = async (orderId: string, newStatus: Order['status']): Promise<void> => {
  // Check for authentication session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    throw new Error('AUTHENTICATION_REQUIRED');
  }

  try {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus } as any)
      .eq('id', orderId as any);

    if (error) {
      // Throw error with exact code and message for proper handling
      const detailedError = new Error(error.message);
      (detailedError as any).code = error.code;
      (detailedError as any).details = error.details;
      throw detailedError;
    }

    console.log(`Order ${orderId} status updated to ${newStatus}`);
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
};

// Function to update printed_at timestamp
export const updatePrintedAt = async (orderId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('orders')
      .update({ printed_at: new Date().toISOString() } as any)
      .eq('id', orderId as any);

    if (error) {
      console.warn('Could not update printed_at:', error);
    }
  } catch (error) {
    console.warn('Could not update printed_at:', error);
  }
};
