import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Order } from '@/lib/types';
import { transformOrder } from '@/lib/transform';

export function useDeliveryNotifications() {
  const [deliveredOrder, setDeliveredOrder] = useState<Order | null>(null);

  useEffect(() => {
    let channel: any = null;

    const setupDeliveryNotifications = async () => {
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        console.log('Setting up delivery notifications...');
        
        channel = supabase
          .channel(`delivery-notifications-${Date.now()}`, {
            config: {
              broadcast: { self: false },
              presence: { key: `kitchen-delivery-${Date.now()}` },
            },
          })
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'orders',
              filter: 'status=eq.done'
            },
            (payload) => {
              console.log('Delivery notification received:', payload.new);
              try {
                transformOrder(payload.new).then(deliveredOrder => {
                  // Only show notification for delivery orders
                  if (deliveredOrder.type === 'delivery') {
                    setDeliveredOrder(deliveredOrder);
                  }
                }).catch(error => {
                  console.error('Error transforming delivery notification:', error);
                });
              } catch (error) {
                console.error('Error processing delivery notification:', error);
              }
            }
          )
          .subscribe((status) => {
            console.log('Delivery notifications subscription status:', status);
          });
      }
    };

    setupDeliveryNotifications();

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (error) {
          console.warn('Error removing delivery notifications channel:', error);
        }
      }
    };
  }, []);

  const dismissDeliveryNotification = () => {
    setDeliveredOrder(null);
  };

  return {
    deliveredOrder,
    dismissDeliveryNotification
  };
}