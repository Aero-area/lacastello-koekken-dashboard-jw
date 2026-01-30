import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/TopBar";
import { FilterChips } from "@/components/FilterChips";
import { KanbanBoard } from "@/components/KanbanBoard";
import { OrderDetailSheet } from "@/components/OrderDetailSheet";
import { Order, OrderStatus, FulfillmentFilter } from "@/lib/types";
import { updateOrderStatus, updatePrintedAt, supabase } from "@/lib/supabase";
import { printOrder } from "@/lib/print";
import { useOrders } from "@/hooks/useOrders";
import { useRealtimeStatus } from "@/hooks/useRealtimeStatus";
import { useToast } from "@/hooks/use-toast";
import { useDeliveryNotifications } from "@/hooks/useDeliveryNotifications";
import { NewOrderNotification } from "@/components/NewOrderNotification";
import { DeliveryNotification } from "@/components/DeliveryNotification";
import { CreateCustomerDialog } from "@/components/CreateCustomerDialog";
import { CreateOrderDialog } from "@/components/CreateOrderDialog";

export function Dashboard() {
  const [fulfillmentFilter, setFulfillmentFilter] = useState<FulfillmentFilter>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isOrderSheetOpen, setIsOrderSheetOpen] = useState(false);
  const [isCreateCustomerOpen, setIsCreateCustomerOpen] = useState(false);
  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const { orders, isLoading, newOrderNotification, dismissNewOrderNotification } = useOrders({ 
    filter: fulfillmentFilter
  });
  const [loadingStatus, setLoadingStatus] = useState<string | null>(null);
  const { online } = useRealtimeStatus();
  const { toast } = useToast();
  const { deliveredOrder, dismissDeliveryNotification } = useDeliveryNotifications();

  // Check session on app init
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
      }
    };
    
    checkSession();
  }, [navigate]);

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    // Check session before attempting update
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/login');
      return;
    }

    setLoadingStatus(orderId);
    
    // Optimistic update: remove from board if moving to 'done'
    let wasOptimisticallyRemoved = false;
    if (newStatus === 'done') {
      wasOptimisticallyRemoved = true;
      queryClient.setQueryData(['orders', { filter: 'all', search: '' }], (oldData: Order[] | undefined) => {
        return (oldData || []).filter(order => order.id !== orderId);
      });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    }

    try {
      await updateOrderStatus(orderId, newStatus);
      
      // Log the status change (best effort)
      try {
        const eventType = newStatus === 'in_progress' ? 'start' : 
                         newStatus === 'ready' ? 'finish' : 'complete';
        
        await supabase.from('order_events').insert({
          order_id: orderId,
          event: eventType,
          actor_role: 'kitchen',
          at: new Date().toISOString()
        });
      } catch (auditError) {
        // Ignore audit errors silently
        console.warn('Failed to log status change:', auditError);
      }
      
      // Close sheet if order is done
      if (newStatus === 'done' && selectedOrder?.id === orderId) {
        setIsOrderSheetOpen(false);
        setSelectedOrder(null);
      }

      // Invalidate queries on successful update
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders-history'] });

      toast({
        title: "Status opdateret",
        description: `Ordre flyttet til ${newStatus === 'in_progress' ? 'I gang' : newStatus === 'ready' ? 'Klar' : 'Afsluttet'}`
      });
    } catch (error: any) {
      console.error("Failed to update order status:", error);
      
      // Revert optimistic update on error
      if (wasOptimisticallyRemoved) {
        queryClient.invalidateQueries({ queryKey: ['orders'] });
      }
      
      // Handle authentication errors
      if (error.message === 'AUTHENTICATION_REQUIRED') {
        navigate('/login');
        return;
      }
      
      // Show exact error code and message
      const errorCode = error.code || 'UNKNOWN';
      const errorMessage = error.message || 'Ukendt fejl';
      
      toast({
        title: `Fejl (${errorCode})`,
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoadingStatus(null);
    }
  };

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
    setIsOrderSheetOpen(true);
  };

  const handlePrintOrder = async (order: Order) => {
    try {
      await printOrder(order);
      
      toast({
        title: "Ordre udskrevet",
        description: `Ordre ${order.id.slice(0, 8)} er blevet udskrevet.`,
      });
    } catch (error) {
      toast({
        title: "Fejl",
        description: "Kunne ikke udskrive ordre",
        variant: "destructive"
      });
    }
  };

  const handleFilterChange = (filter: string) => {
    setFulfillmentFilter(filter as FulfillmentFilter);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-lg font-semibold mb-2">Indlæser køkken...</div>
          <div className="text-ink-dim">Henter ordrer fra systemet</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopBar onOrderClick={handleOrderClick} />
      
      <FilterChips
        activeFilter={fulfillmentFilter}
        onFilterChange={handleFilterChange}
        onCreateCustomer={() => setIsCreateCustomerOpen(true)}
        onCreateOrder={() => setIsCreateOrderOpen(true)}
      />
      
      <KanbanBoard
        orders={orders}
        onStatusChange={handleStatusChange}
        onOrderClick={handleOrderClick}
        loadingStatus={loadingStatus}
      />

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
          onStatusChange={handleStatusChange}
          onPrint={handlePrintOrder}
        />
      )}
      
      {/* New order notification */}
      <NewOrderNotification
        order={newOrderNotification}
        onDismiss={dismissNewOrderNotification}
      />
      
      {/* Delivery notification */}
      <DeliveryNotification
        order={deliveredOrder}
        onDismiss={dismissDeliveryNotification}
      />
      
      {/* Create Customer Dialog */}
      <CreateCustomerDialog
        open={isCreateCustomerOpen}
        onOpenChange={setIsCreateCustomerOpen}
        onCustomerCreated={() => {
          // Refresh orders to show new customer data
          queryClient.invalidateQueries({ queryKey: ['orders'] });
        }}
      />
      
      {/* Create Order Dialog */}
      <CreateOrderDialog
        open={isCreateOrderOpen}
        onOpenChange={setIsCreateOrderOpen}
        onOrderCreated={() => {
          // Refresh orders to show new order
          queryClient.invalidateQueries({ queryKey: ['orders'] });
        }}
      />
    </div>
  );
}