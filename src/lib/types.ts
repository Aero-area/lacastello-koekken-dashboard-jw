export type Order = {
  id: string;
  status: "new" | "in_progress" | "ready" | "done";
  createdAt: string;
  desiredTime: string | null;
  type: "pickup" | "delivery";
  customerName: string;
  phone: string | null;
  address: string;
  addressStreet?: string | null;
  addressNumber?: string | null;
  addressFloor?: string | null;
  addressDoor?: string | null;
  addressStaircase?: string | null;  
  addressPostcode?: string | null;
  addressCity?: string | null;
  lines: OrderLine[];
  allergies: string | null;
  notes: string | null;
  total: number | null;
  printedAt: string | null;
  source: string | null;
  driverId: string | null;
  hasAllergy: boolean;
  revision: number;
};

export type OrderLine = 
  | StandardOrderLine
  | HalfHalfPizzaLine
  | ModifiedOrderLine
  | EnhancedOrderLine;

export interface StandardOrderLine {
  qty: number;
  menu_no?: string;
  name: string;
  price: number;
}

export interface HalfHalfPizzaLine {
  type: "pizza_half_half";
  left: { number: string; name: string };
  right: { number: string; name: string };
  price: number;
  display: string;
}

export interface ModifiedOrderLine {
  qty: number;
  menu_no?: string;
  name: string;
  price: number;
  modifiers: Array<{
    action: "add" | "remove";
    item: string;
    price_delta?: number;
  }>;
}

export interface EnhancedOrderLine {
  type: "pizza" | "burger" | "burger_menu" | "drink" | "standard";
  menu_id: string;
  pizza_name?: string;
  pizza_category?: string;
  name: string;
  qty: number;

  // Pizza sizes
  size?: "alm" | "two_etagers" | "deep_pan" | "family";
  size_price?: number;

  // Required choices (CRITICAL) - for burgers and menus
  choices?: Array<{
    category: string;
    option: string;
    choice_id?: string;
    validated_name?: string;
    price_delta: number;
  }>;

  // Modifiers
  modifiers?: Array<{
    action: "add" | "remove";
    item: string;
    price_delta: number;
  }>;

  final_price: number;
  base_price?: number;
  price?: number;
  special_instructions?: string;
}
export type OrderStatus = "new" | "in_progress" | "ready" | "done";
export type FulfillmentType = "pickup" | "delivery";
export type FulfillmentFilter = "all" | "pickup" | "delivery";