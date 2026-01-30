import { useState } from "react";
import { Search, RefreshCw, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { TopBar } from "@/components/TopBar";
import { OrderCard } from "@/components/OrderCard";
import { OrderDetailSheet } from "@/components/OrderDetailSheet";
import { useOrdersHistory } from "@/hooks/useOrdersHistory";
import { useDebounce } from "@/hooks/useDebounce";
import { Order } from "@/lib/types";
import { matchOrder } from "@/lib/search";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function History() {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isOrderSheetOpen, setIsOrderSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const debouncedQuery = useDebounce(searchQuery, 200);
  
  const { orders, isLoading, refetch } = useOrdersHistory();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Filter orders based on search
  const filteredOrders = orders.filter(order => 
    !debouncedQuery.trim() || matchOrder(order, debouncedQuery)
  );

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
    setIsOrderSheetOpen(true);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    queryClient.invalidateQueries({ queryKey: ['orders-history'] });
    refetch();
    toast({
      title: "Opdateret",
      description: "Ordrer er blevet opdateret fra serveren",
    });
  };

  const handleDeleteOrder = async (orderId: string) => {
    setDeletingOrderId(orderId);
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (error) throw error;

      // Update local cache
      queryClient.setQueryData(['orders-history'], (oldData: Order[] | undefined) => {
        return (oldData || []).filter(order => order.id !== orderId);
      });

      toast({
        title: "Ordre slettet",
        description: "Ordren er blevet permanent slettet"
      });
    } catch (error) {
      console.error('Error deleting order:', error);
      toast({
        title: "Fejl",
        description: "Kunne ikke slette ordre",
        variant: "destructive"
      });
    } finally {
      setDeletingOrderId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-lg font-semibold mb-2">Indlæser historik...</div>
          <div className="text-ink-dim">Henter afsluttede ordrer</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopBar onOrderClick={handleOrderClick} />
      
      {/* Search and refresh bar */}
      <div className="bg-background border-b border-line p-3 sm:p-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-ink-dim w-4 h-4" />
            <Input
              placeholder="Søg i historik..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 text-sm sm:text-base min-h-[40px]"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            className="flex-shrink-0 min-h-[40px]"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Results count */}
        <div className="text-xs sm:text-sm text-ink-dim mt-2">
          {debouncedQuery.trim() ? (
            `${filteredOrders.length} resultater for "${debouncedQuery}"`
          ) : (
            `${orders.length} afsluttede ordrer`
          )}
        </div>
      </div>

      {/* Orders list */}
      <div className="flex-1 p-3 sm:p-4 overflow-y-auto">
        {filteredOrders.length === 0 ? (
          <div className="text-center text-ink-dim py-12 text-sm sm:text-base">
            {debouncedQuery.trim() ? 
              `Ingen resultater for "${debouncedQuery}"` :
              "Ingen afsluttede ordrer endnu"
            }
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {filteredOrders.map((order) => (
              <div key={order.id} className="relative group">
                <OrderCard
                  order={order}
                  onStatusChange={() => {}} // No status changes in history
                  onCardClick={handleOrderClick}
                  readonly={true}
                />
                
                {/* Delete button overlay */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-8 w-8 p-0"
                        disabled={deletingOrderId === order.id}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Slet ordre</AlertDialogTitle>
                        <AlertDialogDescription>
                          Er du sikker på at du vil slette ordre #{order.id.slice(0, 8)} for {order.customerName}? 
                          Denne handling kan ikke fortrydes.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuller</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteOrder(order.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Slet ordre
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Order detail sheet */}
      {selectedOrder && (
        <OrderDetailSheet
          order={selectedOrder}
          open={isOrderSheetOpen}
          onOpenChange={(open) => {
            setIsOrderSheetOpen(open);
            if (!open) {
              setSelectedOrder(null);
            }
          }}
          onStatusChange={() => {}} // No status changes in history
        />
      )}
    </div>
  );
}