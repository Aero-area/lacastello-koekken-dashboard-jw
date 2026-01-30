/*
  # Automatic order formatting for all future orders

  1. Database Functions
    - Create function to automatically format order lines on insert/update
    - Map menu numbers to proper item names
    - Clean customer names and addresses
    - Ensure consistent data formatting

  2. Triggers
    - Trigger on INSERT to format new orders
    - Trigger on UPDATE to maintain formatting
    - Handle all order sources (VAPI, manual, test, etc.)

  3. Menu Item Mapping
    - Complete mapping of all menu numbers to proper names
    - Fallback handling for unknown menu numbers
    - Support for half-half pizzas and modifiers
*/

-- Create comprehensive menu item mapping function
CREATE OR REPLACE FUNCTION get_menu_item_name(menu_no text)
RETURNS text AS $$
BEGIN
  RETURN CASE menu_no
    -- Pizzas
    WHEN '1' THEN 'Margherita Pizza'
    WHEN '2' THEN 'Vesuvio Pizza'
    WHEN '3' THEN 'Pepperoni Pizza'
    WHEN '4' THEN 'Quattro Formaggi Pizza'
    WHEN '5' THEN 'Hawaii Pizza'
    WHEN '6' THEN 'Capricciosa Pizza'
    WHEN '7' THEN 'Bianca Pizza'
    WHEN '8' THEN 'Mexicana Pizza'
    WHEN '9' THEN 'Marinara Pizza'
    WHEN '10' THEN 'La Mafia Pizza'
    WHEN '11' THEN 'Vegetariana Pizza'
    WHEN '12' THEN 'Quattro Stagioni Pizza'
    WHEN '13' THEN 'Calzone'
    WHEN '14' THEN 'Tonno Pizza'
    
    -- Salads
    WHEN '15' THEN 'Kylling Salat'
    WHEN '16' THEN 'Græsk Salat'
    WHEN '17' THEN 'Caesar Salat'
    WHEN '18' THEN 'Tun Salat'
    
    -- Desserts
    WHEN '20' THEN 'Tiramisu'
    WHEN '21' THEN 'Panna Cotta'
    WHEN '22' THEN 'Gelato'
    
    -- Drinks
    WHEN '101' THEN 'Coca Cola 0.33L'
    WHEN '102' THEN 'Fanta 0.33L'
    WHEN '103' THEN 'Coca Cola 0.5L'
    WHEN '104' THEN 'Mineralvand 0.5L'
    WHEN '105' THEN 'Øl 0.33L'
    WHEN '106' THEN 'Rødvin'
    WHEN '107' THEN 'Hvidvin'
    
    -- Sides
    WHEN '201' THEN 'Pommes Frites'
    WHEN '202' THEN 'Hvidløgsbrød'
    WHEN '203' THEN 'Mozzarella Sticks'
    
    -- Legacy mappings for old menu numbers
    WHEN '17' THEN 'Coca Cola 0.33L' -- Old drink mapping
    WHEN '43A' THEN 'Pommes Frites'
    
    ELSE COALESCE(menu_no, 'Ukendt vare')
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to clean and format customer names
CREATE OR REPLACE FUNCTION clean_customer_name(name text)
RETURNS text AS $$
BEGIN
  -- Handle null or empty names
  IF name IS NULL OR trim(name) = '' OR trim(name) = 'null' THEN
    RETURN 'Ukendt kunde';
  END IF;
  
  -- Clean up specific problematic names
  RETURN CASE trim(name)
    WHEN 'Test' THEN 'Test Kunde'
    WHEN 'Jakob' THEN 'Jakob Andersen'
    WHEN 'GHL Testkunde' THEN 'GHL Test Kunde'
    WHEN 'Kunde' THEN 'Ukendt kunde'
    ELSE trim(name)
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to format order lines automatically
CREATE OR REPLACE FUNCTION format_order_lines(lines_json jsonb)
RETURNS jsonb AS $$
DECLARE
  line_item jsonb;
  formatted_lines jsonb := '[]'::jsonb;
  new_line jsonb;
  item_name text;
  qty_value int;
  price_value numeric;
BEGIN
  -- Handle null or empty lines
  IF lines_json IS NULL OR jsonb_array_length(lines_json) = 0 THEN
    RETURN '[]'::jsonb;
  END IF;
  
  -- Process each line item
  FOR line_item IN SELECT * FROM jsonb_array_elements(lines_json)
  LOOP
    -- Handle half-half pizzas
    IF line_item ? 'type' AND line_item->>'type' = 'pizza_half_half' THEN
      new_line := line_item;
      
      -- Ensure display field exists
      IF NOT (new_line ? 'display') THEN
        new_line := new_line || jsonb_build_object(
          'display', 
          '½ ' || COALESCE(new_line->'left'->>'name', 'Ukendt') || 
          ' + ½ ' || COALESCE(new_line->'right'->>'name', 'Ukendt')
        );
      END IF;
      
    ELSE
      -- Standard line item processing
      
      -- Get quantity (handle both 'qty' and 'quantity')
      qty_value := COALESCE(
        (line_item->>'qty')::int,
        (line_item->>'quantity')::int,
        1
      );
      
      -- Get price (handle multiple price fields)
      price_value := COALESCE(
        (line_item->>'price')::numeric,
        (line_item->>'price_dkk')::numeric,
        0
      );
      
      -- Get item name (prioritize existing name, then map from menu_no)
      item_name := COALESCE(
        NULLIF(trim(line_item->>'name'), ''),
        get_menu_item_name(line_item->>'menu_no'),
        'Ukendt vare'
      );
      
      -- Build new line object
      new_line := jsonb_build_object(
        'qty', qty_value,
        'name', item_name,
        'price', price_value
      );
      
      -- Add menu_no if available
      IF line_item ? 'menu_no' AND line_item->>'menu_no' != '' THEN
        new_line := new_line || jsonb_build_object('menu_no', line_item->>'menu_no');
      END IF;
      
      -- Handle modifiers (support both 'modifiers' and 'mods')
      IF line_item ? 'modifiers' AND jsonb_array_length(line_item->'modifiers') > 0 THEN
        new_line := new_line || jsonb_build_object('modifiers', line_item->'modifiers');
      ELSIF line_item ? 'mods' AND jsonb_array_length(line_item->'mods') > 0 THEN
        -- Convert old 'mods' format to 'modifiers'
        new_line := new_line || jsonb_build_object(
          'modifiers',
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'action', 'add',
                'item', mod_item,
                'price_delta', 0
              )
            )
            FROM jsonb_array_elements_text(line_item->'mods') AS mod_item
          )
        );
      END IF;
    END IF;
    
    -- Add formatted line to array
    formatted_lines := formatted_lines || new_line;
  END LOOP;
  
  RETURN formatted_lines;
END;
$$ LANGUAGE plpgsql;

-- Function to clean address data
CREATE OR REPLACE FUNCTION clean_address_data(
  address_val text,
  street_val text,
  number_val text,
  floor_val text,
  door_val text,
  staircase_val text,
  postcode_val text,
  city_val text
)
RETURNS TABLE (
  clean_address text,
  clean_street text,
  clean_number text,
  clean_floor text,
  clean_door text,
  clean_staircase text,
  clean_postcode text,
  clean_city text
) AS $$
BEGIN
  -- Clean template placeholders
  clean_address := CASE 
    WHEN address_val LIKE '%{{%' OR address_val = 'null' THEN NULL
    ELSE address_val 
  END;
  
  clean_street := CASE 
    WHEN street_val LIKE '%{{%' OR street_val = 'null' THEN NULL
    ELSE street_val 
  END;
  
  clean_number := CASE 
    WHEN number_val LIKE '%{{%' OR number_val = 'null' THEN NULL
    ELSE number_val 
  END;
  
  clean_floor := CASE 
    WHEN floor_val LIKE '%{{%' OR floor_val = 'null' THEN NULL
    ELSE floor_val 
  END;
  
  clean_door := CASE 
    WHEN door_val LIKE '%{{%' OR door_val = 'null' THEN NULL
    ELSE door_val 
  END;
  
  clean_staircase := CASE 
    WHEN staircase_val LIKE '%{{%' OR staircase_val = 'null' THEN NULL
    ELSE staircase_val 
  END;
  
  clean_postcode := CASE 
    WHEN postcode_val LIKE '%{{%' OR postcode_val = 'null' THEN NULL
    ELSE postcode_val 
  END;
  
  clean_city := CASE 
    WHEN city_val LIKE '%{{%' OR city_val = 'null' THEN NULL
    ELSE city_val 
  END;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Main trigger function to format orders automatically
CREATE OR REPLACE FUNCTION format_order_on_insert_update()
RETURNS TRIGGER AS $$
DECLARE
  cleaned_address_data RECORD;
BEGIN
  -- Clean customer name
  NEW.customer_name := clean_customer_name(NEW.customer_name);
  
  -- Format order lines
  IF NEW.lines IS NOT NULL THEN
    NEW.lines := format_order_lines(NEW.lines::jsonb);
  END IF;
  
  -- Clean notes and allergies
  NEW.notes := CASE 
    WHEN NEW.notes LIKE '%{{%' OR NEW.notes = 'null' THEN NULL
    ELSE NEW.notes 
  END;
  
  NEW.allergies := CASE 
    WHEN NEW.allergies LIKE '%{{%' OR NEW.allergies = 'null' OR NEW.allergies = '' THEN 'Ingen'
    ELSE NEW.allergies 
  END;
  
  -- Clean address data
  SELECT * INTO cleaned_address_data FROM clean_address_data(
    NEW.address,
    NEW.address_street,
    NEW.address_number,
    NEW.address_floor,
    NEW.address_door,
    NEW.address_staircase,
    NEW.address_postcode,
    NEW.address_city
  );
  
  NEW.address := cleaned_address_data.clean_address;
  NEW.address_street := cleaned_address_data.clean_street;
  NEW.address_number := cleaned_address_data.clean_number;
  NEW.address_floor := cleaned_address_data.clean_floor;
  NEW.address_door := cleaned_address_data.clean_door;
  NEW.address_staircase := cleaned_address_data.clean_staircase;
  NEW.address_postcode := cleaned_address_data.clean_postcode;
  NEW.address_city := cleaned_address_data.clean_city;
  
  -- Ensure proper status and type defaults
  IF NEW.status IS NULL OR NEW.status = '' THEN
    NEW.status := 'new';
  END IF;
  
  IF NEW.type IS NULL OR NEW.type = '' THEN
    NEW.type := 'pickup';
  END IF;
  
  -- Set revision to 0 if null
  IF NEW.revision IS NULL THEN
    NEW.revision := 0;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic formatting on INSERT and UPDATE
DROP TRIGGER IF EXISTS format_order_trigger ON orders;
CREATE TRIGGER format_order_trigger
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION format_order_on_insert_update();

-- Update existing problematic orders immediately
UPDATE orders 
SET 
  customer_name = clean_customer_name(customer_name),
  lines = format_order_lines(lines::jsonb),
  notes = CASE 
    WHEN notes LIKE '%{{%' OR notes = 'null' THEN NULL
    ELSE notes 
  END,
  allergies = CASE 
    WHEN allergies LIKE '%{{%' OR allergies = 'null' OR allergies = '' THEN 'Ingen'
    ELSE allergies 
  END
WHERE 
  customer_name LIKE '%{{%' 
  OR customer_name IN ('Test', 'Jakob', 'Kunde', 'GHL Testkunde')
  OR notes LIKE '%{{%'
  OR allergies LIKE '%{{%'
  OR lines::text LIKE '%"name":"""%'
  OR lines::text LIKE '%quantity%'
  OR lines::text LIKE '%price_dkk%';

-- Fix specific problematic orders from the CSV data
UPDATE orders 
SET 
  customer_name = 'Jakob Andersen',
  address = 'Stengade 10, 3000 Helsingør',
  address_street = 'Stengade',
  address_number = '10',
  address_postcode = '3000',
  address_city = 'Helsingør'
WHERE customer_name = 'Jakob' AND address LIKE '%"street":"Stengade"%';

UPDATE orders 
SET customer_name = 'Test Kunde'
WHERE customer_name = 'Test' AND source = 'vapi';

UPDATE orders 
SET customer_name = 'Ukendt kunde'
WHERE customer_name = 'Kunde';

-- Clean up template addresses
UPDATE orders 
SET 
  address = 'Ukendt adresse',
  address_street = NULL,
  address_number = NULL,
  address_floor = NULL,
  address_door = NULL,
  address_staircase = NULL,
  address_postcode = NULL,
  address_city = NULL
WHERE address LIKE '%{{canonical%' OR address_street LIKE '%{{%';

-- Add helpful comment for future reference
COMMENT ON FUNCTION format_order_on_insert_update() IS 'Automatically formats all incoming orders to ensure consistent data quality and prevent "ukendt vare" issues';
COMMENT ON FUNCTION get_menu_item_name(text) IS 'Maps menu numbers to proper item names for La Castello menu';
COMMENT ON FUNCTION format_order_lines(jsonb) IS 'Standardizes order line format and ensures all items have proper names';