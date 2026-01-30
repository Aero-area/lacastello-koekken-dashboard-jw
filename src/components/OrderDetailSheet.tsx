"use client";

import { useState } from "react";
import { Phone, MapPin, Truck, Clock, Printer, TriangleAlert as AlertTriangle, Copy } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Order, OrderStatus } from "@/lib/types";
import { updatePrintedAt } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useCompleteOrder } from "@/hooks/useCompleteOrder";
import OrderLineItem from "./OrderLineItem";
import { addressLabel } from "@/lib/address";

interface OrderDetailSheetProps {
  order: Order;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange?: (orderId: string, newStatus: OrderStatus) => void;
  onPrint?: (order: Order) => Promise<void>;
}

const formatTime = (dateString: string) => {
  try {
    return new Date(dateString).toLocaleTimeString('da-DK', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'N/A';
  }
};

const getStatusButton = (status: OrderStatus) => {
  switch (status) {
    case 'new':
      return { text: 'Start ordre', nextStatus: 'in_progress' as OrderStatus };
    case 'in_progress':
      return { text: 'Markér færdig', nextStatus: 'ready' as OrderStatus };
    case 'ready':
      return { text: 'Afslut ordre', nextStatus: 'done' as OrderStatus };
    default:
      return null;
  }
};

export function OrderDetailSheet({ 
  order, 
  open, 
  onOpenChange, 
  onStatusChange, 
  onPrint 
}: OrderDetailSheetProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  const [optimisticPrintedAt, setOptimisticPrintedAt] = useState<string | null>(null);
  const { toast } = useToast();
  const completeOrder = useCompleteOrder();

  const statusButton = getStatusButton(order?.status || 'new');
  const displayPrintedAt = optimisticPrintedAt || order?.printedAt;
  
  // Defensive rendering for allergies
  const a = (order?.allergies ?? '').toString().trim().toLowerCase();
  const hasAllergy = a.length > 0 && a !== 'ingen';
  
  // Defensive rendering for notes
  const note = (order?.notes ?? 'Ingen note').toString();

  const handlePrint = async () => {
    if (isPrinting || !onPrint) return;
    
    setIsPrinting(true);
    try {
      await onPrint(order);
      
      // Optimistically update printedAt
      const now = new Date().toISOString();
      setOptimisticPrintedAt(now);
      
      // Try to update in database (best effort)
      try {
        await updatePrintedAt(order.id);
      } catch (dbError) {
        // Ignore database errors, keep optimistic state
        console.warn('Failed to update printed_at in database:', dbError);
      }
    } catch (error) {
      console.warn('Print error:', error);
      toast({
        title: "Fejl",
        description: "Kunne ikke udskrive ordre",
        variant: "destructive"
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const handleCopyNote = async () => {
    try {
      const noteText = note;
      const allergyText = hasAllergy ? (order?.allergies || '') : "Ingen";
      const fullText = `Note: ${noteText}\n\nAllergi: ${allergyText}`;
      
      await navigator.clipboard.writeText(fullText);
      toast({
        description: "Noter og allergi kopieret til udklipsholder"
      });
    } catch (error) {
      console.warn('Copy error:', error);
      toast({
        description: "Kunne ikke kopiere noter",
        variant: "destructive"
      });
    }
  };

  const handleStatusButtonClick = () => {
    try {
      // Prevent multiple clicks
      if (completeOrder.isPending) {
        return;
      }
      
      if (statusButton && onStatusChange && order?.id) {
        if (statusButton.nextStatus === 'done') {
          completeOrder.mutate({ order }, {
            onSuccess: () => {
              onOpenChange(false);
            }
          });
        } else {
          onStatusChange(order.id, statusButton.nextStatus);
        }
      }
    } catch (error) {
      console.warn('Status change error:', error);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-left flex items-center gap-2">
            {hasAllergy && (
              <AlertTriangle 
                className="w-5 h-5 text-red-600" 
                aria-label="Allergi advarsel"
              />
            )}
            {order?.type === 'delivery' ? (
              <Truck className="w-5 h-5" />
            ) : (
              <MapPin className="w-5 h-5" />
            )}
            Ordre #{order?.id?.slice(0, 8) || 'N/A'}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Order Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-ink-dim">
              <Clock className="w-4 h-4" />
              <span>
                {order?.desiredTime 
                  ? `Ønsket: ${formatTime(order.desiredTime)}`
                  : `Oprettet: ${formatTime(order?.createdAt || '')} (ASAP)`
                }
              </span>
            </div>

            <Badge variant={order?.type === 'delivery' ? 'default' : 'secondary'} className="w-fit">
              {order?.type === 'delivery' ? (
                <>
                  <Truck className="w-3 h-3 mr-1" />
                  UDBRINGNING
                </>
              ) : (
                <>
                  <MapPin className="w-3 h-3 mr-1" />
                  AFHENTNING
                </>
              )}
            </Badge>
          </div>

          <Separator />

          {/* Customer Info */}
          <div className="space-y-3">
            <h3 className="font-semibold text-ink">{order?.customerName || 'Ukendt kunde'}</h3>
            
            {order?.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-ink-dim" />
                <a 
                  href={`tel:${order.phone}`}
                  className="text-sm text-brand-red hover:underline"
                >
                  {order.phone}
                </a>
              </div>
            )}

            {order?.type === 'delivery' && (
              <>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-ink-dim mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-ink">{addressLabel(order)}</span>
                </div>
                <div className="flex items-center gap-2 pl-6">
                  {order.addressFloor && <Badge variant="outline">Etage: {String(order.addressFloor)}</Badge>}
                  {order.addressDoor && <Badge variant="outline">Dør: {String(order.addressDoor)}</Badge>}
                  {order.addressStaircase && <Badge variant="outline">Opgang: {String(order.addressStaircase)}</Badge>}
                </div>
              </>
            )}
          </div>

          <Separator />

          {/* Items */}
          <div className="space-y-3">
            <h3 className="font-semibold text-ink">Varer</h3>
            
            <div className="space-y-3">
              {(order?.lines ?? []).map((line, index) => (
                <OrderLineItem key={index} line={line} />
              ))}
            </div>
          </div>

          {/* Notes & Allergies */}
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-ink">Noter & Allergi</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyNote}
                className="h-6 px-2 text-xs"
              >
                <Copy className="w-3 h-3 mr-1" />
                Kopiér
              </Button>
            </div>
            
            {/* Notes */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-ink">Note:</h4>
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm text-ink whitespace-pre-wrap">
                  {note}
                </p>
              </div>
            </div>

            {/* Allergies */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-ink">Allergi:</h4>
              {hasAllergy ? (
                <div className="bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    <p className="text-sm text-destructive font-medium">
                      {order?.allergies || ''}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-sm text-ink-dim italic">Ingen</p>
                </div>
              )}
            </div>
          </div>

          {/* Total */}
          {order?.total && (
            <>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="font-semibold text-ink">Total</span>
                <span className="font-semibold text-ink">{order.total} kr.</span>
              </div>
            </>
          )}

          <Separator />

          {/* Actions */}
          <div className="space-y-3">
            {onPrint && (
              <Button
                variant="outline"
                className="w-full min-h-[44px]"
                onClick={handlePrint}
                disabled={isPrinting}
              >
                <Printer className="w-4 h-4 mr-2" />
                {isPrinting ? 'Udskriver...' : displayPrintedAt ? 'Re-print' : 'Udskriv'}
              </Button>
            )}

            {statusButton && onStatusChange && order?.id && (
              <Button
                className="w-full min-h-[44px]"
                onClick={handleStatusButtonClick}
                disabled={completeOrder.isPending}
              >
                {completeOrder.isPending ? 'Behandler...' : statusButton.text}
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
