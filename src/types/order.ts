export interface OrderItem {
  id: string;
  menu_no: string;
  name: string;
  quantity: number;
  modifications?: string[];
  has_allergens?: boolean;
}

export interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone?: string;
  fulfillment_type: 'pickup' | 'delivery';
  status: 'new' | 'in_progress' | 'ready' | 'completed';
  created_at: string;
  scheduled_time?: string;
  is_asap: boolean;
  delivery_address?: string;
  items: OrderItem[];
  note?: string;
  has_allergens: boolean;
  total_amount?: number;
}

export type OrderStatus = 'new' | 'in_progress' | 'ready' | 'completed';
export type FulfillmentFilter = 'all' | 'pickup' | 'delivery';