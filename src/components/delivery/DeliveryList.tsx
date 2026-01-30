import { useState, useEffect } from 'react';
import { Clock, Phone, User, Truck as TruckIcon, MapPin, Navigation, NavigationOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Order } from '@/lib/types';
import { updateOrderStatus } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { GoogleMapsLoader } from '@/lib/maps';
import { addressLabel } from '@/lib/address';

interface DeliveryListProps {
  orders: Order[];
  selectedOrder: Order | null;
  onSelectOrder: (order: Order) => void;
  orderDistances: Record<string, { distance: string; eta: string }>;
  onDistancesUpdate: (distances: Record<string, { distance: string; eta: string }>) => void;
  userLocation: { lat: number; lng: number } | null;
  isLocationTracking: boolean;
  onToggleLocationTracking: (enabled: boolean) => void;
  onOrderUpdate?: (order: Order) => void;
}

const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString('da-DK', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

function DeliveryOrderItem({ 
  order, 
  isSelected, 
  onSelect,
  onStatusUpdate,
  distance,
  eta,
  onOrderUpdate
}: { 
  order: Order; 
  isSelected: boolean; 
  onSelect: () => void; 
  onStatusUpdate: (orderId: string) => void;
  distance?: string | null;
  eta?: string | null;
  onOrderUpdate?: (order: Order) => void;
}) {
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  const handleMarkDelivered = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Prevent multiple clicks
    if (isAnimatingOut) {
      return;
    }
    
    // Start animation
    setIsAnimatingOut(true);
    
    // Play success sound
    try {
      const audio = new Audio('/order-complete.mp3');
      audio.volume = 0.7;
      audio.play().catch(console.warn);
    } catch (error) {
      console.warn('Could not play completion sound:', error);
    }
    
    // Update order in parent component
    if (onOrderUpdate) {
      onOrderUpdate({ ...order, status: 'done' });
    }
    
    // Update status after animation starts
    setTimeout(() => {
      onStatusUpdate(order.id);
    }, 300);
  };

  return (
    <div
      className={`p-4 border-b border-border cursor-pointer transition-all duration-300 hover:bg-muted/50 hover:shadow-sm ${
        isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500 shadow-sm' : ''
      } ${isAnimatingOut ? 'opacity-0 transform scale-95 bg-green-100' : ''}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-gray-900">#{order.id.slice(0, 8)}</span>
            <Badge 
              variant={order.status === 'ready' ? 'default' : 'secondary'} 
              className={`text-xs ${order.status === 'ready' ? 'bg-green-100 text-green-700 border-green-300' : 'bg-yellow-100 text-yellow-700 border-yellow-300'}`}
            >
              {order.status === 'in_progress' ? 'I gang' : 'Klar'}
            </Badge>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            {order.desiredTime 
              ? formatTime(order.desiredTime)
              : formatTime(order.createdAt)
            }
          </div>
        </div>

        {/* Customer */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-blue-500" />
            <p className="font-medium text-sm md:text-base text-gray-900">{order.customerName}</p>
          </div>
          {order.phone && (
            <div className="flex items-center gap-2">
              <Phone className="w-3 h-3 text-gray-400" />
              <p className="text-xs text-gray-600">{order.phone}</p>
            </div>
          )}
        </div>

        {/* Distance and ETA */}
        {(distance || eta) && (
          <div className="flex items-center gap-3 text-xs">
            {distance && (
              <div className="flex items-center gap-1 text-green-600">
                <MapPin className="w-3 h-3" />
                <span>{distance}</span>
              </div>
            )}
            {eta && (
              <div className="flex items-center gap-1 text-blue-600">
                <Clock className="w-3 h-3" />
                <span>{eta}</span>
              </div>
            )}
          </div>
        )}

        {/* Action button */}
        <div className="flex justify-end pt-2">
          <Button
            size="sm" 
            onClick={handleMarkDelivered}
            className={`text-xs md:text-sm bg-green-600 hover:bg-green-700 px-3 py-1.5 transition-all duration-200 ${
              isAnimatingOut ? 'opacity-50 pointer-events-none' : ''
            } hover:scale-105 active:scale-95`}
            disabled={isAnimatingOut}
          >
            {isAnimatingOut ? 'Leverer...' : 'Markér leveret'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function DeliveryList({ 
  orders, 
  selectedOrder, 
  onSelectOrder, 
  orderDistances, 
  onDistancesUpdate,
  userLocation,
  isLocationTracking,
  onToggleLocationTracking,
  onOrderUpdate
}: DeliveryListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Calculate distances for all orders when they change or user location changes
  useEffect(() => {
    const calculateDistances = async () => {
      console.log('Starting distance calculations for', orders.length, 'orders');
      
      if (!window.google?.maps?.DirectionsService || !window.google?.maps?.Geocoder || orders.length === 0) {
        console.warn('Google Maps services not available:', {
          DirectionsService: !!window.google?.maps?.DirectionsService,
          Geocoder: !!window.google?.maps?.Geocoder,
          ordersCount: orders.length
        });
        return;
      }

      const service = new window.google.maps.DirectionsService();
      const originLocation = userLocation || { lat: 56.0362, lng: 12.6134 };

      for (const order of orders) {
        // Recalculate if user location changed or if not calculated yet
        const needsRecalculation = !orderDistances[order.id] || 
          (userLocation && !orderDistances[order.id]?.eta?.includes('min'));
        
        if (!needsRecalculation) {
          console.log('Skipping order', order.id, '- already calculated for current location');
          continue;
        }

        console.log('Calculating distance for order:', order.id);
        
        try {
          const addressStr = addressLabel(order);
          
          console.log('Getting location for order', order.id, ':', addressStr);
          
          const location = await GoogleMapsLoader.geocodeAddress(addressStr);
          
          if (location) {
            console.log('Location found, calculating route for order', order.id);
            
            service.route({
              origin: originLocation,
              destination: location,
              travelMode: window.google.maps.TravelMode.DRIVING,
              unitSystem: window.google.maps.UnitSystem.METRIC,
              region: 'DK'
            }, (response, status) => {
              console.log('Directions result for order', order.id, ':', { status, hasRoute: !!response?.routes[0] });
              
              if (status === 'OK' && response?.routes[0]?.legs[0]) {
                const leg = response.routes[0].legs[0];
                console.log('Route calculated for order', order.id, ':', {
                  distance: leg.distance?.text,
                  duration: leg.duration?.text
                });
                
                onDistancesUpdate(prev => ({
                  ...prev,
                  [order.id]: {
                    distance: leg.distance?.text || '',
                    eta: leg.duration?.text || ''
                  }
                }));
              } else {
                console.error('Directions failed for order:', order.id, 'Status:', status, 'Response:', response);
                onDistancesUpdate(prev => ({
                  ...prev,
                  [order.id]: {
                    distance: 'Fejl',
                    eta: 'Fejl'
                  }
                }));
              }
            });
          } else {
            console.error('Could not geocode address for order:', order.id, 'Address:', addressStr);
            onDistancesUpdate(prev => ({
              ...prev,
              [order.id]: {
                distance: 'Adresse fejl',
                eta: 'Adresse fejl'
              }
            }));
          }
        } catch (error) {
          console.error('Exception calculating distance for order:', order.id, error);
          onDistancesUpdate(prev => ({
            ...prev,
            [order.id]: {
              distance: 'Fejl',
              eta: 'Fejl'
            }
          }));
        }
      }
    };

    // Recalculate distances when user location changes or orders change
    const timeoutId = setTimeout(() => {
      console.log('Starting distance calculation after timeout');
      calculateDistances();
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [orders, onDistancesUpdate, userLocation, isLocationTracking]);

  // Clear distances when user location tracking is disabled
  useEffect(() => {
    if (!isLocationTracking && userLocation) {
      // Clear all distances to force recalculation from restaurant
      onDistancesUpdate({});
    }
  }, [isLocationTracking, onDistancesUpdate]);

  const handleStatusUpdate = async (orderId: string) => {
    try {
      // Immediately remove from local state before API call
      queryClient.setQueryData(['orders'], (oldData: Order[] | undefined) => {
        const filtered = (oldData || []).filter(order => order.id !== orderId);
        console.log('DeliveryList: Immediately removing order from cache:', orderId, 'Remaining orders:', filtered.length);
        return filtered;
      });
      
      // Force re-render by invalidating queries immediately
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      
      await updateOrderStatus(orderId, 'done');
      
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders-history'] });
      
      toast({
        title: "🎉 Ordre leveret!",
        description: "Fantastisk arbejde! Ordren er markeret som leveret",
        duration: 3000
      });
    } catch (error) {
      // Revert the optimistic update on error
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({
        title: "Fejl",
        description: "Kunne ikke opdatere ordre status",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="w-80 border-r border-gray-200 bg-white flex flex-col shadow-sm">
      <div className="p-3 md:p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2 mb-1">
          <TruckIcon className="w-5 h-5 text-blue-500" />
          <h2 className="font-semibold text-gray-900">Aktive leveringer</h2>
        </div>
        <p className="text-xs md:text-sm text-gray-600">{orders.length} {orders.length === 1 ? 'ordre' : 'ordrer'}</p>
        
        {/* Location tracking toggle */}
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isLocationTracking ? (
                <Navigation className="w-4 h-4 text-blue-500" />
              ) : (
                <NavigationOff className="w-4 h-4 text-gray-400" />
              )}
              <Label htmlFor="location-tracking" className="text-sm font-medium">
                Live lokation
              </Label>
            </div>
            <Switch
              id="location-tracking"
              checked={isLocationTracking}
              onCheckedChange={onToggleLocationTracking}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1 mb-1">
            {isLocationTracking 
              ? userLocation 
                ? "Bruger din position til ETA"
                : "Anmoder om position..."
              : "Bruger restaurant position"
            }
          </p>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {orders.length === 0 ? (
          <div className="p-4 md:p-6 text-center">
            <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <TruckIcon className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-sm md:text-base text-gray-500 font-medium mb-1">Ingen aktive leveringer</p>
            <p className="text-xs text-gray-400">Leveringsordrer vil vises her når de er klar</p>
          </div>
        ) : (
          <div className="pb-4">
            {orders.map((order) => (
              <DeliveryOrderItem
                key={order.id}
                order={order}
                isSelected={selectedOrder?.id === order.id}
                onSelect={() => onSelectOrder(order)}
                onStatusUpdate={handleStatusUpdate}
                distance={orderDistances[order.id]?.distance}
                eta={orderDistances[order.id]?.eta}
                onOrderUpdate={(updatedOrder) => {
                  // Update the selected order if it's the one being updated
                  if (selectedOrder?.id === updatedOrder.id) {
                    onSelectOrder(updatedOrder);
                  }
                }}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}