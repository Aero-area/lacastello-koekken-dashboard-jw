import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { useState } from 'react';
import { supabase, subscribeOrders } from '@/lib/supabase';
import { Order, FulfillmentFilter } from '@/lib/types';
import { useDebounce } from './useDebounce';
import { transformOrder } from '@/lib/transform';
import { addressLabel } from '@/lib/address';
import { getLineSearchText, getLineMenuNo } from '@/lib/orderLineUtils';
import { NewOrderNotification } from '@/components/NewOrderNotification';

// Helper function for robust string normalization
const norm = (s?: string | null): string =>
  (s || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").trim();

const fetchInitialOrders = async (limit: number = 50): Promise<Order[]> => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .neq('status', 'done')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      if (error.code === 'PGRST301' || error.message?.includes('JWT') || error.message?.includes('authentication')) {
        console.error('Authentication required for orders access:', error);
        throw new Error('Du skal være logget ind for at se ordrer');
      }
      throw error;
    }

    if (data?.[0]) {
      console.log('🔍 Raw database data (first order):', data[0]);
      console.log('🔍 Available columns:', Object.keys(data[0]));
      console.log('🔍 Address fields in DB:', {
        address: data[0].address,
        address_street: data[0].address_street,
        address_number: data[0].address_number,
        address_postcode: data[0].address_postcode,
        address_city: data[0].address_city,
        type: data[0].type
      });
    }

    // Transform orders with async menu item lookup
    const transformedOrders = [];
    for (const order of (data || [])) {
      const transformed = await transformOrder(order);
      transformedOrders.push(transformed);
    }
    
    return transformedOrders;
  } catch (error) {
    console.error('Error fetching orders:', error);
    throw error;
  }
};

interface UseOrdersOptions {
  filter?: FulfillmentFilter;
  search?: string;
}

export function useOrders({ filter = 'all', search = '' }: UseOrdersOptions = {}) {
  const queryClient = useQueryClient();
  const debouncedSearch = useDebounce(search, 200);
  const [newOrderNotification, setNewOrderNotification] = useState<Order | null>(null);
  
  const {
    data: orders = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['orders', { filter, search: debouncedSearch }],
    queryFn: () => {
      return fetchInitialOrders(50);
    },
    refetchOnWindowFocus: false,
    staleTime: 30000, // 30 seconds
  });
  // Set up realtime subscription
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const setupRealtimeSubscription = async () => {
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        unsubscribe = subscribeOrders(
          (newOrder: Order) => {
            // Play notification sound for new orders
            try {
              const audio = new Audio('/notification.mp3');
              audio.play().catch(console.warn);
            } catch (error) {
              console.warn('Could not play notification sound:', error);
            }
            
            // Show notification popup
            setNewOrderNotification(newOrder);
            
            // Add new order to cache
            queryClient.setQueryData(['orders', { filter: 'all', search: '' }], (oldData: Order[] | undefined) => {
              return [newOrder, ...(oldData || [])];
            });
            
            // Invalidate all order queries to update filtered views
            queryClient.invalidateQueries({ queryKey: ['orders'] });
          },
          (updatedOrder: Order) => {
            // If order is completed, remove it from the board
            if (updatedOrder.status === 'done') {
              queryClient.setQueryData(['orders'], (oldData: Order[] | undefined) => {
                return (oldData || []).filter(order => order.id !== updatedOrder.id);
              });
            } else {
              // Update specific order in cache
              queryClient.setQueryData(['orders'], (oldData: Order[] | undefined) => {
                return (oldData || []).map(order => 
                  order.id === updatedOrder.id ? updatedOrder : order
                );
              });
            }
            
            // Invalidate all order queries to update filtered views
            queryClient.invalidateQueries({ queryKey: ['orders'] });
          }
        );
      }
    };

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          // User signed in, set up realtime subscription
          await setupRealtimeSubscription();
        } else if (event === 'SIGNED_OUT' || !session) {
          // User signed out or session invalid, clean up subscription
          if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
          }
        }
      }
    );

    // Initial setup
    setupRealtimeSubscription();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      subscription.unsubscribe();
    };
  }, [queryClient]);

  // Filter orders based on criteria
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Apply fulfillment filter
      if (filter !== 'all' && order.type !== filter) {
        return false;
      }
      
      // Apply search filter
      if (debouncedSearch.trim()) {
        const nq = norm(debouncedSearch);
        const phoneQuery = debouncedSearch.replace(/\D+/g, "");

        if (!nq && !phoneQuery) return true;

        const normalizedPhone = order.phone?.replace(/\D+/g, "") || '';
        
        return (
          norm(order.customerName).includes(nq) ||
          (phoneQuery && normalizedPhone.includes(phoneQuery)) ||
          norm(order.id).includes(nq) ||
          norm(order.id.slice(0, 8)).includes(nq) ||
          order.lines.some(line => 
            getLineSearchText(line).toLowerCase().includes(nq) ||
            (getLineMenuNo(line) && getLineMenuNo(line)!.toLowerCase().includes(nq))
          ) ||
          norm(addressLabel(order)).includes(nq)
        );
      }
      
      return true;
    });
  }, [orders, filter, debouncedSearch]);

  return {
    orders: filteredOrders,
    isLoading,
    error,
    refetch,
    newOrderNotification,
    dismissNewOrderNotification: () => setNewOrderNotification(null)
  };
}