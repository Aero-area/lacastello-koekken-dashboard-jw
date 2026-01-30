import { useEffect, useState } from 'react';
import { Truck, X, MapPin, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Order } from '@/lib/types';
import { addressLabel } from '@/lib/address';

interface DeliveryNotificationProps {
  order: Order | null;
  onDismiss: () => void;
}

const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString('da-DK', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

export function DeliveryNotification({ order, onDismiss }: DeliveryNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (order) {
      setIsVisible(true);
      
      // Play delivery sound
      try {
        const audio = new Audio('/delivery-complete.mp3');
        audio.volume = 0.8;
        audio.play().catch(console.warn);
      } catch (error) {
        console.warn('Could not play delivery sound:', error);
      }
      
      // Auto-dismiss after 10 seconds
      const timer = setTimeout(() => {
        handleDismiss();
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, [order]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      onDismiss();
    }, 300);
  };

  if (!order) return null;

  return (
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ${
      isVisible ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-full opacity-0 scale-95'
    }`}>
      <Card className="w-96 max-w-[90vw] shadow-2xl border-2 border-green-500/30 bg-white">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="bg-green-100 p-3 rounded-full flex-shrink-0 animate-pulse">
              <Truck className="w-6 h-6 text-green-600" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-lg text-green-800">
                  🎉 Ordre leveret!
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
                  <span className="text-sm font-medium text-gray-900">#{order.id.slice(0, 8)}</span>
                  <Badge className="bg-green-100 text-green-700 border-green-300">
                    <Truck className="w-3 h-3 mr-1" />
                    LEVERET
                  </Badge>
                </div>
                
                <div className="text-sm font-medium text-gray-900">
                  {order.customerName}
                </div>
                
                <div className="text-xs text-gray-600 truncate">
                  📍 {addressLabel(order)}
                </div>
                
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>Leveret: {formatTime(new Date().toISOString())}</span>
                </div>
                
                {order.total && (
                  <div className="text-sm font-semibold text-gray-900">
                    Total: {order.total} kr.
                  </div>
                )}
              </div>
              
              <div className="mt-3 text-xs text-green-700 bg-green-50 p-2 rounded">
                ✅ Fantastisk arbejde! Ordren er blevet leveret til kunden.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}