import { Clock, MapPin, Truck, Phone, Printer, User, TriangleAlert as AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Order, OrderStatus } from "@/lib/types";
import { hasAllergy } from "@/lib/transform";
import { addressLabel } from "@/lib/address";
import { Separator } from "@/components/ui/separator";
import { useCompleteOrder } from "@/hooks/useCompleteOrder";
import OrderLineItem from "./OrderLineItem";

interface OrderCardProps {
  order: Order;
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void;
  onCardClick: (order: Order) => void;
  readonly?: boolean;
  loadingStatus?: string | null;
}

const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString('da-DK', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getStatusButton = (status: OrderStatus) => {
  switch (status) {
    case 'new':
      return { text: 'Start ordre', nextStatus: 'in_progress' as OrderStatus };
    case 'in_progress':
      return { text: 'Gør klar', nextStatus: 'ready' as OrderStatus };
    case 'ready':
      return { text: 'Afslut ordre', nextStatus: 'done' as OrderStatus };
    default:
      return null;
  }
};

export function OrderCard({ order, onStatusChange, onCardClick, readonly = false, loadingStatus }: OrderCardProps) {
  const statusButton = readonly || order.status === 'done' ? null : getStatusButton(order.status);
  
  // Format times
  const createdTime = formatTime(order.createdAt);
  const desiredTime = order.desiredTime ? formatTime(order.desiredTime) : null;
  const timeDisplay = desiredTime ? `${createdTime} (ønsket ${desiredTime})` : `${createdTime} (nu)`;
  
  const isLoading = loadingStatus === order.id;
  const orderHasAllergy = hasAllergy(order);
  const completeOrder = useCompleteOrder();
  const hasRevision = order.revision > 0;

  const handleCardClick = () => {
    if (!readonly) {
      onCardClick(order);
    }
  };

  const handleStatusClick = (e: React.MouseEvent, nextStatus: OrderStatus) => {
    e.stopPropagation();
    
    // Prevent multiple clicks
    if (isLoading || completeOrder.isPending) {
      return;
    }
    
    if (nextStatus === 'done') {
      completeOrder.mutate({ order });
    } else {
      onStatusChange(order.id, nextStatus);
    }
  };

  return (
    <Card 
      className={`mb-2 sm:mb-3 transition-shadow ${readonly ? '' : 'cursor-pointer hover:shadow-md touch-manipulation'}`}
      onClick={handleCardClick}
    >
      <CardContent className="p-3 sm:p-4">
        {/* Header with time and type */}
        <div className="flex items-start justify-between mb-2 gap-2">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-ink-dim min-w-0 flex-1">
            <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="truncate">{timeDisplay}</span>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:gap-1 flex-shrink-0">
            <Badge variant={order.type === 'delivery' ? 'default' : 'secondary'} className="text-xs">
              {order.type === 'delivery' ? (
                <>
                  <Truck className="w-3 h-3 mr-1" />
                  <span className="hidden xs:inline">UDBRINGNING</span>
                  <span className="xs:hidden">UDB</span>
                </>
              ) : (
                <>
                  <MapPin className="w-3 h-3 mr-1" />
                  <span className="hidden xs:inline">AFHENTNING</span>
                  <span className="xs:hidden">AFH</span>
                </>
              )}
            </Badge>
            {orderHasAllergy && (
              <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200 text-xs font-bold">
                ALLERGI
              </Badge>
            )}
            {hasRevision && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                REV
              </Badge>
            )}
          </div>
        </div>

        {/* Customer info with phone and allergy warning */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <User className="w-3 h-3 sm:w-4 sm:h-4 text-ink-dim flex-shrink-0" />
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-semibold text-ink truncate text-sm sm:text-base">{order.customerName}</span>
              {order.phone && (
                <span className="text-xs text-ink-dim truncate">{order.phone}</span>
              )}
            </div>
            {orderHasAllergy && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <AlertTriangle 
                  className="w-3 h-3 sm:w-4 sm:h-4 text-red-600" 
                  aria-label="Allergi advarsel"
                />
                <Badge variant="destructive" className="text-xs hidden sm:inline-flex">ALLERGI</Badge>
              </div>
            )}
          </div>
        </div>

        {/* Total price */}
        {order.total && (
          <div className="text-xs sm:text-sm font-semibold text-ink mb-2">
            Total: {order.total} kr.
          </div>
        )}

        {/* Address for delivery orders */}
        {order.type === 'delivery' && (
          <div className="text-xs sm:text-sm text-ink-dim mb-2 truncate">
            {addressLabel(order)}
          </div>
        )}

        {/* Items preview (show first 1-2 lines) */}
        <div className="mb-3">
          {order.lines.slice(0, 2).map((line, index) => (
            <div key={index} className="text-ink-dim text-xs sm:text-sm">
              <OrderLineItem line={line} />
            </div>
          ))}
          {order.lines.length > 2 && (
            <div className="text-xs text-ink-dim">...og {order.lines.length - 2} mere</div>
          )}
        </div>

        {/* Footer with order ID and action button */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-ink-dim font-mono truncate">
            #{order.id.slice(0, 8)}
          </span>
          
          {statusButton && !readonly && (
            <Button
              size="sm"
              disabled={isLoading || completeOrder.isPending}
              onClick={(e) => handleStatusClick(e, statusButton.nextStatus)}
              className="min-h-[40px] sm:min-h-[44px] text-xs sm:text-sm px-2 sm:px-4 flex-shrink-0 transition-all duration-200 hover:scale-105 active:scale-95"
            >
              {(isLoading || completeOrder.isPending) ? 'Behandler...' : statusButton.text}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}