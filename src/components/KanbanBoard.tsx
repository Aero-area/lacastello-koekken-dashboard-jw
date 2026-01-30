import { OrderCard } from "./OrderCard";
import { Order, OrderStatus } from "@/lib/types";

interface KanbanBoardProps {
  orders: Order[];
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void;
  onOrderClick: (order: Order) => void;
  loadingStatus?: string | null;
}

const columns = [
  { key: 'new' as OrderStatus, title: 'Nye', color: 'bg-brand-yellow/10' },
  { key: 'ready' as OrderStatus, title: 'Klar', color: 'bg-brand-green/10' }
];

export function KanbanBoard({ orders, onStatusChange, onOrderClick, loadingStatus }: KanbanBoardProps) {
  const getOrdersByStatus = (status: OrderStatus) => {
    // Show 'in_progress' orders in the 'new' column, and 'ready' orders in the 'ready' column
    if (status === 'new') {
      return orders.filter(order => order.status === 'new' || order.status === 'in_progress');
    }
    return orders.filter(order => order.status === status);
  };

  return (
    <div className="flex-1 p-2 sm:p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4 h-full max-h-[calc(100vh-180px)] md:max-h-[calc(100vh-160px)]">
        {columns.map((column) => {
          const columnOrders = getOrdersByStatus(column.key);
          
          return (
            <div key={column.key} className="flex flex-col h-full min-h-[300px] md:min-h-[400px]">
              {/* Column header */}
              <div className={`${column.color} rounded-t-lg p-2 sm:p-3 border-b border-line`}>
                <h2 className="font-semibold text-ink flex items-center justify-between text-sm sm:text-base">
                  <span>{column.title}</span>
                  <span className="bg-background text-ink-dim px-2 py-1 rounded text-xs sm:text-sm">
                    {columnOrders.length}
                  </span>
                </h2>
              </div>
              
              {/* Column content */}
              <div className="flex-1 bg-chip rounded-b-lg p-2 sm:p-3 overflow-y-auto">
                {columnOrders.length === 0 ? (
                  <div className="text-center text-ink-dim py-8 text-sm">
                    Ingen ordrer
                  </div>
                ) : (
                  columnOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onStatusChange={onStatusChange}
                      onCardClick={onOrderClick}
                      loadingStatus={loadingStatus}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}