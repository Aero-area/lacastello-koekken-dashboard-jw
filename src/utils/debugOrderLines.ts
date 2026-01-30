import { supabase } from '@/integrations/supabase/client';

export async function debugOrderLines() {
  console.log('🔍 DEBUGGING: Checking order lines in database...');
  
  try {
    // Get a few recent orders to see their line structure
    const { data, error } = await supabase
      .from('orders')
      .select('id, lines, customer_name')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('🔍 DEBUGGING: Error fetching orders:', error);
      throw error;
    }

    console.log('🔍 DEBUGGING: Recent orders and their lines:');
    data?.forEach((order, index) => {
      console.log(`🔍 Order ${index + 1} (${order.id?.slice(0, 8)}) - ${order.customer_name}:`);
      console.log('🔍 Raw lines data:', order.lines);
      
      if (Array.isArray(order.lines)) {
        order.lines.forEach((line: any, lineIndex: number) => {
          console.log(`🔍   Line ${lineIndex + 1}:`, {
            name: line.name,
            item_name: line.item_name,
            product_name: line.product_name,
            menu_no: line.menu_no,
            qty: line.qty,
            quantity: line.quantity,
            price: line.price,
            allKeys: Object.keys(line)
          });
        });
      } else {
        console.log('🔍   Lines is not an array:', typeof order.lines, order.lines);
      }
      console.log('---');
    });

    return data;
  } catch (error) {
    console.error('🔍 DEBUGGING: Failed to debug order lines:', error);
    throw error;
  }
}

export async function checkDatabaseTrigger() {
  console.log('🔍 DEBUGGING: Checking database trigger function...');
  
  try {
    // Query the pg_proc table to see trigger functions
    const { data, error } = await supabase
      .rpc('format_order_on_insert_update', {});

    console.log('🔍 DEBUGGING: Trigger function result:', { data, error });
  } catch (error) {
    console.log('🔍 DEBUGGING: Cannot call trigger function directly (expected):', error);
  }
  
  // Try to get trigger information
  try {
    const { data: triggerData, error: triggerError } = await supabase
      .from('information_schema.triggers')
      .select('*')
      .eq('event_object_table', 'orders');
      
    console.log('🔍 DEBUGGING: Trigger info:', { triggerData, triggerError });
  } catch (error) {
    console.log('🔍 DEBUGGING: Cannot access trigger info:', error);
  }
}