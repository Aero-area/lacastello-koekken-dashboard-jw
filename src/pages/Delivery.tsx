import { useState, useMemo } from 'react';
import { useEffect } from 'react';
import { useOrders } from '@/hooks/useOrders';
import { TopBar } from '@/components/TopBar';
import { DeliveryList } from '@/components/delivery/DeliveryList';
import { DeliveryMap } from '@/components/delivery/DeliveryMap';
import { Order } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { MapPin, Truck as TruckIcon, Navigation, NavigationOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateOrderStatus } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

export function Delivery() {
  const { orders, isLoading } = useOrders();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderDistances, setOrderDistances] = useState<Record<string, { distance: string; eta: string }>>({});
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocationTracking, setIsLocationTracking] = useState(false);
  const [locationWatchId, setLocationWatchId] = useState<number | null>(null);
  const [showOrdersList, setShowOrdersList] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Debug logging for selectedOrder changes
  useEffect(() => {
    console.log('🎯 DELIVERY: selectedOrder changed to:', selectedOrder?.id?.slice(0, 8) || 'null');
  }, [selectedOrder]);

  // Filter for active delivery orders
  const activeDeliveryOrders = useMemo(() => {
    const filtered = orders.filter(order => 
      order.type === 'delivery' && 
      (order.status === 'in_progress' || order.status === 'ready')
    );
    console.log('Delivery: Active delivery orders filtered:', filtered.length, 'from total:', orders.length);
    console.log('Delivery: Active order IDs:', filtered.map(o => o.id.slice(0, 8)));
    return filtered;
  }, [orders]);

  // Auto-select first order if none selected and clear selection if order no longer exists
  useEffect(() => {
    if (!selectedOrder && activeDeliveryOrders.length > 0) {
      setSelectedOrder(activeDeliveryOrders[0]);
    }
    
    // Clear selection if selected order is no longer in the active list
    if (selectedOrder && !activeDeliveryOrders.find(o => o.id === selectedOrder.id)) {
      setSelectedOrder(null);
    }
  }, [selectedOrder, activeDeliveryOrders]);

  // Clear order distances when orders are removed
  useEffect(() => {
    const activeOrderIds = new Set(activeDeliveryOrders.map(o => o.id));
    setOrderDistances(prev => {
      const filtered = Object.fromEntries(
        Object.entries(prev).filter(([orderId]) => activeOrderIds.has(orderId))
      );
      return filtered;
    });
  }, [activeDeliveryOrders]);

  // Get distance info for selected order
  const selectedOrderDistance = selectedOrder ? orderDistances[selectedOrder.id] : null;

  // Handle status update for mobile
  const handleStatusUpdate = async (orderId: string) => {
    try {
      // Immediately remove from local state before API call
      queryClient.setQueryData(['orders'], (oldData: Order[] | undefined) => {
        const filtered = (oldData || []).filter(order => order.id !== orderId);
        console.log('Immediately removing order from cache:', orderId, 'Remaining orders:', filtered.length);
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
  // Handle location tracking toggle
  const handleToggleLocationTracking = (enabled: boolean) => {
    if (enabled) {
      // Request location permission and start tracking
      if ('geolocation' in navigator) {
        // Check if geolocation is supported and permissions
        if (!navigator.geolocation) {
          toast({
            title: "Position ikke understøttet",
            description: "Din browser understøtter ikke geolocation",
            variant: "destructive"
          });
          return;
        }

        // Show permission request toast
        toast({
          title: "Anmoder om position",
          description: "Tillad adgang til din position for live tracking",
        });

        // Get initial position
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const newLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            setUserLocation(newLocation);
            setIsLocationTracking(true);
            
            // Clear existing distances to force recalculation with new location
            setOrderDistances({});
            
            toast({
              title: "Position aktiveret",
              description: "Bruger nu din position til ETA beregning",
            });

            // Start watching position changes
            const watchId = navigator.geolocation.watchPosition(
              (position) => {
                const updatedLocation = {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude
                };
                setUserLocation(updatedLocation);
                
                // Clear distances to trigger recalculation with new position
                setOrderDistances({});
              },
              (error) => {
                console.warn('Location watch error:', error.code, error.message);
                // Don't show error toast for watch errors, just log them
                // The initial position is still working
              },
              {
                enableHighAccuracy: false, // Changed to false for better compatibility
                timeout: 15000, // Increased timeout
                maximumAge: 60000 // 1 minute cache
              }
            );
            setLocationWatchId(watchId);
          },
          (error) => {
            console.error('Geolocation error:', error.code, error.message);
            let errorMessage = "Kunne ikke få adgang til position";
            let suggestions = "";
            
            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMessage = "Position adgang nægtet";
                suggestions = "Tillad position i browserindstillinger og prøv igen";
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage = "Position ikke tilgængelig";
                suggestions = "Kontroller din internetforbindelse og GPS";
                break;
              case error.TIMEOUT:
                errorMessage = "Position anmodning timeout";
                suggestions = "Prøv igen eller kontroller GPS signal";
                break;
              default:
                errorMessage = "Ukendt position fejl";
                suggestions = "Prøv at genindlæse siden";
            }
            
            toast({
              title: errorMessage,
              description: suggestions,
              variant: "destructive"
            });
            setIsLocationTracking(false);
          },
          {
            enableHighAccuracy: false, // Changed to false for better compatibility
            timeout: 15000, // Increased timeout to 15 seconds
            maximumAge: 300000 // 5 minutes cache for initial position
          }
        );
      } else {
        toast({
          title: "Position ikke understøttet",
          description: "Din browser understøtter ikke geolocation",
          variant: "destructive"
        });
      }
    } else {
      // Stop location tracking
      if (locationWatchId !== null) {
        navigator.geolocation.clearWatch(locationWatchId);
        setLocationWatchId(null);
      }
      setUserLocation(null);
      setIsLocationTracking(false);
      
      // Clear distances to force recalculation from restaurant
      setOrderDistances({});
      
      toast({
        title: "Position deaktiveret",
        description: "Bruger nu restaurant position til ETA",
      });
    }
  };

  // Cleanup location watching on unmount
  useEffect(() => {
    return () => {
      if (locationWatchId !== null) {
        navigator.geolocation.clearWatch(locationWatchId);
      }
    };
  }, [locationWatchId]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="bg-white rounded-full p-4 shadow-lg mb-4 mx-auto w-fit">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-500"></div>
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Indlæser leveringer</h3>
          <p className="text-gray-500 text-sm">Henter aktive leveringsordrer...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <TopBar onOrderClick={(order) => {
        setSelectedOrder(order);
      }} />
      
      {/* Delivery specific header */}
      <div className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0 z-10">
        <div className="p-2 md:p-4">
          <div className="flex items-center justify-between mb-2 md:mb-0">
            <div className="flex items-center gap-2">
              <div className="bg-blue-100 p-1 md:p-2 rounded-lg">
                <TruckIcon className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
              </div>
              <div className="hidden sm:block">
                <h1 className="font-semibold text-gray-900">Leveringsoversigt</h1>
                <p className="text-sm text-gray-500">Spor aktive leveringer i realtid</p>
              </div>
              <div className="sm:hidden">
                <h1 className="font-semibold text-gray-900 text-xs">Leveringer</h1>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              {isLocationTracking && userLocation && (
                <Navigation className="w-3 h-3 text-blue-500" />
              )}
              <MapPin className="w-3 h-3" />
              <span className="hidden sm:inline">Live kort</span>
              <span className="sm:hidden">Live</span>
            </div>
          </div>
          
          {/* Mobile: Compact controls */}
          <div className="md:hidden">
            {/* Location toggle - compact */}
            <div className="flex items-center justify-between py-1 mb-2 bg-gray-50 rounded px-2">
              <div className="flex items-center gap-2">
                {isLocationTracking ? (
                  <Navigation className="w-3 h-3 text-blue-500" />
                ) : (
                  <NavigationOff className="w-3 h-3 text-gray-400" />
                )}
                <Label htmlFor="mobile-location-tracking" className="text-xs font-medium">
                  Live lokation
                </Label>
              </div>
              <Switch
                id="mobile-location-tracking"
                checked={isLocationTracking}
                onCheckedChange={handleToggleLocationTracking}
                className="scale-75"
              />
            </div>
            
            {/* Orders toggle button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowOrdersList(!showOrdersList)}
              className="w-full h-8 text-xs justify-between"
            >
              <div className="flex items-center gap-2">
                <TruckIcon className="w-3 h-3" />
                <span>{activeDeliveryOrders.length} aktive leveringer</span>
              </div>
              <span className="text-xs">{showOrdersList ? '▼' : '▶'}</span>
            </Button>
          </div>
        </div>
      </div>
      
      {/* Mobile: Collapsible orders list */}
      {showOrdersList && (
        <div className="md:hidden bg-white border-b border-gray-200 max-h-60 overflow-y-auto">
          <div className="p-2">
            {activeDeliveryOrders.length === 0 ? (
              <div className="text-center py-4 text-xs text-gray-500">
                Ingen aktive leveringer
              </div>
            ) : (
              <div className="space-y-2">
                {activeDeliveryOrders.map((order) => (
                  <div
                    key={order.id}
                    className={`p-2 border rounded cursor-pointer transition-all ${
                      selectedOrder?.id === order.id 
                        ? 'bg-blue-50 border-blue-200' 
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                    onClick={() => {
                      setSelectedOrder(order);
                      setShowOrdersList(false);
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-xs">#{order.id.slice(0, 8)}</span>
                      <Badge 
                        variant={order.status === 'ready' ? 'default' : 'secondary'} 
                        className="text-xs scale-75"
                      >
                        {order.status === 'in_progress' ? 'I gang' : 'Klar'}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-700 mb-1">{order.customerName}</div>
                    {orderDistances[order.id] && (
                      <div className="flex gap-2 text-xs text-gray-500">
                        {orderDistances[order.id].distance && (
                          <span>📍 {orderDistances[order.id].distance}</span>
                        )}
                        {orderDistances[order.id].eta && (
                          <span>⏱️ {orderDistances[order.id].eta}</span>
                        )}
                      </div>
                    )}
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusUpdate(order.id);
                        }}
                        className="w-full bg-green-600 hover:bg-green-700 text-white text-xs py-1"
                      >
                        Markér leveret
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Desktop: Sidebar */}
        <div className="hidden md:block">
          <DeliveryList
            orders={activeDeliveryOrders}
            selectedOrder={selectedOrder}
            onSelectOrder={setSelectedOrder}
            orderDistances={orderDistances}
            onDistancesUpdate={setOrderDistances}
            userLocation={userLocation}
            isLocationTracking={isLocationTracking}
            onToggleLocationTracking={handleToggleLocationTracking}
            onOrderUpdate={(updatedOrder) => {
              // Update selected order if it's the one being updated
              if (selectedOrder?.id === updatedOrder.id) {
                setSelectedOrder(updatedOrder);
              }
            }}
          />
        </div>
        
        {/* Map - takes full width on mobile */}
        <div className="flex-1 min-h-0 h-full w-full relative">
          <DeliveryMap 
            selectedOrder={selectedOrder} 
            selectedOrderDistance={selectedOrderDistance}
            allOrders={activeDeliveryOrders}
            userLocation={userLocation}
            isLocationTracking={isLocationTracking}
            onStatusUpdate={handleStatusUpdate}
            onSelectOrder={setSelectedOrder}
          />
        </div>
      </div>
    </div>
  );
}