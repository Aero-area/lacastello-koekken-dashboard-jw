import { Search, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useMemo, useRef } from "react";
import { useOrders } from "@/hooks/useOrders";
import { filterOrders } from "@/lib/search";
import { getLineSearchText } from '@/lib/orderLineUtils';
import type { Order } from "@/lib/types";

interface SearchSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderClick: (order: Order) => void;
}

export function SearchSheet({ isOpen, onClose, onOrderClick }: SearchSheetProps) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { orders: allOrders } = useOrders({ filter: 'all' }); // Get all orders

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(q), 200);
    return () => clearTimeout(timer);
  }, [q]);

  const results = useMemo(() => {
    return filterOrders(allOrders, debounced);
  }, [allOrders, debounced]);

  const handleResultClick = (order: Order) => {
    onOrderClick(order);
    onClose();
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && results.length === 1) {
        handleResultClick(results[0]);
      } else if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, results, onClose]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setQ("");
      setDebounced("");
    }
  }, [isOpen]);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="top" className="h-screen flex flex-col">
        <SheetHeader>
          <SheetTitle>Søg i ordrer</SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 flex flex-col flex-grow min-h-0">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                ref={inputRef}
                placeholder="Søg på kunde, tlf, adresse, vare, m.m."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-10 min-h-[44px]"
              />
            </div>
            {q && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQ('')}
                className="min-w-[44px] min-h-[44px]"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          
          <div className="mt-4 flex-grow overflow-y-auto">
            {!debounced.trim() ? (
              <div className="text-center text-ink-dim pt-8">
                Søg live i alle aktive ordrer.
              </div>
            ) : results.length === 0 ? (
              <div className="text-center text-ink-dim pt-8">
                Ingen resultater for "{debounced}"
              </div>
            ) : (
              <div className="space-y-2">
                {results.map((order: Order) => (
                  <div
                    key={order.id}
                    onClick={() => handleResultClick(order)}
                    className="p-3 bg-chip rounded-lg cursor-pointer hover:bg-line"
                  >
                    <div className="font-semibold flex justify-between">
                      <span>{order.customerName}</span>
                      <span className="text-xs font-mono bg-background px-1.5 py-0.5 rounded">{order.id.slice(0, 7)}</span>
                    </div>
                    <div className="text-sm text-ink-dim">
                      {getLineSearchText(order.lines?.[0] || {} as any)}
                      {order.lines && order.lines.length > 1 && ` og ${order.lines.length - 1} mere`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="mt-auto pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="w-full min-h-[44px]"
            >
              Luk søgning
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}