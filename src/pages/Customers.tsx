import { useState, useEffect, useMemo } from "react";
import { Search, Phone, MapPin, Clock, Package, User, RefreshCw, UserPlus, Trash2 } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Order } from "@/lib/types";
import { transformOrder } from "@/lib/transform";
import { addressLabel } from "@/lib/address";
import { OrderDetailSheet } from "@/components/OrderDetailSheet";
import { CreateCustomerDialog } from "@/components/CreateCustomerDialog";
import { useQueryClient } from "@tanstack/react-query";

interface Customer {
  customerName: string;
  phone: string | null;
  address: string | null;
  orderCount: number;
  lastOrderDate: string;
  totalSpent: number;
  orders: Order[];
}

const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString('da-DK', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('da-DK', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isOrderSheetOpen, setIsOrderSheetOpen] = useState(false);
  const [isCreateCustomerOpen, setIsCreateCustomerOpen] = useState(false);
  const [deletingCustomerId, setDeletingCustomerId] = useState<string | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch customers and their order history
  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('orders')
        .select('id, customer_name, phone, address, address_street, address_number, address_postcode, address_city, type, created_at, total, lines, status')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === 'PGRST301' || error.message?.includes('JWT') || error.message?.includes('authentication')) {
          throw new Error('Du skal være logget ind for at se kunder');
        }
        throw error;
      }

      // Group orders by customer
      const customerMap = new Map<string, Customer>();
      
      (data || []).forEach(dbOrder => {
        // Don't transform the order, work with raw data to avoid async issues
        const customerName = dbOrder.customer_name || 'Ukendt kunde';
        const phone = dbOrder.phone || null;
        const key = `${customerName}-${phone || 'no-phone'}`;
        
        if (!customerMap.has(key)) {
          // Create address from individual fields
          let address = null;
          if (dbOrder.type === 'delivery') {
            const addressParts = [
              dbOrder.address_street,
              dbOrder.address_number,
              dbOrder.address_postcode,
              dbOrder.address_city
            ].filter(Boolean);
            address = addressParts.length > 0 ? addressParts.join(' ') : dbOrder.address;
          }
          
          customerMap.set(key, {
            customerName: customerName,
            phone: phone,
            address: address,
            orderCount: 0,
            lastOrderDate: dbOrder.created_at,
            totalSpent: 0,
            orders: []
          });
        }
        
        const customer = customerMap.get(key)!;
        
        // Create a simplified order object for display
        const simpleOrder = {
          id: dbOrder.id,
          status: dbOrder.status,
          createdAt: dbOrder.created_at,
          desiredTime: dbOrder.desired_time,
          type: dbOrder.type,
          customerName: customerName,
          phone: phone,
          address: dbOrder.address,
          addressStreet: dbOrder.address_street,
          addressNumber: dbOrder.address_number,
          addressFloor: dbOrder.address_floor,
          addressDoor: dbOrder.address_door,
          addressStaircase: dbOrder.address_staircase,
          addressPostcode: dbOrder.address_postcode,
          addressCity: dbOrder.address_city,
          lines: Array.isArray(dbOrder.lines) ? dbOrder.lines : [],
          notes: dbOrder.notes,
          allergies: dbOrder.allergies,
          total: dbOrder.total ? Number(dbOrder.total) : null,
          printedAt: dbOrder.printed_at,
          source: dbOrder.source,
          driverId: dbOrder.driver_id,
          revision: dbOrder.revision || 0,
          hasAllergy: Boolean(dbOrder.allergies && dbOrder.allergies.toLowerCase() !== "ingen")
        } as Order;
        
        customer.orders.push(simpleOrder);
        customer.orderCount++;
        customer.totalSpent += Number(dbOrder.total) || 0;
        
        // Update last order date if this order is newer
        if (new Date(dbOrder.created_at) > new Date(customer.lastOrderDate)) {
          customer.lastOrderDate = dbOrder.created_at;
        }
        
        // Update address if this is a delivery order and we don't have one yet
        if (dbOrder.type === 'delivery' && !customer.address) {
          const addressParts = [
            dbOrder.address_street,
            dbOrder.address_number,
            dbOrder.address_postcode,
            dbOrder.address_city
          ].filter(Boolean);
          customer.address = addressParts.length > 0 ? addressParts.join(' ') : dbOrder.address;
        }
      });

      // Convert to array and sort by last order date
      const customersArray = Array.from(customerMap.values())
        .sort((a, b) => new Date(b.lastOrderDate).getTime() - new Date(a.lastOrderDate).getTime());

      setCustomers(customersArray);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        title: "Fejl",
        description: error instanceof Error ? error.message : "Kunne ikke hente kunder",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
    setIsOrderSheetOpen(true);
  };

  const handleDeleteCustomer = async (customer: Customer) => {
    const customerId = `${customer.customerName}-${customer.phone}`;
    setDeletingCustomerId(customerId);
    
    try {
      // Delete all orders for this customer
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('customer_name', customer.customerName)
        .eq('phone', customer.phone || '');

      if (error) throw error;

      // Update local state
      setCustomers(prev => prev.filter(c => 
        !(c.customerName === customer.customerName && c.phone === customer.phone)
      ));
      
      // Clear selection if this customer was selected
      if (selectedCustomer === customer) {
        setSelectedCustomer(null);
      }

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders-history'] });

      toast({
        title: "Kunde slettet",
        description: `${customer.customerName} og alle deres ordrer er blevet slettet`
      });
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast({
        title: "Fejl",
        description: "Kunne ikke slette kunde",
        variant: "destructive"
      });
    } finally {
      setDeletingCustomerId(null);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    setDeletingOrderId(orderId);
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (error) throw error;

      // Update local state - remove order from customer
      setCustomers(prev => prev.map(customer => ({
        ...customer,
        orders: customer.orders.filter(order => order.id !== orderId),
        orderCount: customer.orders.filter(order => order.id !== orderId).length,
        totalSpent: customer.orders
          .filter(order => order.id !== orderId)
          .reduce((sum, order) => sum + (order.total || 0), 0)
      })).filter(customer => customer.orderCount > 0)); // Remove customers with no orders

      // Close order sheet if this order was selected
      if (selectedOrder?.id === orderId) {
        setIsOrderSheetOpen(false);
        setSelectedOrder(null);
      }

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders-history'] });

      toast({
        title: "Ordre slettet",
        description: "Ordren er blevet permanent slettet"
      });
    } catch (error) {
      console.error('Error deleting order:', error);
      toast({
        title: "Fejl",
        description: "Kunne ikke slette ordre",
        variant: "destructive"
      });
    } finally {
      setDeletingOrderId(null);
    }
  };

  // Filter customers based on search
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    
    const query = searchQuery.toLowerCase();
    return customers.filter(customer => 
      customer.customerName.toLowerCase().includes(query) ||
      customer.phone?.toLowerCase().includes(query) ||
      customer.address?.toLowerCase().includes(query)
    );
  }, [customers, searchQuery]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <TopBar onOrderClick={handleOrderClick} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-lg font-semibold mb-2">Indlæser kunder...</div>
            <div className="text-ink-dim">Henter kunde data</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopBar onOrderClick={handleOrderClick} />
      
      {/* Header */}
      <div className="bg-background border-b border-line p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-base sm:text-lg font-semibold text-ink">Kunder</h1>
            <p className="text-xs sm:text-sm text-ink-dim">Oversigt over kunder og deres ordre historik</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm" 
              onClick={fetchCustomers}
              className="gap-1 sm:gap-2 flex-1 sm:flex-none min-h-[44px]"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden xs:inline">Opdater</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsCreateCustomerOpen(true)}
              className="gap-1 sm:gap-2 flex-1 sm:flex-none min-h-[44px]"
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden xs:inline">Ny kunde</span>
              <span className="xs:hidden">Ny</span>
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-ink-dim w-4 h-4" />
          <Input
            placeholder="Søg kunde, telefon eller adresse..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 min-h-[44px]"
          />
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2 sm:gap-4 mt-3 text-xs sm:text-sm text-ink-dim flex-wrap">
          <span>{filteredCustomers.length} kunder</span>
          <span>{customers.reduce((sum, c) => sum + c.orderCount, 0)} ordrer total</span>
          <span>{customers.reduce((sum, c) => sum + c.totalSpent, 0).toFixed(0)} kr. total</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Customer List */}
        <div className="w-full md:w-80 lg:w-96 border-r border-line bg-background">
          <ScrollArea className="h-full">
            {filteredCustomers.length === 0 ? (
              <div className="p-6 text-center">
                <div className="bg-chip rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-ink-dim" />
                </div>
                <p className="text-sm text-ink-dim">
                  {searchQuery.trim() ? `Ingen kunder fundet for "${searchQuery}"` : "Ingen kunder endnu"}
                </p>
              </div>
            ) : (
              <div className="p-2 sm:p-3">
                {filteredCustomers.map((customer, index) => (
                  <CustomerCard
                    key={`${customer.customerName}-${customer.phone || index}`}
                    customer={customer}
                    isSelected={selectedCustomer === customer}
                    onSelect={() => setSelectedCustomer(customer)}
                    onDelete={() => handleDeleteCustomer(customer)}
                    isDeleting={deletingCustomerId === `${customer.customerName}-${customer.phone}`}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Customer Details */}
        <div className="hidden md:flex flex-1 flex-col">
          {selectedCustomer ? (
            <CustomerDetails 
              customer={selectedCustomer} 
              onOrderClick={handleOrderClick}
              onDeleteOrder={handleDeleteOrder}
              deletingOrderId={deletingOrderId}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-chip">
              <div className="text-center">
                <User className="w-16 h-16 text-ink-dim mx-auto mb-4" />
                <h3 className="font-semibold text-ink mb-2">Vælg en kunde</h3>
                <p className="text-ink-dim">Klik på en kunde for at se deres ordre historik</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile: Customer details as overlay */}
      {selectedCustomer && (
        <div className="md:hidden fixed inset-0 bg-background z-50 flex flex-col">
          <div className="bg-background border-b border-line p-3 flex items-center justify-between">
            <h2 className="font-semibold text-ink">Kunde Detaljer</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedCustomer(null)}
              className="min-h-[44px]"
            >
              Luk
            </Button>
          </div>
          <CustomerDetails 
            customer={selectedCustomer} 
            onOrderClick={handleOrderClick}
            onDeleteOrder={handleDeleteOrder}
            deletingOrderId={deletingOrderId}
          />
        </div>
      )}

      {/* Order detail sheet */}
      {selectedOrder && (
        <OrderDetailSheet
          order={selectedOrder}
          open={isOrderSheetOpen}
          onOpenChange={(open) => {
            setIsOrderSheetOpen(open);
            if (!open) {
              setSelectedOrder(null);
            }
          }}
        />
      )}
      
      {/* Create Customer Dialog */}
      <CreateCustomerDialog
        open={isCreateCustomerOpen}
        onOpenChange={setIsCreateCustomerOpen}
        onCustomerCreated={() => {
          // Refresh customers to show new customer
          fetchCustomers();
        }}
      />
    </div>
  );
}

// Customer Card Component
function CustomerCard({ 
  customer, 
  isSelected, 
  onSelect,
  onDelete,
  isDeleting
}: { 
  customer: Customer; 
  isSelected: boolean; 
  onSelect: () => void; 
  onDelete: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="relative group mb-2">
      <Card 
        className={`cursor-pointer transition-all hover:shadow-md touch-manipulation ${
          isSelected ? 'ring-2 ring-brand-red bg-brand-red/5' : ''
        }`}
        onClick={onSelect}
      >
        <CardContent className="p-3 sm:p-4">
          <div className="space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm sm:text-base text-ink truncate">
                  {customer.customerName}
                </h3>
                {customer.phone && (
                  <div className="flex items-center gap-1 mt-1">
                    <Phone className="w-3 h-3 text-ink-dim" />
                    <span className="text-xs text-ink-dim">{customer.phone}</span>
                  </div>
                )}
              </div>
              <Badge variant="secondary" className="text-xs">
                {customer.orderCount} ordrer
              </Badge>
            </div>
            
            {customer.address && (
              <div className="flex items-start gap-1">
                <MapPin className="w-3 h-3 text-ink-dim mt-0.5 flex-shrink-0" />
                <span className="text-xs text-ink-dim truncate">{customer.address}</span>
              </div>
            )}
            
            <div className="flex items-center justify-between text-xs text-ink-dim">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Sidst: {formatDate(customer.lastOrderDate)}</span>
              </div>
              <span className="font-medium">{customer.totalSpent.toFixed(0)} kr.</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Delete button overlay */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={isDeleting}
              onClick={(e) => e.stopPropagation()}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Slet kunde</AlertDialogTitle>
              <AlertDialogDescription>
                Er du sikker på at du vil slette {customer.customerName} og alle deres {customer.orderCount} ordrer? 
                Denne handling kan ikke fortrydes.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuller</AlertDialogCancel>
              <AlertDialogAction
                onClick={onDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Slet kunde
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

// Customer Details Component
function CustomerDetails({ 
  customer, 
  onOrderClick,
  onDeleteOrder,
  deletingOrderId
}: { 
  customer: Customer; 
  onOrderClick: (order: Order) => void; 
  onDeleteOrder: (orderId: string) => void;
  deletingOrderId: string | null;
}) {
  return (
    <div className="flex-1 flex flex-col">
      {/* Customer Header */}
      <div className="bg-background border-b border-line p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-ink">{customer.customerName}</h2>
              {customer.phone && (
                <div className="flex items-center gap-2 mt-1">
                  <Phone className="w-4 h-4 text-ink-dim" />
                  <a 
                    href={`tel:${customer.phone}`}
                    className="text-sm text-brand-red hover:underline"
                  >
                    {customer.phone}
                  </a>
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-ink">{customer.totalSpent.toFixed(0)} kr.</div>
              <div className="text-xs text-ink-dim">Total brugt</div>
            </div>
          </div>
          
          {customer.address && (
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-ink-dim mt-0.5" />
              <span className="text-sm text-ink">{customer.address}</span>
            </div>
          )}
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-ink">{customer.orderCount}</div>
              <div className="text-xs text-ink-dim">Ordrer</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-ink">
                {(customer.totalSpent / customer.orderCount).toFixed(0)}
              </div>
              <div className="text-xs text-ink-dim">Gns. ordre</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-ink">
                {formatDate(customer.lastOrderDate)}
              </div>
              <div className="text-xs text-ink-dim">Sidst aktiv</div>
            </div>
          </div>
        </div>
      </div>

      {/* Order History */}
      <div className="flex-1 overflow-hidden">
        <div className="p-4 border-b border-line">
          <h3 className="font-semibold text-ink">Ordre Historik</h3>
          <p className="text-xs text-ink-dim">{customer.orders.length} ordrer total</p>
        </div>
        
        <ScrollArea className="flex-1 h-full">
          <div className="p-2 sm:p-4 space-y-2">
            {customer.orders.map((order) => (
              <div key={order.id} className="relative group">
                <Card 
                  className="cursor-pointer hover:shadow-md transition-all touch-manipulation"
                  onClick={() => onOrderClick(order)}
                >
                  <CardContent className="p-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs bg-chip px-2 py-1 rounded">
                            #{order.id.slice(0, 8)}
                          </span>
                          <Badge 
                            variant={order.type === 'delivery' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {order.type === 'delivery' ? 'Levering' : 'Afhentning'}
                          </Badge>
                          <Badge 
                            variant={order.status === 'done' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {order.status === 'done' ? 'Afsluttet' : 
                             order.status === 'ready' ? 'Klar' :
                             order.status === 'in_progress' ? 'I gang' : 'Ny'}
                          </Badge>
                        </div>
                        <span className="text-xs text-ink-dim">
                          {formatDate(order.createdAt)}
                        </span>
                      </div>
                      
                      <div className="text-sm text-ink">
                        {order.lines.slice(0, 2).map((line, index) => (
                          <div key={index} className="text-ink-dim text-xs">
                            {line.qty || 1}x {line.name || 'Ukendt vare'}
                          </div>
                        ))}
                        {order.lines.length > 2 && (
                          <div className="text-xs text-ink-dim">...og {order.lines.length - 2} mere</div>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs text-ink-dim">
                          <Clock className="w-3 h-3" />
                          <span>{formatTime(order.createdAt)}</span>
                        </div>
                        {order.total && (
                          <span className="font-semibold text-sm text-ink">
                            {order.total} kr.
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Delete button overlay */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-8 w-8 p-0"
                        disabled={deletingOrderId === order.id}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Slet ordre</AlertDialogTitle>
                        <AlertDialogDescription>
                          Er du sikker på at du vil slette ordre #{order.id.slice(0, 8)}? 
                          Denne handling kan ikke fortrydes.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuller</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDeleteOrder(order.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Slet ordre
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}