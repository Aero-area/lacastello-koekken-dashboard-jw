import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { User, Phone, MapPin, Save, Search, CircleAlert as AlertCircle } from 'lucide-react';

interface CreateCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCustomerCreated?: () => void;
}

export function CreateCustomerDialog({ open, onOpenChange, onCustomerCreated }: CreateCustomerDialogProps) {
  const [formData, setFormData] = useState({
    customerName: '',
    phone: '',
    addressStreet: '',
    addressNumber: '',
    addressFloor: '',
    addressDoor: '',
    addressStaircase: '',
    addressPostcode: '3000',
    addressCity: 'Helsingør',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customerName.trim() || !formData.phone.trim()) {
      toast({
        title: "Fejl",
        description: "Navn og telefonnummer er påkrævet",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Create a dummy order with no items to register the customer
      const dummyOrder = {
        id: crypto.randomUUID(),
        status: 'done', // Mark as done so it doesn't appear on board
        type: 'delivery',
        customer_name: formData.customerName.trim(),
        phone: formData.phone.trim(),
        address_street: formData.addressStreet.trim() || null,
        address_number: formData.addressNumber.trim() || null,
        address_floor: formData.addressFloor.trim() || null,
        address_door: formData.addressDoor.trim() || null,
        address_staircase: formData.addressStaircase.trim() || null,
        address_postcode: formData.addressPostcode.trim() || null,
        address_city: formData.addressCity.trim() || null,
        lines: [], // Empty order lines
        notes: formData.notes.trim() || 'Kunde oprettet manuelt - ingen ordre',
        allergies: 'Ingen',
        total: 0,
        source: 'manual_customer_creation'
      };

      const { error } = await supabase
        .from('orders')
        .insert(dummyOrder);

      if (error) {
        throw error;
      }

      toast({
        title: "Kunde oprettet",
        description: `${formData.customerName} er blevet tilføjet som kunde`
      });

      // Reset form
      setFormData({
        customerName: '',
        phone: '',
        addressStreet: '',
        addressNumber: '',
        addressFloor: '',
        addressDoor: '',
        addressStaircase: '',
        addressPostcode: '3000',
        addressCity: 'Helsingør',
        notes: ''
      });

      onOpenChange(false);
      onCustomerCreated?.();
    } catch (error) {
      console.error('Error creating customer:', error);
      toast({
        title: "Fejl",
        description: "Kunne ikke oprette kunde",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Opret ny kunde
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer Info */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="customerName">Kundens navn *</Label>
              <Input
                id="customerName"
                value={formData.customerName}
                onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                placeholder="Anna Nielsen"
                className="min-h-[44px]"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="phone">Telefonnummer *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+45 20 12 34 56"
                className="min-h-[44px]"
                required
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4" />
              <Label className="text-sm font-medium">Adresse (valgfri)</Label>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Label htmlFor="addressStreet" className="text-xs">Gade</Label>
                <Input
                  id="addressStreet"
                  value={formData.addressStreet}
                  onChange={(e) => setFormData(prev => ({ ...prev, addressStreet: e.target.value }))}
                  placeholder="Stengade"
                  className="min-h-[44px]"
                />
              </div>
              <div>
                <Label htmlFor="addressNumber" className="text-xs">Nr.</Label>
                <Input
                  id="addressNumber"
                  value={formData.addressNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, addressNumber: e.target.value }))}
                  placeholder="15"
                  className="min-h-[44px]"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label htmlFor="addressFloor" className="text-xs">Etage</Label>
                <Input
                  id="addressFloor"
                  value={formData.addressFloor}
                  onChange={(e) => setFormData(prev => ({ ...prev, addressFloor: e.target.value }))}
                  placeholder="2"
                  className="min-h-[44px]"
                />
              </div>
              <div>
                <Label htmlFor="addressDoor" className="text-xs">Dør</Label>
                <Input
                  id="addressDoor"
                  value={formData.addressDoor}
                  onChange={(e) => setFormData(prev => ({ ...prev, addressDoor: e.target.value }))}
                  placeholder="th"
                  className="min-h-[44px]"
                />
              </div>
              <div>
                <Label htmlFor="addressStaircase" className="text-xs">Opg.</Label>
                <Input
                  id="addressStaircase"
                  value={formData.addressStaircase}
                  onChange={(e) => setFormData(prev => ({ ...prev, addressStaircase: e.target.value }))}
                  placeholder="A"
                  className="min-h-[44px]"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="addressPostcode" className="text-xs">Postnr.</Label>
                <Input
                  id="addressPostcode"
                  value={formData.addressPostcode}
                  onChange={(e) => setFormData(prev => ({ ...prev, addressPostcode: e.target.value }))}
                  placeholder="3000"
                  className="min-h-[44px]"
                />
              </div>
              <div>
                <Label htmlFor="addressCity" className="text-xs">By</Label>
                <Input
                  id="addressCity"
                  value={formData.addressCity}
                  onChange={(e) => setFormData(prev => ({ ...prev, addressCity: e.target.value }))}
                  placeholder="Helsingør"
                  className="min-h-[44px]"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Bemærkninger</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Specielle instruktioner, allergier, etc."
              rows={2}
              className="min-h-[80px] resize-none"
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="min-h-[44px] order-2 sm:order-1"
            >
              Annuller
            </Button>
            <Button 
              type="submit"
              disabled={isSubmitting}
              className="min-h-[44px] order-1 sm:order-2"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Opretter...' : 'Opret kunde'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}