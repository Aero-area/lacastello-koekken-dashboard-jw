import { useState, useEffect } from "react";
import { Phone, MapPin, Truck, Clock, Printer, AlertCircle, AlertTriangle, Copy } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Order, OrderStatus } from "@/lib/types";
import { updatePrintedAt, fetchOrderDetails, supabase } from "@/lib/supabase";
import { renderOrderLine } from "@/lib/orderLineUtils";
import { useToast } from "@/hooks/use-toast";

interface OrderDrawerProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void;
  onPrint: (order: Order) => Promise<void>;
}

const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString('da-DK', {
    hour: '2-digit',
    minute: '2-digit'
  });
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

export function OrderDrawer({ order, isOpen, onClose, onStatusChange, onPrint }: OrderDrawerProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  const [optimisticPrintedAt, setOptimisticPrintedAt] = useState<string | null>(null);
  const [fullOrderDetails, setFullOrderDetails] = useState<{notes: string | null, allergies: string | null} | null>(null);
  const { toast } = useToast();
  
  console.log('OrderDrawer render:', { orderId: order?.id, isOpen, hasOrder: !!order });
  
  if (!order) return null;

  // Fetch full order details when drawer opens
  useEffect(() => {
    if (order?.id && isOpen) {
      const fetchDetails = async () => {
        try {
          const { data, error } = await supabase
            .from('orders')
            .select('notes,allergies')
            .eq('id', order.id)
            .single();
          
          if (!error && data) {
            setFullOrderDetails(data);
          }
        } catch (e) {
          console.warn('drawer fetch', e);
          // Keep drawer open with preview data; show toast
          toast({
            description: "Kunne ikke hente note/allergi",
            variant: "destructive"
          });
        }
      };
      
      fetchDetails();
    }
  }, [order?.id, isOpen, toast]);

  // Set up realtime subscription for notes/allergies updates
  useEffect(() => {
    if (!order?.id || !isOpen) return;

    const channel = supabase
      .channel(`order-details-${order.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${order.id}`
        },
        (payload) => {
          console.log('Order details updated:', payload.new);
          if (payload?.new) {
            setFullOrderDetails({
              notes: payload.new.notes || null,
              allergies: payload.new.allergies || null
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order?.id, isOpen]);

  const statusButton = getStatusButton(order.status);
  const displayPrintedAt = optimisticPrintedAt || order.printedAt;
  
  // Defensive rendering for allergies
  const a = (order?.allergies ?? '').trim().toLowerCase();
  const hasOrderAllergy = a.length > 0 && a !== 'ingen';

  // Safe address parsing
  const formatAddress = (address?: string) => {
    if (!address) return '';
    try {
      const parsed = JSON.parse(address);
      if (parsed?.street && parsed?.city) {
        return `${parsed.street}, ${parsed.city}`;
      }
    } catch {
      // Use as-is on parse error
    }
    return address;
  };

  const handlePrint = async () => {
    if (isPrinting) return;
    
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
    const currentNotes = fullOrderDetails?.notes || order?.notes;
    const currentAllergies = fullOrderDetails?.allergies || order?.allergies;
    
    const noteText = currentNotes || "Ingen note";
    const allergyText = (currentAllergies && currentAllergies.trim() !== '' && currentAllergies.toLowerCase() !== 'ingen') 
      ? currentAllergies : "Ingen";
    
    const fullText = `Note: ${noteText}\n\nAllergi: ${allergyText}`;
    
    try {
      await navigator.clipboard.writeText(fullText);
      toast({
        description: "Noter og allergi kopieret til udklipsholder"
      });
    } catch (error) {
      toast({
        description: "Kunne ikke kopiere noter",
        variant: "destructive"
      });
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-left flex items-center gap-2">
            {hasOrderAllergy && (
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

            {order?.type === 'delivery' && order?.address && (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-ink-dim mt-0.5" />
                <span className="text-sm text-ink-dim">{formatAddress(order.address)}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Items */}
          <div className="space-y-3">
            <h3 className="font-semibold text-ink">Varer</h3>
            
            <div className="space-y-2">
              {(order?.lines ?? []).map((line, index) => {
                const rendered = renderOrderLine(line, index);
                return (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between items-start">
                      <span className="text-sm">
                        {rendered.display}
                      </span>
                    </div>
                    {rendered.modifiers && rendered.modifiers.length > 0 && (
                      <div className="text-xs text-muted-foreground ml-4">
                        {rendered.modifiers.join(', ')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes & Allergies */}
          <>
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
                    {fullOrderDetails?.notes || order?.notes || "Ingen note"}
                  </p>
                </div>
              </div>

              {/* Allergies */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-ink">Allergi:</h4>
                {(() => {
                  const allergyText = (fullOrderDetails?.allergies || order?.allergies || '').trim().toLowerCase();
                  const hasAllergyData = allergyText.length > 0 && allergyText !== 'ingen';
                  
                  return hasAllergyData ? (
                    <div className="bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-destructive" />
                        <p className="text-sm text-destructive font-medium">
                          {fullOrderDetails?.allergies || order?.allergies}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-sm text-ink-dim italic">Ingen</p>
                    </div>
                  );
                })()}
              </div>
            </div>
          </>

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
            <Button
              variant="outline"
              className="w-full min-h-[44px]"
              onClick={handlePrint}
              disabled={isPrinting}
            >
              <Printer className="w-4 h-4 mr-2" />
              {isPrinting ? 'Udskriver...' : displayPrintedAt ? 'Re-print' : 'Udskriv'}
            </Button>

            {statusButton && order?.id && (
              <Button
                className="w-full min-h-[44px]"
                onClick={() => {
                  onStatusChange(order.id, statusButton.nextStatus);
                  onClose();
                }}
              >
                {statusButton.text}
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}