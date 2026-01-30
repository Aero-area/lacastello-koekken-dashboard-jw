import { useEffect, useState } from 'react';
import { Bell, Package, Clock, MapPin, Truck, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Order } from '@/lib/types';
import { addressLabel } from '@/lib/address';

interface NewOrderNotificationProps {
  order: Order | null;
  onDismiss: () => void;
}

const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString('da-DK', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

export function NewOrderNotification({ order, onDismiss }: NewOrderNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (order) {
      setIsVisible(true);
      
      // Auto-dismiss after 8 seconds
      const timer = setTimeout(() => {
        handleDismiss();
      }, 8000);
      
      return () => clearTimeout(timer);
    }
  }, [order]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      onDismiss();
    }, 300); // Wait for animation to complete
  };

  if (!order) return null;

  return (
    <div className={`fixed top-4 right-4 z-50 transition-all duration-300 transform ${
      isVisible ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-full opacity-0 scale-95'
    }`}>
      <Card className="w-80 shadow-xl border-2 border-brand-red/20 bg-white animate-pulse">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="bg-brand-red/10 p-2 rounded-lg flex-shrink-0 animate-bounce">
              <Bell className="w-5 h-5 text-brand-red" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm text-gray-900">
                  🔔 Ny ordre modtaget!
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismiss}
                  className="p-1 h-auto text-gray-400 hover:text-gray-600 flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Package className="w-3 h-3 text-blue-500" />
                  <span className="text-sm font-medium text-gray-900">#{order.id.slice(0, 8)}</span>
                  <Badge variant={order.type === 'delivery' ? 'default' : 'secondary'} className="text-xs">
                    {order.type === 'delivery' ? (
                      <>
                        <Truck className="w-3 h-3 mr-1" />
                        UDB
                      </>
                    ) : (
                      <>
                        <MapPin className="w-3 h-3 mr-1" />
                        AFH
                      </>
                    )}
                  </Badge>
                </div>
                
                <div className="text-sm text-gray-700">
                  <strong>{order.customerName}</strong>
                </div>
                
                {order.type === 'delivery' && (
                  <div className="text-xs text-gray-600 truncate">
                    📍 {addressLabel(order)}
                  </div>
                )}
                
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>
                    {order.desiredTime 
                      ? `Ønsket: ${formatTime(order.desiredTime)}`
                      : `Nu (${formatTime(order.createdAt)})`
                    }
                  </span>
                </div>
                
                {order.total && (
                  <div className="text-sm font-semibold text-gray-900">
                    Total: {order.total} kr.
                  </div>
                )}
                
                {order.hasAllergy && (
                  <div className="bg-red-50 border border-red-200 rounded px-2 py-1">
                    <span className="text-xs font-bold text-red-700">⚠️ ALLERGI</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}