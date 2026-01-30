import { Settings, Search, History, Bell, CircleCheck as CheckCircle2, Truck, RefreshCw, ChefHat } from "lucide-react";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SearchSheet } from "./SearchSheet";
import { useRealtimeStatus } from "@/hooks/useRealtimeStatus";
import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Order } from "@/lib/types";

interface TopBarProps {
  onOrderClick: (order: Order) => void;
}

export function TopBar({ onOrderClick }: TopBarProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { online } = useRealtimeStatus();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      await queryClient.invalidateQueries({ queryKey: ["orders-history"] });
      
      toast({
        title: "Opdateret",
        description: "Ordrer er blevet opdateret"
      });
    } catch (error) {
      toast({
        title: "Fejl",
        description: "Kunne ikke opdatere ordrer",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <>
      <div className="bg-background border-b border-border px-2 sm:px-4 py-3 flex items-center justify-between min-h-[60px]">
        {/* Left: Logo and Label */}
        <div className="flex items-center gap-2 sm:gap-3">
          <img
            src="/lovable-uploads/48868637-58f2-416a-b145-77100d563c4b.png"
            alt="La Castello"
            className="w-6 h-6 sm:w-8 sm:h-8 object-contain"
          />
          <h1 className="text-base sm:text-lg font-semibold text-ink hidden xs:block">Køkken</h1>
        </div>

        {/* Center: Navigation */}
        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant={location.pathname === '/' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => navigate('/')}
            className="min-h-[40px] px-2 sm:px-4 sm:min-w-[80px]"
          >
            <CheckCircle2 className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Board</span>
          </Button>

          <Button
            variant={location.pathname === '/history' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => navigate('/history')}
            className="min-h-[40px] px-2 sm:px-4 sm:min-w-[80px]"
          >
            <History className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Historik</span>
          </Button>

          <Button
            variant={location.pathname === '/delivery' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => navigate('/delivery')}
            className="min-h-[40px] px-2 sm:px-4 sm:min-w-[80px]"
          >
            <Truck className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Levering</span>
          </Button>

          <Button
            variant={location.pathname === '/menu' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => navigate('/menu')}
            className="min-h-[40px] px-2 sm:px-4 sm:min-w-[80px]"
          >
            <ChefHat className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Menu</span>
          </Button>

          <Button
            variant={location.pathname === '/customers' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => navigate('/customers')}
            className="min-h-[40px] px-2 sm:px-4 sm:min-w-[80px]"
          >
            <Users className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Kunder</span>
          </Button>
        </div>

        {/* Right: Status and Actions */}
        <div className="flex items-center gap-1 sm:gap-3">
          {/* Status Indicator */}
          <div className="hidden sm:flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                online
                  ? 'bg-green-500 animate-pulse'
                  : 'bg-red-500'
              }`}
            />
            <span className="text-sm text-ink-dim">
              {online ? 'Online' : 'Offline'}
            </span>
          </div>

          {/* Mobile status indicator */}
          <div className="sm:hidden">
            <div
              className={`w-2 h-2 rounded-full ${
                online
                  ? 'bg-green-500 animate-pulse'
                  : 'bg-red-500'
              }`}
            />
          </div>

          <Separator orientation="vertical" className="h-6 hidden sm:block" />

          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="min-h-[40px] px-2 sm:px-3"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSearchOpen(true)}
            className="min-h-[40px] px-2 sm:px-3"
          >
            <Search className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/settings')}
            className="min-h-[40px] px-2 sm:px-3"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline ml-1 text-xs">Dev</span>
          </Button>
        </div>
      </div>

      <SearchSheet
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onOrderClick={onOrderClick}
      />
    </>
  );
}