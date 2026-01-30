import { supabase } from '@/integrations/supabase/client';

export async function checkDatabaseSchema() {
  console.log('🔍 Checking database schema for menu_items table...');
  
  try {
    // Check if new columns exist by querying the table structure
    const { data: schemaData, error: schemaError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'menu_items')
      .eq('table_schema', 'public');

    if (schemaError) {
      console.error('Error checking schema:', schemaError);
      return;
    }

    console.log('📋 Current menu_items columns:', schemaData);
    
    // Check if our new columns exist
    const hasAddonIds = schemaData?.some(col => col.column_name === 'pizza_addon_ids');
    const hasAddonCategory = schemaData?.some(col => col.column_name === 'addon_category');
    
    console.log('✅ New columns status:', {
      pizza_addon_ids: hasAddonIds ? 'EXISTS' : 'MISSING',
      addon_category: hasAddonCategory ? 'EXISTS' : 'MISSING'
    });

    // Check if addon data was inserted
    const { data: addonData, error: addonError } = await supabase
      .from('menu_items')
      .select('id, navn, pris, addon_category, pizza_addon_ids')
      .not('addon_category', 'is', null)
      .order('id');

    if (addonError) {
      console.error('Error checking addon data:', addonError);
      return;
    }

    console.log('🍕 Pizza addons in database:', addonData?.length || 0, 'items');
    
    if (addonData && addonData.length > 0) {
      console.log('📝 Sample addon items:');
      addonData.slice(0, 5).forEach(item => {
        console.log(`  ${item.id}: ${item.navn} - ${item.pris}kr (${item.addon_category})`);
        console.log(`    Can be added to pizzas: ${item.pizza_addon_ids}`);
      });
      
      // Count by category
      const categories = addonData.reduce((acc: Record<string, number>, item) => {
        const cat = item.addon_category || 'unknown';
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      }, {});
      
      console.log('📊 Addons by category:', categories);
    } else {
      console.log('❌ No addon data found in database');
    }

    // Check regular menu items (pizzas)
    const { data: pizzaData, error: pizzaError } = await supabase
      .from('menu_items')
      .select('id, navn, hovedkategori')
      .eq('hovedkategori', 'Pizza')
      .order('id');

    if (!pizzaError && pizzaData) {
      console.log('🍕 Pizza menu items:', pizzaData.length, 'items');
      console.log('🍕 Pizza IDs:', pizzaData.map(p => p.id).join(', '));
    }

  } catch (error) {
    console.error('🔍 Database check failed:', error);
  }
}