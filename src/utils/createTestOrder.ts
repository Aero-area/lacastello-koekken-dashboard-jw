import { supabase } from '@/integrations/supabase/client';

// Create 7 distinct test orders with different times and details
export async function createBulkTestOrders() {
  const baseTime = new Date();
  
  const testOrders = [
    {
      id: crypto.randomUUID(),
      status: 'new',
      created_at: new Date(baseTime.getTime() - 15 * 60000).toISOString(), // 15 min ago
      desired_time: null,
      type: 'delivery',
      customer_name: 'Anna Nielsen',
      phone: '+45 20 12 34 56',
      address: 'Stengade 15, 3000 Helsingør',
      address_street: 'Stengade',
      address_number: '15', 
      address_postcode: '3000',
      address_city: 'Helsingør',
      lines: [
        {
          qty: 1,
          menu_no: '2',
          name: 'Pepperoni Pizza',
          price: 95
        },
        {
          qty: 1,
          menu_no: '102',
          name: 'Fanta 0.33L',
          price: 25
        }
      ],
      notes: 'Ring på døren - 1. sal tv',
      allergies: 'Ingen',
      total: 120,
      printed_at: null,
      source: 'test',
      driver_id: null
    },
    {
      id: crypto.randomUUID(),
      status: 'in_progress',
      created_at: new Date(baseTime.getTime() - 25 * 60000).toISOString(), // 25 min ago
      desired_time: new Date(baseTime.getTime() + 10 * 60000).toISOString(), // 10 min from now
      type: 'pickup',
      customer_name: 'Lars Andersen',
      phone: '+45 30 98 76 54',
      address: null,
      lines: [
        {
          qty: 2,
          menu_no: '5',
          name: 'Hawaii Pizza',
          price: 89
        },
        {
          qty: 1,
          menu_no: '15',
          name: 'Kylling Salat',
          price: 75
        }
      ],
      notes: 'Ekstra ananas på Hawaii',
      allergies: 'Ingen',
      total: 253,
      printed_at: new Date(baseTime.getTime() - 20 * 60000).toISOString(),
      source: 'test',
      driver_id: null
    },
    {
      id: crypto.randomUUID(),
      status: 'ready',
      created_at: new Date(baseTime.getTime() - 35 * 60000).toISOString(), // 35 min ago
      desired_time: null,
      type: 'delivery',
      customer_name: 'Maria Sørensen',
      phone: '+45 40 11 22 33',
      address: 'Bramstræde 8, 3000 Helsingør',
      address_street: 'Bramstræde',
      address_number: '8',
      address_floor: '2',
      address_door: 'th',
      address_postcode: '3000',
      address_city: 'Helsingør',
      lines: [
        {
          qty: 1,
          menu_no: '12',
          name: 'Quattro Stagioni',
          price: 105,
          modifiers: [
            { action: 'add', item: 'ekstra ost', price_delta: 15 },
            { action: 'remove', item: 'champignon' }
          ]
        }
      ],
      notes: 'Allergiker - ingen nødder!',
      allergies: 'Nødder',
      total: 120,
      printed_at: new Date(baseTime.getTime() - 30 * 60000).toISOString(),
      source: 'test',
      driver_id: null
    },
    {
      id: crypto.randomUUID(),
      status: 'new',
      created_at: new Date(baseTime.getTime() - 5 * 60000).toISOString(), // 5 min ago
      desired_time: new Date(baseTime.getTime() + 30 * 60000).toISOString(), // 30 min from now
      type: 'delivery',
      customer_name: 'Peter Hansen',
      phone: '+45 50 44 55 66',
      address: 'Kongensgade 25, 3000 Helsingør',
      address_street: 'Kongensgade',
      address_number: '25',
      address_floor: '3',
      address_door: '2',
      address_postcode: '3000',
      address_city: 'Helsingør',
      lines: [
        {
          type: 'pizza_half_half',
          left: { number: '3', name: 'Vesuvio' },
          right: { number: '7', name: 'Capricciosa' },
          price: 98,
          display: '½ Vesuvio + ½ Capricciosa'
        },
        {
          qty: 2,
          menu_no: '103',
          name: 'Coca Cola 0.5L',
          price: 30
        }
      ],
      notes: 'Skal leveres til bagindgang',
      allergies: 'Ingen',
      total: 158,
      printed_at: null,
      source: 'test',
      driver_id: null
    },
    {
      id: crypto.randomUUID(),
      status: 'in_progress',
      created_at: new Date(baseTime.getTime() - 45 * 60000).toISOString(), // 45 min ago
      desired_time: null,
      type: 'pickup',
      customer_name: 'Sofie Larsen',
      phone: '+45 60 77 88 99',
      address: null,
      lines: [
        {
          qty: 3,
          menu_no: '1',
          name: 'Margherita Pizza',
          price: 79
        },
        {
          qty: 1,
          menu_no: '20',
          name: 'Tiramisu',
          price: 45
        },
        {
          qty: 3,
          menu_no: '101',
          name: 'Coca Cola 0.33L',
          price: 25
        }
      ],
      notes: 'Børnefødselsdag - tak!',
      allergies: 'Ingen',
      total: 357,
      printed_at: new Date(baseTime.getTime() - 40 * 60000).toISOString(),
      source: 'test',
      driver_id: null
    },
    {
      id: crypto.randomUUID(),
      status: 'ready',
      created_at: new Date(baseTime.getTime() - 20 * 60000).toISOString(), // 20 min ago
      desired_time: new Date(baseTime.getTime() + 5 * 60000).toISOString(), // 5 min from now
      type: 'delivery',
      customer_name: 'Thomas Christensen',
      phone: '+45 70 12 34 56',
      address: 'Allegade 42, 3000 Helsingør',
      address_street: 'Allegade',
      address_number: '42',
      address_staircase: 'A',
      address_floor: '1',
      address_door: 'mf',
      address_postcode: '3000',
      address_city: 'Helsingør',
      lines: [
        {
          qty: 1,
          menu_no: '8',
          name: 'Mexicana Pizza',
          price: 92,
          modifiers: [
            { action: 'add', item: 'jalapeños', price_delta: 10 },
            { action: 'add', item: 'ekstra stærk sauce', price_delta: 5 }
          ]
        },
        {
          qty: 1,
          menu_no: '16',
          name: 'Græsk Salat',
          price: 65
        }
      ],
      notes: 'Meget stærk - kunden elsker chili!',
      allergies: 'Ingen',
      total: 172,
      printed_at: new Date(baseTime.getTime() - 15 * 60000).toISOString(),
      source: 'test',
      driver_id: null
    },
    {
      id: crypto.randomUUID(),
      status: 'new',
      created_at: new Date(baseTime.getTime() - 2 * 60000).toISOString(), // 2 min ago
      desired_time: null,
      type: 'pickup',
      customer_name: 'Emma Møller',
      phone: '+45 80 99 88 77',
      address: null,
      lines: [
        {
          qty: 1,
          menu_no: '11',
          name: 'Vegetariana Pizza',
          price: 88,
          modifiers: [
            { action: 'remove', item: 'løg' },
            { action: 'add', item: 'rucola', price_delta: 12 }
          ]
        },
        {
          qty: 1,
          menu_no: '104',
          name: 'Mineralvand 0.5L',
          price: 20
        }
      ],
      notes: 'Vegetar - ingen kød eller fisk',
      allergies: 'Laktoseintolerant',
      total: 120,
      printed_at: null,
      source: 'test',
      driver_id: null
    }
  ];

  try {
    const { data, error } = await supabase
      .from('orders')
      .insert(testOrders)
      .select();

    if (error) {
      console.error('Error creating bulk test orders:', error);
      throw error;
    }

    console.log('🧪 Bulk test orders created successfully:', data?.length, 'orders');
    console.log('🧪 First created order sample:', data?.[0] ? {
      id: data[0].id?.slice(0, 8),
      type: data[0].type,
      address: data[0].address,
      address_street: data[0].address_street,
      address_number: data[0].address_number,
      address_postcode: data[0].address_postcode,
      address_city: data[0].address_city
    } : 'No data');
    return data;
  } catch (error) {
    console.error('Failed to create bulk test orders:', error);
    throw error;
  }
}

export async function createTestDeliveryOrder() {
  try {
    const testOrder = {
      id: crypto.randomUUID(),
      status: 'ready',
      created_at: new Date().toISOString(),
      desired_time: null,
      type: 'delivery',
      customer_name: 'Test Kunde',
      phone: '+45 12 34 56 78',
      address: 'Stengade 10, 3000 Helsingør',
      address_street: 'Stengade',
      address_number: '10',
      address_postcode: '3000',
      address_city: 'Helsingør',
      lines: [
        {
          qty: 1,
          menu_no: '1',
          name: 'Margherita Pizza',
          price: 89
        },
        {
          qty: 2,
          menu_no: '101',
          name: 'Coca Cola 0.33L',
          price: 25
        }
      ],
      notes: 'Ring på døren - 2. sal',
      allergies: 'Ingen',
      total: 139,
      printed_at: null,
      source: 'test',
      driver_id: null
    };

    const { data, error } = await supabase
      .from('orders')
      .insert(testOrder)
      .select()
      .single();

    if (error) {
      console.error('Error creating test order:', error);
      throw error;
    }

    console.log('Test delivery order created successfully:', data);
    return data;
  } catch (error) {
    console.error('Failed to create test order:', error);
    throw error;
  }
}

// Function to clean up test orders
export async function cleanupTestOrders() {
  try {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('source', 'test');

    if (error) {
      console.error('Error cleaning up test orders:', error);
      throw error;
    }

    console.log('Test orders cleaned up successfully');
  } catch (error) {
    console.error('Failed to cleanup test orders:', error);
    throw error;
  }
}