import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, MapPin, Clock, Phone } from 'lucide-react';
import { GoogleMapsLoader, HELSINGOR_CENTER } from '@/lib/maps';
import { Order } from '@/lib/types';
import { addressLabel } from '@/lib/address';

// La Castello restaurant location
const LA_CASTELLO_LOCATION = { lat: 56.0362, lng: 12.6134 };

interface DeliveryMapProps {
  selectedOrder: Order | null;
  selectedOrderDistance?: { distance: string; eta: string } | null;
  allOrders: Order[];
  userLocation: { lat: number; lng: number } | null;
  isLocationTracking: boolean;
  onStatusUpdate: (orderId: string) => void;
  onSelectOrder: (order: Order | null) => void;
}

interface MarkerData {
  marker: google.maps.Marker;
  order: Order;
}

export function DeliveryMap({ 
  selectedOrder, 
  selectedOrderDistance, 
  allOrders, 
  userLocation, 
  isLocationTracking, 
  onStatusUpdate, 
  onSelectOrder 
}: DeliveryMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentInfoWindow, setCurrentInfoWindow] = useState<google.maps.InfoWindow | null>(null);
  
  // Store markers with their associated orders
  const markersRef = useRef<{
    restaurant: google.maps.Marker | null;
    userLocation: google.maps.Marker | null;
    customers: MarkerData[];
    route: google.maps.DirectionsRenderer | null;
  }>({
    restaurant: null,
    userLocation: null,
    customers: [],
    route: null,
  });

  // Function to update marker colors based on selection
  const updateMarkerColors = useCallback(() => {
    console.log('🎨 Updating marker colors. Selected order:', selectedOrder?.id?.slice(0, 8) || 'none');
    
    markersRef.current.customers.forEach((markerData, index) => {
      const isSelected = selectedOrder?.id === markerData.order.id;
      const color = isSelected ? '#ef4444' : '#f97316'; // red : orange
      const scale = isSelected ? 10 : 7;
      const strokeWeight = isSelected ? 4 : 2;
      
      console.log(`🎨 Updating marker ${index} for order ${markerData.order.id.slice(0, 8)}: ${isSelected ? 'RED (selected)' : 'ORANGE (other)'}`);
      
      markerData.marker.setIcon({
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: color,
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: strokeWeight,
        scale: scale,
      } as google.maps.Symbol);
    });
  }, [selectedOrder]);

  // Function to handle marker click
  const handleMarkerClick = useCallback((clickedOrder: Order, marker: google.maps.Marker) => {
    console.log('🖱️ Marker clicked for order:', clickedOrder.id.slice(0, 8));
    
    // Close any existing info window
    if (currentInfoWindow) {
      console.log('🖱️ Closing existing info window');
      currentInfoWindow.close();
    }
    
    // Update selection - this will trigger color update
    console.log('🖱️ Updating selection to:', clickedOrder.id.slice(0, 8));
    onSelectOrder(clickedOrder);
    
    // Create and show info window
    const addressStr = addressLabel(clickedOrder);
    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div class="p-3 min-w-48">
          <div class="flex items-center justify-between mb-2">
            <h3 class="font-semibold text-gray-900">${clickedOrder.customerName}</h3>
            <span class="text-xs font-mono bg-gray-100 px-2 py-1 rounded">#${clickedOrder.id.slice(0, 8)}</span>
          </div>
          <div class="text-sm text-gray-600 space-y-1">
            <div class="flex items-center gap-1">
              <span>📍</span>
              <span>${addressStr}</span>
            </div>
            ${clickedOrder.phone ? `
              <div class="flex items-center gap-1">
                <span>📞</span>
                <a href="tel:${clickedOrder.phone}" class="text-blue-600 hover:underline">${clickedOrder.phone}</a>
              </div>
            ` : ''}
            <div class="flex items-center gap-1">
              <span>🚚</span>
              <span class="px-2 py-1 rounded text-xs ${clickedOrder.status === 'ready' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">${clickedOrder.status === 'ready' ? 'Klar' : 'I gang'}</span>
            </div>
          </div>
          <div class="mt-3 pt-2 border-t border-gray-200">
            <button 
              onclick="window.markOrderDelivered('${clickedOrder.id}')"
              class="w-full bg-green-600 hover:bg-green-700 text-white text-sm py-2 px-3 rounded font-medium transition-colors"
            >
              Markér leveret
            </button>
            <button 
              onclick="window.openInMaps('${addressStr.replace(/'/g, "\\'")}', '${clickedOrder.customerName.replace(/'/g, "\\'")}')"
              class="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 px-3 rounded font-medium transition-colors"
            >
              📍 Åbn i Maps
            </button>
          </div>
        </div>
      `
    });
    
    infoWindow.open(map, marker);
    setCurrentInfoWindow(infoWindow);
    console.log('🖱️ Info window opened for order:', clickedOrder.id.slice(0, 8));
  }, [map, currentInfoWindow, onSelectOrder]);

  // Global function for info window button
  useEffect(() => {
    (window as any).markOrderDelivered = (orderId: string) => {
      console.log('🖱️ Mark delivered clicked for order:', orderId.slice(0, 8));
      if (currentInfoWindow) {
        currentInfoWindow.close();
        setCurrentInfoWindow(null);
      }
      onStatusUpdate(orderId);
    };
    
    (window as any).openInMaps = (address: string, customerName: string) => {
      console.log('🗺️ Open in Maps clicked for address:', address);
      
      // Detect device type and open appropriate maps app
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);
      
      let mapsUrl = '';
      
      if (isIOS) {
        // iOS - try Apple Maps first, fallback to Google Maps
        mapsUrl = `maps://maps.apple.com/?q=${encodeURIComponent(address)}`;
        
        // Try to open Apple Maps
        const link = document.createElement('a');
        link.href = mapsUrl;
        link.click();
        
        // Fallback to Google Maps after a short delay if Apple Maps doesn't open
        setTimeout(() => {
          window.open(`https://maps.google.com/maps?q=${encodeURIComponent(address)}`, '_blank');
        }, 1000);
      } else if (isAndroid) {
        // Android - use Google Maps intent
        mapsUrl = `geo:0,0?q=${encodeURIComponent(address)}`;
        window.open(mapsUrl, '_blank');
      } else {
        // Desktop or other - open Google Maps in browser
        mapsUrl = `https://maps.google.com/maps?q=${encodeURIComponent(address)}`;
        window.open(mapsUrl, '_blank');
      }
    };
    
    return () => {
      delete (window as any).markOrderDelivered;
      delete (window as any).openInMaps;
    };
  }, [currentInfoWindow, onStatusUpdate]);

  // Initialize map only once
  useEffect(() => {
    let mounted = true;

    const initMap = async () => {
      if (!mapRef.current) return;

      try {
        setIsLoading(true);
        setLoadError(null);
        
        console.log('🗺️ Initializing Google Maps...');
        await GoogleMapsLoader.getGoogleMaps();
        
        if (!mounted || !mapRef.current) return;

        const newMap = new google.maps.Map(mapRef.current, {
          center: HELSINGOR_CENTER,
          zoom: 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
          zoomControlOptions: {
            position: google.maps.ControlPosition.RIGHT_CENTER
          },
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        });

        // Create restaurant marker
        const restaurantMarker = new google.maps.Marker({
          position: LA_CASTELLO_LOCATION,
          map: newMap,
          title: 'La Castello Restaurant',
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: '#059669',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
            scale: 12,
          } as google.maps.Symbol,
        });

        markersRef.current.restaurant = restaurantMarker;
        
        if (mounted) {
          setMap(newMap);
          setIsLoading(false);
          console.log('🗺️ Map initialized successfully');
        }
      } catch (error) {
        console.error('🗺️ Map initialization failed:', error);
        if (mounted) {
          setLoadError(`Fejl ved indlæsning af kort: ${error instanceof Error ? error.message : 'Ukendt fejl'}`);
          setIsLoading(false);
        }
      }
    };

    initMap();

    return () => {
      mounted = false;
    };
  }, []);

  // Handle orders changes - create/remove markers
  useEffect(() => {
    console.log('📋 Orders effect triggered:', {
      ordersCount: allOrders.length,
      currentMarkersCount: markersRef.current.customers.length,
      selectedOrderId: selectedOrder?.id?.slice(0, 8) || 'none'
    });

    if (!map) {
      console.log('📋 No map available, skipping marker update');
      return;
    }

    // Check if we need to recreate markers (only if order list actually changed)
    const currentOrderIds = markersRef.current.customers.map(md => md.order.id).sort();
    const newOrderIds = allOrders.map(o => o.id).sort();
    const ordersChanged = JSON.stringify(currentOrderIds) !== JSON.stringify(newOrderIds);
    
    if (!ordersChanged) {
      console.log('📋 Order list unchanged, skipping marker recreation');
      return;
    }
    
    console.log('📋 Order list changed, recreating markers');
    
    // Clear existing customer markers only when orders actually changed
    markersRef.current.customers.forEach((markerData, index) => {
      console.log(`📋 Removing customer marker ${index} for order ${markerData.order.id.slice(0, 8)}`);
      try {
        markerData.marker.setMap(null);
      } catch (error) {
        console.warn(`Failed to remove marker ${index}:`, error);
      }
    });
    markersRef.current.customers = [];

    // If no orders, just center map and return
    if (allOrders.length === 0) {
      console.log('📋 No orders - centering map');
      onSelectOrder(null);
      
      if (isLocationTracking && userLocation) {
        map.setCenter(userLocation);
        map.setZoom(15);
      } else {
        map.setCenter(LA_CASTELLO_LOCATION);
        map.setZoom(15);
      }
      return;
    }

    // Create new markers for current orders
    const createMarkers = async () => {
      console.log('📋 Creating markers for', allOrders.length, 'orders');
      const newMarkerData: MarkerData[] = [];
      
      for (const order of allOrders) {
        try {
          const addressStr = addressLabel(order);
          const location = await GoogleMapsLoader.geocodeAddress(addressStr);
          
          if (location) {
            const isSelected = selectedOrder?.id === order.id;
            
            console.log(`📍 Creating marker for order ${order.id.slice(0, 8)}: ${isSelected ? 'SELECTED (red)' : 'OTHER (orange)'}`);
            
            const marker = new google.maps.Marker({
              position: location,
              map: map,
              title: `${order.customerName} - ${order.id}`,
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: isSelected ? '#ef4444' : '#f97316',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: isSelected ? 4 : 2,
                scale: isSelected ? 10 : 7,
              } as google.maps.Symbol,
            });

            // Add click listener
            marker.addListener('click', () => {
              handleMarkerClick(order, marker);
            });
            
            newMarkerData.push({ marker, order });
            console.log(`📍 Successfully created ${isSelected ? 'SELECTED' : 'OTHER'} marker for order:`, order.id.slice(0, 8));
          }
        } catch (error) {
          console.error('📍 Failed to create marker for order:', order.id, error);
        }
      }
      
      // Update markers ref
      markersRef.current.customers = newMarkerData;
      console.log('📋 Set', newMarkerData.length, 'new customer markers');
      
      // Fit bounds to show all markers
      if (newMarkerData.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        
        // Include restaurant
        if (markersRef.current.restaurant) {
          bounds.extend(markersRef.current.restaurant.getPosition()!);
        }
        
        // Include user location if tracking
        if (markersRef.current.userLocation && isLocationTracking) {
          bounds.extend(markersRef.current.userLocation.getPosition()!);
        }
        
        // Include all customer markers
        newMarkerData.forEach(markerData => bounds.extend(markerData.marker.getPosition()!));
        
        map.fitBounds(bounds, { padding: 50 });
      }
    };

    createMarkers();
  }, [map, allOrders, handleMarkerClick, onSelectOrder, isLocationTracking, userLocation]);

  // Update marker colors when selection changes (separate effect)
  useEffect(() => {
    console.log('🎨 Selection changed, updating marker colors. Selected:', selectedOrder?.id?.slice(0, 8) || 'none');
    updateMarkerColors();
  }, [selectedOrder, updateMarkerColors]);

  // Handle user location marker
  useEffect(() => {
    if (!map) return;

    // Clear existing user location marker
    if (markersRef.current.userLocation) {
      markersRef.current.userLocation.setMap(null);
      markersRef.current.userLocation = null;
    }

    if (userLocation && isLocationTracking) {
      const marker = new google.maps.Marker({
        position: userLocation,
        map: map,
        title: 'Din position',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: '#3b82f6',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
          scale: 10,
        } as google.maps.Symbol,
      });

      markersRef.current.userLocation = marker;
    }
  }, [map, userLocation, isLocationTracking]);

  // Handle route drawing for selected order
  useEffect(() => {
    console.log('🛣️ Route effect triggered:', {
      hasMap: !!map,
      selectedOrderId: selectedOrder?.id?.slice(0, 8) || 'none',
      userLocation: !!userLocation,
      isLocationTracking
    });

    if (!map || !selectedOrder) {
      // Clear route when no order selected
      if (markersRef.current.route) {
        console.log('🛣️ Clearing route - no selected order');
        markersRef.current.route.setMap(null);
        markersRef.current.route = null;
      }
      return;
    }

    const drawRoute = async () => {
      try {
        console.log('🛣️ Drawing route for selected order:', selectedOrder.id.slice(0, 8));
        
        const addressStr = addressLabel(selectedOrder);
        const location = await GoogleMapsLoader.geocodeAddress(addressStr);
        
        if (location) {
          // Clear existing route
          if (markersRef.current.route) {
            console.log('🛣️ Clearing previous route before drawing new one');
            markersRef.current.route.setMap(null);
          }
          
          const directionsService = new google.maps.DirectionsService();
          const directionsRenderer = new google.maps.DirectionsRenderer({
            suppressMarkers: true,
            polylineOptions: {
              strokeColor: isLocationTracking && userLocation ? '#3b82f6' : '#10b981',
              strokeWeight: 4,
              strokeOpacity: 0.8,
            }
          });
          
          console.log('🛣️ Setting route renderer on map');
          directionsRenderer.setMap(map);
          markersRef.current.route = directionsRenderer;
          
          const origin = isLocationTracking && userLocation ? userLocation : LA_CASTELLO_LOCATION;
          console.log('🛣️ Calculating route from:', origin, 'to:', location.toJSON());
          
          directionsService.route({
            origin: origin,
            destination: location,
            travelMode: google.maps.TravelMode.DRIVING,
            unitSystem: google.maps.UnitSystem.METRIC,
            region: 'DK'
          }, (response, status) => {
            console.log('🛣️ Directions service response:', { status, hasResponse: !!response });
            if (status === 'OK' && response) {
              console.log('🛣️ Route drawn successfully');
              directionsRenderer.setDirections(response);
              
              const bounds = response.routes[0].bounds;
              map.fitBounds(bounds, { padding: 50 });
            } else {
              console.error('🛣️ Route drawing failed:', status);
              // Don't clear the renderer on failure, keep it for retry
            }
          });
        }
      } catch (error) {
        console.error('🛣️ Failed to draw route:', error);
      }
    };

    drawRoute();
  }, [map, selectedOrder?.id, userLocation, isLocationTracking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🧹 Component unmounting - cleaning up all markers');
      if (currentInfoWindow) {
        currentInfoWindow.close();
      }
      
      // Clear all customer markers
      markersRef.current.customers.forEach((markerData) => {
        try {
          markerData.marker.setMap(null);
        } catch (error) {
          console.warn('Error removing marker on unmount:', error);
        }
      });
      markersRef.current.customers = [];
      
      // Clear route
      if (markersRef.current.route) {
        markersRef.current.route.setMap(null);
        markersRef.current.route = null;
      }
    };
  }, [currentInfoWindow]);

  const handleRecenter = () => {
    if (!map) return;

    const allMarkers = [
      markersRef.current.restaurant,
      ...(isLocationTracking && markersRef.current.userLocation ? [markersRef.current.userLocation] : []),
      ...markersRef.current.customers.map(md => md.marker)
    ].filter(Boolean);
    
    if (allMarkers.length === 0) {
      map.setCenter(isLocationTracking && userLocation ? userLocation : LA_CASTELLO_LOCATION);
      map.setZoom(14);
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    allMarkers.forEach(marker => {
      if (marker) bounds.extend(marker.getPosition()!);
    });

    map.fitBounds(bounds, { padding: 50 });
  };

  const handleRetry = () => {
    console.log('🔄 Retrying map initialization...');
    setLoadError(null);
    setIsLoading(true);
    setMap(null);
    
    // Clear all markers
    markersRef.current.customers.forEach((markerData) => {
      try {
        markerData.marker.setMap(null);
      } catch (error) {
        console.warn('Error removing marker on retry:', error);
      }
    });
    markersRef.current.customers = [];
    
    if (markersRef.current.route) {
      markersRef.current.route.setMap(null);
      markersRef.current.route = null;
    }
    
    // Force a complete re-render
    if (mapRef.current) {
      mapRef.current.innerHTML = '';
    }
    
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  return (
    <div className="flex-1 relative h-full min-h-0 w-full">
      <div ref={mapRef} className="w-full h-full" />
      
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
          <div className="text-center">
            <div className="bg-white rounded-full p-4 shadow-lg mb-4 mx-auto w-fit">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-500"></div>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Indlæser kort</h3>
            <p className="text-gray-500 text-sm">Henter Google Maps...</p>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {loadError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
          <div className="text-center p-8">
            <div className="bg-red-100 rounded-full p-4 mx-auto w-fit mb-4">
              <MapPin className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Kort kunne ikke indlæses</h3>
            <p className="text-gray-600 text-sm mb-4">{loadError}</p>
            <div className="space-y-2">
              <Button onClick={handleRetry} className="gap-2 w-full">
                <RotateCcw className="w-4 h-4" />
                Prøv igen
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.location.reload()}
                className="gap-2 w-full"
              >
                <RotateCcw className="w-4 h-4" />
                Genindlæs siden
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Controls */}
      <div className="absolute top-2 right-2 md:top-4 md:right-4 space-y-1 md:space-y-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRecenter}
          className="bg-background/95 backdrop-blur-sm shadow-lg border-gray-200 text-xs px-2 py-1 h-7 md:h-8 md:text-sm md:px-3 md:py-2"
        >
          <RotateCcw className="w-3 h-3 md:w-4 md:h-4 md:mr-1" />
          <span className="hidden md:inline">Centrer</span>
        </Button>
        {selectedOrder?.phone && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`tel:${selectedOrder.phone}`, '_self')}
            className="bg-background/95 backdrop-blur-sm shadow-lg border-gray-200 text-green-600 hover:text-green-700 text-xs px-2 py-1 h-7 md:h-8 md:text-sm md:px-3 md:py-2"
          >
            <Phone className="w-3 h-3 md:w-4 md:h-4 md:mr-1" />
            <span className="hidden md:inline">Ring</span>
          </Button>
        )}
      </div>

      {/* Legend */}
      <div className="absolute bottom-2 left-2 md:bottom-4 md:left-4 bg-background/95 backdrop-blur-sm border rounded-lg p-1.5 md:p-3 space-y-1 shadow-lg">
        <div className="flex items-center gap-1.5 md:gap-2 text-xs">
          <div className="w-4 h-4 rounded-full bg-green-600 border-2 border-white shadow-sm"></div>
          <span className="font-medium">Restaurant</span>
        </div>
        {isLocationTracking && userLocation && (
          <div className="flex items-center gap-1.5 md:gap-2 text-xs">
            <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-sm"></div>
            <span className="font-medium">Du</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 md:gap-2 text-xs">
          <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow-sm"></div>
          <span className="font-medium">Valgt</span>
        </div>
        <div className="flex items-center gap-1.5 md:gap-2 text-xs">
          <div className="w-4 h-4 rounded-full bg-orange-500 border-2 border-white shadow-sm"></div>
          <span className="font-medium">Andre</span>
        </div>
        <div className="flex items-center gap-1.5 md:gap-2 text-xs">
          <div className={`w-4 h-1 rounded ${isLocationTracking && userLocation ? 'bg-blue-500' : 'bg-green-500'}`}></div>
          <span className="font-medium">Rute</span>
        </div>
      </div>

      {/* Order info overlay */}
      {selectedOrder && (
        <div className="absolute top-2 left-2 md:top-4 md:left-4 bg-background/95 backdrop-blur-sm border rounded-lg p-2 md:p-4 max-w-xs shadow-lg">
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-3 h-3 md:w-4 md:h-4 text-blue-500 mt-0.5" />
                <div>
                  <span className="font-semibold text-xs text-gray-900">{selectedOrder.customerName}</span>
                  <div className="text-xs text-gray-500">Ordre #{selectedOrder.id.slice(0, 8)}</div>
                  <div className="text-xs text-gray-600 mt-1">{addressLabel(selectedOrder)}</div>
                </div>
              </div>
              <Badge variant={selectedOrder.status === 'ready' ? 'default' : 'secondary'} className="text-xs scale-75 md:scale-100">
                {selectedOrder.status === 'in_progress' ? 'I gang' : 'Klar'}
              </Badge>
            </div>
            
            {(selectedOrderDistance?.eta || selectedOrderDistance?.distance) && (
              <div className="flex items-center gap-2 text-xs">
                {selectedOrderDistance.eta && (
                  <div className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    <Clock className="w-3 h-3" />
                    <span className="font-medium">{selectedOrderDistance.eta}</span>
                  </div>
                )}
                {selectedOrderDistance.distance && (
                  <div className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded">
                    <MapPin className="w-3 h-3" />
                    <span className="font-medium">{selectedOrderDistance.distance}</span>
                  </div>
                )}
              </div>
            )}
            
            {selectedOrder.phone && (
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Phone className="w-3 h-3" />
                <span>{selectedOrder.phone}</span>
              </div>
            )}
            
            {/* Action buttons - compact inline design */}
            <div className="pt-2 border-t border-gray-200">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => onStatusUpdate(selectedOrder.id)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-1 transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  <div className="w-3 h-3 rounded-full bg-white/20"></div>
                  <span className="hidden sm:inline">Leveret</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    const addressStr = addressLabel(selectedOrder);
                    (window as any).openInMaps?.(addressStr, selectedOrder.customerName);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white gap-1 transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  <MapPin className="w-3 h-3" />
                  <span className="hidden sm:inline">Åbn i Maps</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}