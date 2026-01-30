import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DriverLocation {
  lat: number;
  lng: number;
  heading?: number;
  updatedAt: string;
}

export function useDriverLocation(orderId: string | null, driverId: string | null) {
  const [location, setLocation] = useState<DriverLocation | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!driverId) {
      setLocation(null);
      setIsConnected(false);
      return;
    }

    const channel = supabase.channel(`driver:${driverId}`, {
      config: { broadcast: { ack: true } }
    });

    channel
      .on('broadcast', { event: 'location' }, (payload) => {
        console.log('Driver location received:', payload);
        if (payload.payload) {
          setLocation(payload.payload as DriverLocation);
        }
      })
      .subscribe((status) => {
        console.log(`Driver channel status: ${status}`);
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
      setLocation(null);
      setIsConnected(false);
    };
  }, [driverId]);

  return {
    location,
    isConnected
  };
}