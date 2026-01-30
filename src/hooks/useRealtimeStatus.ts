import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useRealtimeStatus() {
  const [isOnline, setIsOnline] = useState(false);
  const [lastChangeAt, setLastChangeAt] = useState<Date>(new Date());

  useEffect(() => {
    // Create dedicated channel for kitchen status
    const channel = supabase.channel('kitchen_status');

    // Listen for system connection events
    channel
      .on('system', 'connected', () => {
        setIsOnline(true);
        setLastChangeAt(new Date());
      })
      .on('system', 'disconnected', () => {
        setIsOnline(false);
        setLastChangeAt(new Date());
      })
      .subscribe((status) => {
        console.log('Realtime connection status:', status);
        
        // Handle different connection states
        if (status === 'CHANNEL_ERROR') {
          console.error('Realtime channel error in status hook');
          setIsOnline(false);
        } else {
          // Consider online when channel is subscribed
          const online = status === 'SUBSCRIBED';
          setIsOnline(online);
        }
        setLastChangeAt(new Date());
      });

    // Also monitor browser online/offline status
    const handleOnline = () => {
      setIsOnline(navigator.onLine);
      setLastChangeAt(new Date());
    };
    const handleOffline = () => {
      setIsOnline(false);
      setLastChangeAt(new Date());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    setIsOnline(navigator.onLine);

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (error) {
        console.warn('Error removing realtime status channel:', error);
      }
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    online: isOnline,
    lastChangeAt
  };
}