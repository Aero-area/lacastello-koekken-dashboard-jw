import { supabase } from '@/integrations/supabase/client';

export async function debugAddressInsertion() {
  console.log('🔍 DEBUGGING: Testing direct address insertion...');
  
  // Test 1: Insert a simple order with address data
  const testOrder = {
    id: crypto.randomUUID(),
    status: 'new',
    type: 'delivery',
    customer_name: 'DEBUG TEST',
    address: 'Stengade 15, 3000 Helsingør',
    address_street: 'Stengade',
    address_number: '15',
    address_postcode: '3000',
    address_city: 'Helsingør',
    lines: [{ qty: 1, name: 'Test Pizza', price: 100 }],
    source: 'debug'
  };

  console.log('🔍 DEBUGGING: Inserting test order with address data:', {
    address: testOrder.address,
    address_street: testOrder.address_street,
    address_number: testOrder.address_number,
    address_postcode: testOrder.address_postcode,
    address_city: testOrder.address_city
  });

  try {
    const { data, error } = await supabase
      .from('orders')
      .insert(testOrder)
      .select('*')
      .single();

    if (error) {
      console.error('🔍 DEBUGGING: Insert error:', error);
      throw error;
    }

    console.log('🔍 DEBUGGING: Order inserted successfully!');
    console.log('🔍 DEBUGGING: Returned data:', {
      id: data.id?.slice(0, 8),
      address: data.address,
      address_street: data.address_street,
      address_number: data.address_number,
      address_postcode: data.address_postcode,
      address_city: data.address_city
    });

    return data;
  } catch (error) {
    console.error('🔍 DEBUGGING: Failed to insert test order:', error);
    throw error;
  }
}

export async function checkTriggerFunction() {
  console.log('🔍 DEBUGGING: Checking trigger function...');
  
  try {
    // Query the database to see what the trigger function does
    const { data, error } = await supabase
      .rpc('format_order_on_insert_update', {});

    console.log('🔍 DEBUGGING: Trigger function result:', { data, error });
  } catch (error) {
    console.log('🔍 DEBUGGING: Cannot call trigger function directly (expected):', error);
  }
}