import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Order } from '@/lib/types';
import { transformOrder } from '@/lib/transform';

export function useOrdersHistory() {
  const {
    data: orders = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['orders-history'],
    queryFn: async (): Promise<Order[]> => {
      const { data, error } = await supabase
        .from('orders')
        .select('id,status,created_at,desired_time,type,customer_name,phone,address,lines,total,notes,allergies,printed_at,driver_id')
        .eq('status', 'done')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        // Handle auth errors specifically  
        if (error.code === 'PGRST301' || error.message?.includes('JWT') || error.message?.includes('authentication')) {
          console.error('Authentication required for order history:', error);
          throw new Error('Du skal være logget ind for at se ordrehistorik');
        }
        throw error;
      }

      // Transform orders with async menu item lookup
      const transformedOrders = [];
      for (const order of (data || [])) {
        const transformed = await transformOrder(order);
        transformedOrders.push(transformed);
      }
      
      return transformedOrders;
    },
    refetchOnWindowFocus: false,
    staleTime: 60000, // 1 minute
  });

  return {
    orders,
    isLoading,
    error,
    refetch
  };
}