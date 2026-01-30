import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Order } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { ORDER_STATUS } from '@/constants/status';

interface CompleteOrderMutationVariables {
  order: Order;
}

interface MutationContext {
  prevBoard: Order[] | undefined;
  prevHist: Order[] | undefined;
}

export function useCompleteOrder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<void, Error, CompleteOrderMutationVariables, MutationContext>({
    mutationFn: async ({ order }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status: ORDER_STATUS.DONE })
        .eq('id', order.id)
        .select('id,status')
        .single();

      if (error) {
        throw error;
      }
    },

    onMutate: async ({ order }) => {
      await queryClient.cancelQueries({ queryKey: ['orders'] });
      await queryClient.cancelQueries({ queryKey: ['orders-history'] });
      
      const prevBoard = queryClient.getQueryData<Order[]>(['orders']) ?? [];
      const prevHist = queryClient.getQueryData<Order[]>(['orders-history']) ?? [];

      // Remove from board
      queryClient.setQueryData(['orders'], prevBoard.filter((o) => o.id !== order.id));
      
      // Push clone to history
      const doneOrder: Order = { ...order, status: 'done' };
      queryClient.setQueryData(['orders-history'], [doneOrder, ...prevHist].slice(0, 100));

      return { prevBoard, prevHist };
    },

    onError: (error, _variables, context) => {
      queryClient.setQueryData(['orders'], context?.prevBoard);
      queryClient.setQueryData(['orders-history'], context?.prevHist);
      
      toast({
        title: "Fejl",
        description: error.message ?? "Kunne ikke opdatere ordrestatus",
        variant: "destructive"
      });
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders-history'] });

      toast({
        title: "Ordre afsluttet",
        description: "Ordren er blevet markeret som færdig"
      });
    }
  });
}