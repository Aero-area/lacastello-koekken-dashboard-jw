import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Package, Phone, MapPin, Save, Plus, Minus, Search, User, CircleAlert as AlertCircle } from 'lucide-react';
import { searchHelsingorStreets, searchHelsingorAddresses, validateHelsingorAddress, isHelsingorPostalCode, DawaStreet, DawaAddress } from '@/lib/dawa';
import { useDebounce } from '@/hooks/useDebounce';

interface MenuItem {
  id: string;
  navn: string | null;
  pris: number | null;
  hovedkategori: string | null;
  is_available: boolean;
}

interface OrderLine {
  menu_no: string;
  name: string;
  qty: number;
  price: number;
}

interface CreateOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderCreated?: () => void;
}

export function CreateOrderDialog({ open, onOpenChange, onOrderCreated }: CreateOrderDialogProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [customers, setCustomers] = useState<Array<{name: string, phone: string, address?: string}>>([]);
  const [formData, setFormData] = useState({
    customerName: '',
    phone: '',
    type: 'pickup' as 'pickup' | 'delivery',
    addressStreet: '',
    addressNumber: '',
    addressFloor: '',
    addressDoor: '',
    addressStaircase: '',
    addressPostcode: '3000',
    addressCity: 'Helsingør',
    notes: '',
    allergies: 'Ingen'
  });
  const [orderLines, setOrderLines] = useState<OrderLine[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [menuSearch, setMenuSearch] = useState('');
  const [streetSuggestions, setStreetSuggestions] = useState<DawaStreet[]>([]);
  const [addressSuggestions, setAddressSuggestions] = useState<DawaAddress[]>([]);
  const [showStreetSuggestions, setShowStreetSuggestions] = useState(false);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [isValidatingAddress, setIsValidatingAddress] = useState(false);
  const [addressValidationError, setAddressValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const debouncedStreet = useDebounce(formData.addressStreet, 300);
  const debouncedNumber = useDebounce(formData.addressNumber, 300);

  // Fetch menu items and customers when dialog opens
  useEffect(() => {
    if (open) {
      fetchMenuItems();
      fetchCustomers();
    }
  }, [open]);

  // Search for street suggestions
  useEffect(() => {
    if (debouncedStreet.length >= 2) {
      searchHelsingorStreets(debouncedStreet).then(streets => {
        setStreetSuggestions(streets);
        setShowStreetSuggestions(streets.length > 0);
      });
    } else {
      setStreetSuggestions([]);
      setShowStreetSuggestions(false);
    }
  }, [debouncedStreet]);

  // Search for address suggestions when both street and number are provided
  useEffect(() => {
    if (debouncedStreet.length >= 2 && debouncedNumber.length >= 1) {
      searchHelsingorAddresses(debouncedStreet, debouncedNumber).then(addresses => {
        setAddressSuggestions(addresses);
        setShowAddressSuggestions(addresses.length > 0);
      });
    } else {
      setAddressSuggestions([]);
      setShowAddressSuggestions(false);
    }
  }, [debouncedStreet, debouncedNumber]);

  // Validate address when postal code changes
  useEffect(() => {
    if (formData.addressPostcode && !isHelsingorPostalCode(formData.addressPostcode)) {
      setAddressValidationError('Kun Helsingør postnumre er tilladt (3000-3080)');
    } else {
      setAddressValidationError(null);
    }
  }, [formData.addressPostcode]);

  const fetchMenuItems = async () => {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('id, navn, pris, hovedkategori, is_available')
        .eq('is_available', true)
        .order('hovedkategori')
        .order('id');

      if (error) throw error;
      setMenuItems(data || []);
    } catch (error) {
      console.error('Error fetching menu items:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      // Get unique customers from recent orders
      const { data, error } = await supabase
        .from('orders')
        .select('customer_name, phone, address_street, address_number, address_postcode, address_city')
        .not('customer_name', 'is', null)
        .not('phone', 'is', null)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Group by customer name + phone to get unique customers
      const uniqueCustomers = new Map();
      (data || []).forEach(order => {
        const key = `${order.customer_name}-${order.phone}`;
        if (!uniqueCustomers.has(key) && order.customer_name && order.phone) {
          const address = [
            order.address_street,
            order.address_number,
            order.address_postcode,
            order.address_city
          ].filter(Boolean).join(' ');
          
          uniqueCustomers.set(key, {
            name: order.customer_name,
            phone: order.phone,
            address: address || undefined
          });
        }
      });

      setCustomers(Array.from(uniqueCustomers.values()));
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const handleCustomerSelect = (customerKey: string) => {
    const customer = customers.find(c => `${c.name}-${c.phone}` === customerKey);
    if (customer) {
      setFormData(prev => ({
        ...prev,
        customerName: customer.name,
        phone: customer.phone,
        // Parse address if available
        ...(customer.address ? {
          addressStreet: customer.address.split(' ')[0] || '',
          addressNumber: customer.address.split(' ')[1] || '',
        } : {})
      }));
    }
    setSelectedCustomer(customerKey);
  };

  const addMenuItem = (item: MenuItem) => {
    const existingIndex = orderLines.findIndex(line => line.menu_no === item.id);
    
    if (existingIndex >= 0) {
      // Increase quantity
      setOrderLines(prev => prev.map((line, index) => 
        index === existingIndex 
          ? { ...line, qty: line.qty + 1 }
          : line
      ));
    } else {
      // Add new line
      setOrderLines(prev => [...prev, {
        menu_no: item.id,
        name: item.navn || 'Unavngivet vare',
        qty: 1,
        price: item.pris || 0
      }]);
    }
  };

  const updateLineQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      setOrderLines(prev => prev.filter((_, i) => i !== index));
    } else {
      setOrderLines(prev => prev.map((line, i) => 
        i === index ? { ...line, qty: newQty } : line
      ));
    }
  };

  const handleStreetSelect = (street: DawaStreet) => {
    setFormData(prev => ({
      ...prev,
      addressStreet: street.vejnavn,
      addressPostcode: street.postnr,
      addressCity: street.postnrnavn
    }));
    setShowStreetSuggestions(false);
  };

  const handleAddressSelect = (address: DawaAddress) => {
    setFormData(prev => ({
      ...prev,
      addressStreet: address.adresse.vejnavn,
      addressNumber: address.adresse.husnr,
      addressFloor: address.adresse.etage || '',
      addressDoor: address.adresse.dør || '',
      addressPostcode: address.adresse.postnr,
      addressCity: address.adresse.postnrnavn
    }));
    setShowAddressSuggestions(false);
    setShowStreetSuggestions(false);
  };

  const validateAddressBeforeSubmit = async (): Promise<boolean> => {
    if (!formData.addressStreet || !formData.addressNumber || !formData.addressPostcode) {
      return true; // Allow empty addresses for pickup orders
    }
    
    setIsValidatingAddress(true);
    try {
      const isValid = await validateHelsingorAddress(
        formData.addressStreet,
        formData.addressNumber,
        formData.addressPostcode
      );
      
      if (!isValid) {
        setAddressValidationError('Adressen findes ikke i Helsingør. Kontroller gade, nummer og postnummer.');
        return false;
      }
      
      setAddressValidationError(null);
      return true;
    } catch (error) {
      console.error('Address validation error:', error);
      // Allow submission if validation fails due to API issues
      return true;
    } finally {
      setIsValidatingAddress(false);
    }
  };

  const calculateTotal = () => {
    return orderLines.reduce((sum, line) => sum + (line.price * line.qty), 0);
  };

  const filteredMenuItems = menuItems.filter(item => 
    !menuSearch.trim() || 
    item.navn?.toLowerCase().includes(menuSearch.toLowerCase()) ||
    item.id.toLowerCase().includes(menuSearch.toLowerCase())
  );

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

    if (orderLines.length === 0) {
      toast({
        title: "Fejl", 
        description: "Tilføj mindst én vare til ordren",
        variant: "destructive"
      });
      return;
    }

    // Validate address if it's a delivery order
    if (formData.type === 'delivery' && (formData.addressStreet || formData.addressNumber)) {
      const isAddressValid = await validateAddressBeforeSubmit();
      if (!isAddressValid) {
        return;
      }
    }

    setIsSubmitting(true);
    
    try {
      const newOrder = {
        id: crypto.randomUUID(),
        status: 'new',
        type: formData.type,
        customer_name: formData.customerName.trim(),
        phone: formData.phone.trim(),
        address_street: formData.type === 'delivery' ? formData.addressStreet.trim() || null : null,
        address_number: formData.type === 'delivery' ? formData.addressNumber.trim() || null : null,
        address_floor: formData.type === 'delivery' ? formData.addressFloor.trim() || null : null,
        address_door: formData.type === 'delivery' ? formData.addressDoor.trim() || null : null,
        address_staircase: formData.type === 'delivery' ? formData.addressStaircase.trim() || null : null,
        address_postcode: formData.type === 'delivery' ? formData.addressPostcode.trim() || null : null,
        address_city: formData.type === 'delivery' ? formData.addressCity.trim() || null : null,
        lines: orderLines,
        notes: formData.notes.trim() || null,
        allergies: formData.allergies.trim() || 'Ingen',
        total: calculateTotal(),
        source: 'manual_creation'
      };

      const { error } = await supabase
        .from('orders')
        .insert(newOrder);

      if (error) {
        throw error;
      }

      toast({
        title: "Ordre oprettet",
        description: `Ordre for ${formData.customerName} er blevet oprettet`
      });

      // Reset form
      setFormData({
        customerName: '',
        phone: '',
        type: 'pickup',
        addressStreet: '',
        addressNumber: '',
        addressFloor: '',
        addressDoor: '',
        addressStaircase: '',
        addressPostcode: '3000',
        addressCity: 'Helsingør',
        notes: '',
        allergies: 'Ingen'
      });
      setOrderLines([]);
      setSelectedCustomer('');

      onOpenChange(false);
      onOrderCreated?.();
    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        title: "Fejl",
        description: "Kunne ikke oprette ordre",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Opret ny ordre
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Kunde</Label>
            <Select value={selectedCustomer} onValueChange={handleCustomerSelect}>
              <SelectTrigger className="min-h-[44px]">
                <SelectValue placeholder="Vælg eksisterende kunde eller indtast ny" />
              </SelectTrigger>
              <SelectContent>
                {customers.map(customer => (
                  <SelectItem key={`${customer.name}-${customer.phone}`} value={`${customer.name}-${customer.phone}`}>
                    <div className="flex flex-col">
                      <span className="font-medium">{customer.name}</span>
                      <span className="text-xs text-gray-500">{customer.phone}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          </div>

          {/* Order Type */}
          <div>
            <Label className="text-sm font-medium">Ordre type</Label>
            <Select value={formData.type} onValueChange={(value: 'pickup' | 'delivery') => setFormData(prev => ({ ...prev, type: value }))}>
              <SelectTrigger className="min-h-[44px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pickup">Afhentning</SelectItem>
                <SelectItem value="delivery">Udbringning</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Address (only for delivery) */}
          {formData.type === 'delivery' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <Label className="text-sm font-medium">Leveringsadresse (kun Helsingør)</Label>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <Label htmlFor="addressStreet" className="text-xs">Gade *</Label>
                  <div className="relative">
                    <Input
                      id="addressStreet"
                      value={formData.addressStreet}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, addressStreet: e.target.value }));
                        setShowStreetSuggestions(true);
                      }}
                      placeholder="Søg gade i Helsingør..."
                      className="min-h-[44px]"
                      autoComplete="off"
                    />
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    
                    {/* Street suggestions dropdown */}
                    {showStreetSuggestions && streetSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
                        {streetSuggestions.map((street, index) => (
                          <div
                            key={index}
                            className="p-2 hover:bg-gray-50 cursor-pointer text-sm border-b border-gray-100 last:border-b-0"
                            onClick={() => handleStreetSelect(street)}
                          >
                            <div className="font-medium">{street.vejnavn}</div>
                            <div className="text-xs text-gray-500">{street.postnr} {street.postnrnavn}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="addressNumber" className="text-xs">Nr. *</Label>
                  <div className="relative">
                    <Input
                      id="addressNumber"
                      value={formData.addressNumber}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, addressNumber: e.target.value }));
                        setShowAddressSuggestions(true);
                      }}
                      placeholder="15"
                      className="min-h-[44px]"
                      autoComplete="off"
                    />
                    
                    {/* Address suggestions dropdown */}
                    {showAddressSuggestions && addressSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
                        {addressSuggestions.map((address, index) => (
                          <div
                            key={index}
                            className="p-2 hover:bg-gray-50 cursor-pointer text-sm border-b border-gray-100 last:border-b-0"
                            onClick={() => handleAddressSelect(address)}
                          >
                            <div className="font-medium">{address.tekst}</div>
                            <div className="text-xs text-gray-500">
                              {address.adresse.postnr} {address.adresse.postnrnavn}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData(prev => ({ ...prev, addressPostcode: value }));
                    }}
                    placeholder="3000"
                    className={`min-h-[44px] ${addressValidationError ? 'border-red-500' : ''}`}
                  />
                  {addressValidationError && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
                      <AlertCircle className="w-3 h-3" />
                      <span>Kun Helsingør postnumre</span>
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="addressCity" className="text-xs">By</Label>
                  <Input
                    id="addressCity"
                    value={formData.addressCity}
                    onChange={(e) => setFormData(prev => ({ ...prev, addressCity: e.target.value }))}
                    placeholder="Helsingør"
                    className="min-h-[44px]"
                    readOnly
                  />
                </div>
              </div>
              
              {/* Address validation status */}
              {addressValidationError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span className="text-sm text-red-700">{addressValidationError}</span>
                  </div>
                </div>
              )}
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-xs text-blue-700">
                  <strong>Kun Helsingør adresser tilladt</strong><br />
                  Postnumre: 3000, 3001, 3002, 3070, 3080
                </div>
              </div>
            </div>
          )}

          {/* Menu Items Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Vælg varer</Label>
            
            {/* Menu search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Søg i menu..."
                value={menuSearch}
                onChange={(e) => setMenuSearch(e.target.value)}
                className="pl-10 min-h-[44px]"
              />
            </div>
            
            {/* Menu items grid */}
            <div className="max-h-48 overflow-y-auto border rounded-lg p-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredMenuItems.map(item => (
                  <Card 
                    key={item.id}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => addMenuItem(item)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">#{item.id}</span>
                            {item.hovedkategori && (
                              <Badge variant="outline" className="text-xs scale-90">
                                {item.hovedkategori}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm font-medium truncate">{item.navn}</p>
                          <p className="text-xs text-gray-500">{item.pris} kr.</p>
                        </div>
                        <Plus className="w-4 h-4 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          {/* Order Lines */}
          {orderLines.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Ordre indhold</Label>
              <div className="space-y-2">
                {orderLines.map((line, index) => (
                  <Card key={index}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{line.name}</p>
                          <p className="text-xs text-gray-500">#{line.menu_no} • {line.price} kr./stk</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => updateLineQty(index, line.qty - 1)}
                            className="h-8 w-8 p-0"
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="text-sm font-medium w-8 text-center">{line.qty}</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => updateLineQty(index, line.qty + 1)}
                            className="h-8 w-8 p-0"
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {/* Total */}
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="font-semibold">Total:</span>
                <span className="font-semibold text-lg">{calculateTotal()} kr.</span>
              </div>
            </div>
          )}

          {/* Notes and Allergies */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="notes">Bemærkninger</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Specielle ønsker..."
                rows={2}
                className="min-h-[80px] resize-none"
              />
            </div>
            <div>
              <Label htmlFor="allergies">Allergier</Label>
              <Textarea
                id="allergies"
                value={formData.allergies}
                onChange={(e) => setFormData(prev => ({ ...prev, allergies: e.target.value }))}
                placeholder="Ingen"
                rows={2}
                className="min-h-[80px] resize-none"
              />
            </div>
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
              disabled={isSubmitting || orderLines.length === 0 || isValidatingAddress || !!addressValidationError}
              className="min-h-[44px] order-1 sm:order-2"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Opretter...' : isValidatingAddress ? 'Validerer...' : 'Opret ordre'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}