import { Order } from './types';
import { supabase } from '@/integrations/supabase/client';

// Cache for menu items to avoid repeated database calls
let menuItemsCache: Record<string, string> | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Function to fetch and cache menu items from database
const getMenuItemsFromDatabase = async (): Promise<Record<string, string>> => {
  const now = Date.now();
  
  // Return cached data if still valid
  if (menuItemsCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return menuItemsCache;
  }
  
  try {
    const { data, error } = await supabase
      .from('menu_items')
      .select('id, navn')
      .not('navn', 'is', null);

    if (error) {
      console.warn('Could not fetch menu items from database:', error);
      return {};
    }

    // Create lookup map
    const menuMap: Record<string, string> = {};
    (data || []).forEach(item => {
      if (item.id && item.navn) {
        menuMap[item.id.toLowerCase()] = item.navn;
      }
    });

    // Update cache
    menuItemsCache = menuMap;
    cacheTimestamp = now;
    
    console.log('Menu items cache updated with', Object.keys(menuMap).length, 'items');
    return menuMap;
  } catch (error) {
    console.warn('Error fetching menu items:', error);
    return {};
  }
};

// Utility function to check if order has allergy
export const hasAllergy = (order: Order): boolean => {
  const allergies = (order.allergies ?? '').trim().toLowerCase();
  return allergies.length > 0 && allergies !== 'ingen';
};

// Transform function to convert database format to UI format
export const transformOrder = async (dbOrder: any): Promise<Order> => {
  console.log('🔄 Transform: Raw DB order:', {
    id: dbOrder.id?.slice(0, 8),
    lines: dbOrder.lines,
    address: dbOrder.address,
    address_street: dbOrder.address_street,
    address_number: dbOrder.address_number,
    address_postcode: dbOrder.address_postcode,
    address_city: dbOrder.address_city,
    type: dbOrder.type
  });

  // Parse address if it's stored as JSON string
  let parsedAddress = null;
  if (dbOrder.address && typeof dbOrder.address === 'string') {
    try {
      const parsed = JSON.parse(dbOrder.address);
      if (parsed && typeof parsed === 'object') {
        parsedAddress = parsed;
      }
    } catch (e) {
      // If parsing fails, treat as regular string
    }
  }

  // Get menu items from database for name lookup
  const menuItemsMap = await getMenuItemsFromDatabase();

  // Clean and validate lines data
  let cleanedLines = [];
  if (Array.isArray(dbOrder.lines)) {
    console.log('🔄 Transform: Processing lines:', dbOrder.lines);
    cleanedLines = dbOrder.lines.map((line: any) => {
      console.log('🔄 Transform: Processing line:', line);
      
      // Handle enhanced order lines with full structure
      if (line.type && ['pizza', 'burger', 'burger_menu', 'drink', 'standard'].includes(line.type)) {
        console.log('🔄 Transform: Enhanced order line detected:', line.type);

        return {
          type: line.type,
          menu_id: line.menu_id,
          menu_no: line.menu_no || line.menu_id,
          pizza_name: line.pizza_name,
          pizza_category: line.pizza_category,
          name: line.name || line.pizza_name || 'Ukendt vare',
          qty: line.qty || 1,
          size: line.size,
          size_price: line.size_price,
          choices: line.choices || [],
          modifiers: line.modifiers || [],
          final_price: line.final_price || line.price || 0,
          base_price: line.base_price,
          price: line.price,
          special_instructions: line.special_instructions
        };
      }
      
      // Handle half-half pizzas
      if (line.type === 'pizza_half_half') {
        return {
          ...line,
          display: line.display || `½ ${line.left?.name || 'Ukendt'} + ½ ${line.right?.name || 'Ukendt'}`
        };
      }
      
      // Get menu item name from database if we have menu_no
      let itemName = line.name || line.item_name || line.product_name;
      
      // Look up menu item name from database first
      if (line.menu_no && menuItemsMap[line.menu_no.toLowerCase()]) {
        itemName = menuItemsMap[line.menu_no.toLowerCase()];
        console.log('🔄 Transform: Found menu item in database:', line.menu_no, '->', itemName);
      }
      
      // Ensure itemName is always a string, not an object
      if (itemName && typeof itemName === 'object') {
        // If it's an object, try to extract the name from common properties
        itemName = itemName.navn || itemName.name || itemName.title || String(itemName);
      }
      
      // Fallback to hardcoded menu items if database lookup fails
      if (!itemName && line.menu_no) {
        const fallbackName = getMenuItemName(line.menu_no);
        if (fallbackName) {
          itemName = String(fallbackName);
          console.log('🔄 Transform: Using fallback menu item:', line.menu_no, '->', itemName);
        }
      }
      
      // Handle standard items
      const transformedLine = {
        qty: line.qty || line.quantity || 1,
        name: String(itemName || line.menu_no || 'Ukendt vare'),
        price: line.price || line.price_dkk || 0,
        menu_no: line.menu_no || undefined,
        modifiers: line.modifiers || (line.mods ? line.mods.map((mod: string) => ({
          action: 'add',
          item: mod,
          price_delta: 0
        })) : undefined)
      };
      
      console.log('🔄 Transform: Transformed line:', transformedLine);
      return transformedLine;
    });
  }

  return {
    id: dbOrder.id,
    status: dbOrder.status,
    createdAt: dbOrder.created_at,
    desiredTime: dbOrder.desired_time,
    type: dbOrder.type === 'delivery' ? 'delivery' : 'pickup',
    customerName: cleanCustomerName(dbOrder.customer_name),
    phone: dbOrder.phone,
    address: dbOrder.address,
    addressStreet: dbOrder.address_street || parsedAddress?.street,
    addressNumber: dbOrder.address_number || parsedAddress?.number,
    addressFloor: dbOrder.address_floor || parsedAddress?.floor,
    addressDoor: dbOrder.address_door || parsedAddress?.door,
    addressStaircase: dbOrder.address_staircase || parsedAddress?.staircase,
    addressPostcode: dbOrder.address_postcode || parsedAddress?.zip,
    addressCity: dbOrder.address_city || parsedAddress?.city,
    lines: cleanedLines,
    notes: dbOrder.notes ?? null,
    allergies: dbOrder.allergies ?? null,
    total: dbOrder.total ? Number(dbOrder.total) : null,
    printedAt: dbOrder.printed_at,
    source: dbOrder.source,
    driverId: dbOrder.driver_id,
    revision: dbOrder.revision || 0,
    hasAllergy: Boolean(dbOrder.allergies && dbOrder.allergies.toLowerCase() !== "ingen")
  };
};

// Helper function to get menu item name by menu number
export function getMenuItemName(menuNo: string | undefined): string | null {
  if (!menuNo) return null;
  
  const menuItems: Record<string, string> = {
    // Pizzas
    '1': 'Margherita Pizza',
    '2': 'Vesuvio Pizza', 
    '3': 'Pepperoni Pizza',
    '4': 'Quattro Formaggi Pizza',
    '5': 'Hawaii Pizza',
    '6': 'Capricciosa Pizza',
    '7': 'Bianca Pizza',
    '8': 'Mexicana Pizza',
    '9': 'Marinara Pizza',
    '10': 'La Mafia Pizza',
    '11': 'Vegetariana Pizza',
    '12': 'Quattro Stagioni Pizza',
    '13': 'Calzone',
    '14': 'Tonno Pizza',
    '14A': 'Tonno Pizza (Stor)',
    '14B': 'Tonno Pizza (Familie)',
    
    // Salads
    '15': 'Kylling Salat',
    '15A': 'Kylling Salat (Stor)',
    '16': 'Græsk Salat',
    '16A': 'Græsk Salat (Stor)',
    '17': 'Caesar Salat',
    '18': 'Tun Salat',
    '18A': 'Tun Salat (Stor)',
    
    // Desserts
    '20': 'Tiramisu',
    '21': 'Panna Cotta',
    '22': 'Gelato',
    
    // Drinks
    '101': 'Coca Cola 0.33L',
    '101A': 'Coca Cola 0.33L (Light)',
    '101B': 'Coca Cola 0.33L (Zero)',
    '102': 'Fanta 0.33L',
    '102A': 'Fanta 0.33L (Zero)',
    '103': 'Coca Cola 0.5L',
    '103A': 'Coca Cola 0.5L (Light)',
    '103B': 'Coca Cola 0.5L (Zero)',
    '104': 'Mineralvand 0.5L',
    '105': 'Øl 0.33L',
    '105A': 'Øl 0.33L (Alkoholfri)',
    '106': 'Rødvin',
    '107': 'Hvidvin',
    
    // Sides
    '201': 'Pommes Frites',
    '201A': 'Pommes Frites (Stor)',
    '201B': 'Pommes Frites (Familie)',
    '202': 'Hvidløgsbrød',
    '202A': 'Hvidløgsbrød (Stor)',
    '203': 'Mozzarella Sticks',
    '203A': 'Mozzarella Sticks (Stor)',
    
    // Legacy mappings
    '43A': 'Pommes Frites'
  };
  
  return menuItems[menuNo] || null;
}

// Helper function to clean customer names
function cleanCustomerName(name: string | null | undefined): string {
  if (!name || name.trim() === '' || name === 'null') {
    return 'Ukendt kunde';
  }
  
  // Clean up common issues
  const cleaned = name.trim();
  
  // Handle specific cases
  if (cleaned === 'Test') return 'Test Kunde';
  if (cleaned === 'Jakob') return 'Jakob Andersen';
  if (cleaned === 'GHL Testkunde') return 'GHL Test Kunde';
  if (cleaned === 'Kunde') return 'Ukendt kunde';
  
  return cleaned;
}