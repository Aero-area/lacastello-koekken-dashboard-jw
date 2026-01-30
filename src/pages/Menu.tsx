import { useState, useEffect } from "react";
import { Search, Plus, CreditCard as Edit, Eye, EyeOff, Save, X, RefreshCw, Package } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Order } from "@/lib/types";

interface MenuItem {
  id: string;
  hovedkategori: string | null;
  navn: string | null;
  pris: number | null;
  beskrivelse: string | null;
  is_available: boolean;
}

interface MenuAddon {
  id: string;
  name: string;
  price: number;
  applies_to_category: string;
  synonyms: string[] | null;
}

export function Menu() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [addons, setAddons] = useState<MenuAddon[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<string>("id_asc");
  const [isLoading, setIsLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedItemForAddons, setSelectedItemForAddons] = useState<MenuItem | null>(null);
  const [isAddonsDialogOpen, setIsAddonsDialogOpen] = useState(false);
  const { toast } = useToast();

  // Fetch menu items and addons
  useEffect(() => {
    fetchMenuData();
  }, []);

  const fetchMenuData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch menu items
      const { data: itemsData, error: itemsError } = await supabase
        .from('menu_items')
        .select('*')
        .order('hovedkategori', { ascending: true })
        .order('id', { ascending: true });

      if (itemsError) throw itemsError;

      // Fetch addons
      const { data: addonsData, error: addonsError } = await supabase
        .from('menu_addons')
        .select('*')
        .order('name', { ascending: true });

      if (addonsError) throw addonsError;

      setMenuItems(itemsData || []);
      setAddons(addonsData || []);
    } catch (error) {
      console.error('Error fetching menu data:', error);
      toast({
        title: "Fejl",
        description: "Kunne ikke hente menu data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOrderClick = (order: Order) => {
    // Handle order click if needed
  };

  // Get unique categories
  const categories = Array.from(new Set(menuItems.map(item => item.hovedkategori).filter(Boolean)));

  // Filter menu items
  const filteredItems = menuItems.filter(item => {
    const matchesSearch = !searchQuery.trim() || 
      item.navn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.beskrivelse?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === "all" || item.hovedkategori === categoryFilter;
    
    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    switch (sortOrder) {
      case 'id_asc':
        // Natural sort for menu IDs (1, 2, 3, 10, 11 instead of 1, 10, 11, 2, 3)
        return a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' });
      case 'id_desc':
        return b.id.localeCompare(a.id, undefined, { numeric: true, sensitivity: 'base' });
      case 'name_asc':
        return (a.navn || '').localeCompare(b.navn || '', 'da');
      case 'name_desc':
        return (b.navn || '').localeCompare(a.navn || '', 'da');
      case 'price_asc':
        return (a.pris || 0) - (b.pris || 0);
      case 'price_desc':
        return (b.pris || 0) - (a.pris || 0);
      case 'category_asc':
        return (a.hovedkategori || '').localeCompare(b.hovedkategori || '', 'da');
      default:
        return 0;
    }
  });

  const handleToggleAvailability = async (item: MenuItem) => {
    try {
      const newAvailability = !item.is_available;
      
      const { error } = await supabase
        .from('menu_items')
        .update({ is_available: newAvailability })
        .eq('id', item.id);

      if (error) throw error;

      // Update local state
      setMenuItems(prev => prev.map(i => 
        i.id === item.id ? { ...i, is_available: newAvailability } : i
      ));

      toast({
        title: newAvailability ? "Vare aktiveret" : "Vare deaktiveret",
        description: `${item.navn} er nu ${newAvailability ? 'tilgængelig' : 'ikke tilgængelig'}`
      });
    } catch (error) {
      console.error('Error toggling availability:', error);
      toast({
        title: "Fejl",
        description: "Kunne ikke opdatere vare status",
        variant: "destructive"
      });
    }
  };

  const handleSaveItem = async (itemData: Partial<MenuItem>) => {
    try {
      if (editingItem) {
        // Update existing item
        const { error } = await supabase
          .from('menu_items')
          .update({
            navn: itemData.navn,
            pris: itemData.pris,
            beskrivelse: itemData.beskrivelse,
            hovedkategori: itemData.hovedkategori,
            is_available: itemData.is_available
          })
          .eq('id', editingItem.id);

        if (error) throw error;

        // Update local state
        setMenuItems(prev => prev.map(i => 
          i.id === editingItem.id ? { ...i, ...itemData } : i
        ));

        toast({
          title: "Vare opdateret",
          description: `${itemData.navn} er blevet opdateret`
        });
      } else {
        // Create new item
        const { error } = await supabase
          .from('menu_items')
          .insert({
            id: itemData.id,
            navn: itemData.navn,
            pris: itemData.pris,
            beskrivelse: itemData.beskrivelse,
            hovedkategori: itemData.hovedkategori,
            is_available: itemData.is_available ?? true
          });

        if (error) throw error;

        // Refresh data
        await fetchMenuData();

        toast({
          title: "Vare oprettet",
          description: `${itemData.navn} er blevet tilføjet til menuen`
        });
      }

      setIsEditDialogOpen(false);
      setIsAddDialogOpen(false);
      setEditingItem(null);
    } catch (error) {
      console.error('Error saving item:', error);
      toast({
        title: "Fejl",
        description: "Kunne ikke gemme vare",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <TopBar onOrderClick={handleOrderClick} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-lg font-semibold mb-2">Indlæser menu...</div>
            <div className="text-ink-dim">Henter menu data</div>
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
            <h1 className="text-base sm:text-lg font-semibold text-ink">Menu Administration</h1>
            <p className="text-xs sm:text-sm text-ink-dim">Administrer menu varer og tilgængelighed</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm" 
              onClick={fetchMenuData}
              className="gap-1 sm:gap-2 flex-1 sm:flex-none min-h-[44px]"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden xs:inline">Opdater</span>
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1 sm:gap-2 flex-1 sm:flex-none min-h-[44px]">
                  <Plus className="w-4 h-4" />
                  <span className="hidden xs:inline">Ny vare</span>
                  <span className="xs:hidden">Ny</span>
                </Button>
              </DialogTrigger>
              <MenuItemDialog
                item={null}
                onSave={handleSaveItem}
                onClose={() => setIsAddDialogOpen(false)}
              />
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-ink-dim w-4 h-4" />
            <Input
              placeholder="Søg i menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 min-h-[44px]"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full min-h-[44px]">
                <SelectValue placeholder="Vælg kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle kategorier</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger className="w-full min-h-[44px]">
                <SelectValue placeholder="Sorter efter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="id_asc">Menu ID (1→9)</SelectItem>
                <SelectItem value="id_desc">Menu ID (9→1)</SelectItem>
                <SelectItem value="name_asc">Navn (A→Z)</SelectItem>
                <SelectItem value="name_desc">Navn (Z→A)</SelectItem>
                <SelectItem value="price_asc">Pris (lav→høj)</SelectItem>
                <SelectItem value="price_desc">Pris (høj→lav)</SelectItem>
                <SelectItem value="category_asc">Kategori (A→Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2 sm:gap-4 mt-3 text-xs sm:text-sm text-ink-dim flex-wrap">
          <span>{filteredItems.length} varer</span>
          <span>{filteredItems.filter(i => i.is_available).length} tilgængelige</span>
          <span>{filteredItems.filter(i => !i.is_available).length} deaktiverede</span>
          <span className="text-brand-red">Sorteret: {
            sortOrder === 'id_asc' ? 'Menu ID (1→9)' :
            sortOrder === 'id_desc' ? 'Menu ID (9→1)' :
            sortOrder === 'name_asc' ? 'Navn (A→Z)' :
            sortOrder === 'name_desc' ? 'Navn (Z→A)' :
            sortOrder === 'price_asc' ? 'Pris (lav→høj)' :
            sortOrder === 'price_desc' ? 'Pris (høj→lav)' :
            sortOrder === 'category_asc' ? 'Kategori (A→Z)' : 'Standard'
          }</span>
        </div>
      </div>

      {/* Menu Items Grid */}
      <div className="flex-1 p-3 sm:p-4 overflow-y-auto">
        {filteredItems.length === 0 ? (
          <div className="text-center text-ink-dim py-12">
            {searchQuery.trim() ? 
              `Ingen varer fundet for "${searchQuery}"` :
              "Ingen menu varer fundet"
            }
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {filteredItems.map((item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                onToggleAvailability={() => handleToggleAvailability(item)}
                onEdit={() => {
                  setEditingItem(item);
                  setIsEditDialogOpen(true);
                }}
                onViewAddons={() => {
                  setSelectedItemForAddons(item);
                  setIsAddonsDialogOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <MenuItemDialog
          item={editingItem}
          onSave={handleSaveItem}
          onClose={() => {
            setIsEditDialogOpen(false);
            setEditingItem(null);
          }}
        />
      </Dialog>

      {/* Addons Dialog */}
      <Dialog open={isAddonsDialogOpen} onOpenChange={setIsAddonsDialogOpen}>
        <AddonsDialog
          item={selectedItemForAddons}
          addons={addons}
          onClose={() => {
            setIsAddonsDialogOpen(false);
            setSelectedItemForAddons(null);
          }}
        />
      </Dialog>
    </div>
  );
}

// Menu Item Card Component
function MenuItemCard({ 
  item, 
  onToggleAvailability, 
  onEdit,
  onViewAddons
}: { 
  item: MenuItem; 
  onToggleAvailability: () => void; 
  onEdit: () => void;
  onViewAddons: () => void;
  onViewAddons: () => void;
}) {
  // Check if this item can have addons (Pizza categories)
  const canHaveAddons = item.hovedkategori?.toLowerCase().includes('pizza') || false;

  return (
    <Card className={`transition-all hover:shadow-md touch-manipulation ${!item.is_available ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 sm:gap-2 mb-1 flex-wrap">
              <span className="font-mono text-xs bg-chip px-1.5 sm:px-2 py-0.5 sm:py-1 rounded">#{item.id}</span>
              {item.hovedkategori && (
                <Badge variant="outline" className="text-xs scale-90 sm:scale-100">
                  {item.hovedkategori}
                </Badge>
              )}
            </div>
            <CardTitle className="text-sm sm:text-base leading-tight">
              {item.navn || 'Unavngivet vare'}
            </CardTitle>
          </div>
          <div className="flex flex-col items-center gap-1 ml-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleAvailability}
              className="p-1 h-auto min-h-[44px] sm:min-h-auto touch-manipulation"
            >
              {item.is_available ? (
                <Eye className="w-4 h-4 text-green-600" />
              ) : (
                <EyeOff className="w-4 h-4 text-red-600" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              className="p-1 h-auto min-h-[44px] sm:min-h-auto touch-manipulation"
            >
              <Edit className="w-4 h-4 text-blue-600" />
            </Button>
            {canHaveAddons && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onViewAddons}
                className="p-1 h-auto min-h-[44px] sm:min-h-auto touch-manipulation"
                title="Se tilbehør"
              >
                <Package className="w-4 h-4 text-purple-600" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 p-3 sm:p-6">
        <div className="space-y-2">
          {item.beskrivelse && (
            <p className="text-xs sm:text-sm text-ink-dim line-clamp-2">
              {item.beskrivelse}
            </p>
          )}
          
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm sm:text-base text-ink">
              {item.pris ? `${item.pris} kr.` : 'Ingen pris'}
            </span>
            <Badge variant={item.is_available ? 'default' : 'secondary'} className="text-xs">
              {item.is_available ? 'Tilgængelig' : 'Deaktiveret'}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Menu Item Dialog Component
function MenuItemDialog({ 
  item, 
  onSave, 
  onClose 
}: { 
  item: MenuItem | null; 
  onSave: (data: Partial<MenuItem>) => void; 
  onClose: () => void; 
}) {
  const [formData, setFormData] = useState({
    id: item?.id || '',
    navn: item?.navn || '',
    pris: item?.pris?.toString() || '',
    beskrivelse: item?.beskrivelse || '',
    hovedkategori: item?.hovedkategori || '',
    is_available: item?.is_available ?? true
  });

  const categories = [
    'Pizza',
    'Salat', 
    'Pasta',
    'Sandwich',
    'Burger',
    'Dessert',
    'Drikkevarer',
    'Tilbehør'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.id.trim() || !formData.navn.trim()) {
      toast({
        title: "Fejl",
        description: "ID og navn er påkrævet",
        variant: "destructive"
      });
      return;
    }

    onSave({
      id: formData.id.trim(),
      navn: formData.navn.trim(),
      pris: formData.pris ? parseFloat(formData.pris) : null,
      beskrivelse: formData.beskrivelse.trim() || null,
      hovedkategori: formData.hovedkategori || null,
      is_available: formData.is_available
    });
  };

  return (
    <DialogContent className="max-w-md mx-4 max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {item ? 'Rediger vare' : 'Tilføj ny vare'}
        </DialogTitle>
      </DialogHeader>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="id">Menu ID *</Label>
            <Input
              id="id"
              value={formData.id}
              onChange={(e) => setFormData(prev => ({ ...prev, id: e.target.value }))}
              placeholder="1, 2A, etc."
              disabled={!!item} // Can't change ID of existing item
              className="min-h-[44px]"
              required
            />
          </div>
          <div>
            <Label htmlFor="pris">Pris (kr.)</Label>
            <Input
              id="pris"
              type="number"
              step="0.01"
              value={formData.pris}
              onChange={(e) => setFormData(prev => ({ ...prev, pris: e.target.value }))}
              placeholder="89.00"
              className="min-h-[44px]"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="navn">Navn *</Label>
          <Input
            id="navn"
            value={formData.navn}
            onChange={(e) => setFormData(prev => ({ ...prev, navn: e.target.value }))}
            placeholder="Margherita Pizza"
            className="min-h-[44px]"
            required
          />
        </div>

        <div>
          <Label htmlFor="kategori">Kategori</Label>
          <Select 
            value={formData.hovedkategori} 
            onValueChange={(value) => setFormData(prev => ({ ...prev, hovedkategori: value }))}
          >
            <SelectTrigger className="min-h-[44px]">
              <SelectValue placeholder="Vælg kategori" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(category => (
                <SelectItem key={category} value={category}>
                  {category}
                  onViewAddons={() => {
                    setSelectedItemForAddons(item);
                    setIsAddonsDialogOpen(true);
                  }}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="beskrivelse">Beskrivelse</Label>
          <Textarea
            id="beskrivelse"
            value={formData.beskrivelse}
            onChange={(e) => setFormData(prev => ({ ...prev, beskrivelse: e.target.value }))}
            placeholder="Tomatsauce, mozzarella..."
            rows={2}
            className="min-h-[80px] resize-none"
          />
        </div>

        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <Switch
              id="available"
              checked={formData.is_available}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_available: checked }))}
              className="scale-110"
            />
            <Label htmlFor="available" className="text-sm font-medium">Tilgængelig</Label>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose}
            className="min-h-[44px] order-2 sm:order-1"
          >
            Annuller
          </Button>
          <Button 
            type="submit"
            className="min-h-[44px] order-1 sm:order-2"
          >
            <Save className="w-4 h-4 mr-2" />
            Gem
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}

// Addons Dialog Component
function AddonsDialog({ 
  item, 
  addons,
  onClose 
}: { 
  item: MenuItem | null; 
  addons: MenuAddon[];
  onClose: () => void; 
}) {
  if (!item) return null;

  // Group addons by category
  const addonsByCategory = addons.reduce((acc, addon) => {
    const category = addon.applies_to_category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(addon);
    return acc;
  }, {} as Record<string, MenuAddon[]>);

  const categoryLabels = {
    'sauce': 'Saucer & Dressinger',
    'protein': 'Kød & Ost',
    'vegetable': 'Grøntsager'
  };

  return (
    <DialogContent className="max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Package className="w-5 h-5 text-purple-600" />
          Tilbehør til {item.navn}
        </DialogTitle>
        <p className="text-sm text-ink-dim">
          Tilgængeligt tilbehør for #{item.id}
        </p>
      </DialogHeader>
      
      <div className="space-y-6">
        {Object.entries(addonsByCategory).map(([category, categoryAddons]) => (
          <div key={category}>
            <h3 className="font-semibold text-ink mb-3 flex items-center gap-2">
              {categoryLabels[category as keyof typeof categoryLabels] || category}
              <Badge variant="outline" className="text-xs">
                {categoryAddons.length} varer
              </Badge>
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {categoryAddons.map((addon) => (
                <Card key={addon.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink truncate">
                          {addon.name}
                        </p>
                        {addon.synonyms && addon.synonyms.length > 0 && (
                          <p className="text-xs text-ink-dim truncate">
                            Også: {addon.synonyms.slice(0, 2).join(', ')}
                            {addon.synonyms.length > 2 && '...'}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-ink">
                          +{addon.price} kr.
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {category !== Object.keys(addonsByCategory)[Object.keys(addonsByCategory).length - 1] && (
              <Separator className="mt-4" />
            )}
          </div>
        ))}
        
        {Object.keys(addonsByCategory).length === 0 && (
          <div className="text-center py-8 text-ink-dim">
            <Package className="w-12 h-12 mx-auto mb-4 text-ink-dim" />
            <p>Ingen tilbehør tilgængeligt for denne vare</p>
          </div>
        )}
      </div>
      
      <div className="flex justify-end pt-4">
        <Button onClick={onClose} className="min-h-[44px]">
          Luk
        </Button>
      </div>
    </DialogContent>
  );
}