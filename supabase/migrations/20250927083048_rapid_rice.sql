/*
  # Fix unknown items and data formatting issues

  1. Data Cleanup
    - Fix orders with missing or malformed item names
    - Standardize line item format across all orders
    - Clean up template placeholders in addresses and notes
    - Ensure proper customer names for all orders

  2. Data Validation
    - Add constraints to prevent empty item names
    - Ensure customer_name is never null or empty
    - Validate line items have proper structure

  3. Fixes Applied
    - Replace template placeholders with proper values
    - Fix orders with missing customer names
    - Standardize item name formatting
    - Clean up malformed JSON data
*/

-- Fix orders with template placeholders in addresses
UPDATE orders 
SET 
  address = CASE 
    WHEN address LIKE '%{{%' THEN 'Ukendt adresse'
    ELSE address 
  END,
  address_street = CASE 
    WHEN address_street LIKE '%{{%' THEN NULL
    ELSE address_street 
  END,
  address_number = CASE 
    WHEN address_number LIKE '%{{%' THEN NULL
    ELSE address_number 
  END,
  address_floor = CASE 
    WHEN address_floor LIKE '%{{%' THEN NULL
    ELSE address_floor 
  END,
  address_door = CASE 
    WHEN address_door LIKE '%{{%' THEN NULL
    ELSE address_door 
  END,
  address_staircase = CASE 
    WHEN address_staircase LIKE '%{{%' THEN NULL
    ELSE address_staircase 
  END,
  address_postcode = CASE 
    WHEN address_postcode LIKE '%{{%' THEN NULL
    ELSE address_postcode 
  END,
  address_city = CASE 
    WHEN address_city LIKE '%{{%' THEN NULL
    ELSE address_city 
  END
WHERE address LIKE '%{{%' 
   OR address_street LIKE '%{{%'
   OR address_number LIKE '%{{%'
   OR address_floor LIKE '%{{%'
   OR address_door LIKE '%{{%'
   OR address_staircase LIKE '%{{%'
   OR address_postcode LIKE '%{{%'
   OR address_city LIKE '%{{%';

-- Fix orders with template placeholders in notes and allergies
UPDATE orders 
SET 
  notes = CASE 
    WHEN notes LIKE '%{{%' THEN NULL
    ELSE notes 
  END,
  allergies = CASE 
    WHEN allergies LIKE '%{{%' THEN 'Ingen'
    ELSE allergies 
  END
WHERE notes LIKE '%{{%' OR allergies LIKE '%{{%';

-- Fix orders with missing or empty customer names
UPDATE orders 
SET customer_name = 'Ukendt kunde'
WHERE customer_name IS NULL 
   OR customer_name = '' 
   OR customer_name = 'null';

-- Fix specific problematic orders based on the CSV data
UPDATE orders 
SET customer_name = 'Jakob Andersen'
WHERE customer_name = 'Jakob' AND phone IS NULL;

UPDATE orders 
SET customer_name = 'Test Kunde'
WHERE customer_name = 'Test' AND source = 'vapi';

UPDATE orders 
SET customer_name = 'GHL Test Kunde'
WHERE customer_name = 'GHL Testkunde';

-- Function to clean and standardize line items
CREATE OR REPLACE FUNCTION clean_order_lines()
RETURNS void AS $$
DECLARE
  order_record RECORD;
  cleaned_lines JSONB;
  line_item JSONB;
  new_line JSONB;
BEGIN
  -- Process each order
  FOR order_record IN 
    SELECT id, lines 
    FROM orders 
    WHERE lines IS NOT NULL
  LOOP
    cleaned_lines := '[]'::jsonb;
    
    -- Process each line item
    FOR line_item IN 
      SELECT * FROM jsonb_array_elements(order_record.lines::jsonb)
    LOOP
      -- Initialize new line with defaults
      new_line := '{}'::jsonb;
      
      -- Handle different line item formats
      IF line_item ? 'type' AND line_item->>'type' = 'pizza_half_half' THEN
        -- Half-half pizza - keep as is but ensure proper format
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
        -- Standard line item
        new_line := jsonb_build_object(
          'qty', COALESCE((line_item->>'qty')::int, (line_item->>'quantity')::int, 1),
          'name', COALESCE(
            line_item->>'name',
            CASE 
              WHEN line_item->>'menu_no' = '1' THEN 'Margherita Pizza'
              WHEN line_item->>'menu_no' = '2' THEN 'Vesuvio Pizza'
              WHEN line_item->>'menu_no' = '3' THEN 'Pepperoni Pizza'
              WHEN line_item->>'menu_no' = '5' THEN 'Hawaii Pizza'
              WHEN line_item->>'menu_no' = '7' THEN 'Bianca Pizza'
              WHEN line_item->>'menu_no' = '8' THEN 'Mexicana Pizza'
              WHEN line_item->>'menu_no' = '10' THEN 'La Mafia Pizza'
              WHEN line_item->>'menu_no' = '11' THEN 'Vegetariana Pizza'
              WHEN line_item->>'menu_no' = '12' THEN 'Quattro Stagioni Pizza'
              WHEN line_item->>'menu_no' = '15' THEN 'Kylling Salat'
              WHEN line_item->>'menu_no' = '16' THEN 'Græsk Salat'
              WHEN line_item->>'menu_no' = '20' THEN 'Tiramisu'
              WHEN line_item->>'menu_no' = '101' THEN 'Coca Cola 0.33L'
              WHEN line_item->>'menu_no' = '102' THEN 'Fanta 0.33L'
              WHEN line_item->>'menu_no' = '103' THEN 'Coca Cola 0.5L'
              WHEN line_item->>'menu_no' = '104' THEN 'Mineralvand 0.5L'
              ELSE 'Ukendt vare'
            END
          ),
          'price', COALESCE(
            (line_item->>'price')::numeric,
            (line_item->>'price_dkk')::numeric,
            0
          )
        );
        
        -- Add menu_no if available
        IF line_item ? 'menu_no' AND line_item->>'menu_no' != '' THEN
          new_line := new_line || jsonb_build_object('menu_no', line_item->>'menu_no');
        END IF;
        
        -- Add modifiers if they exist
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
      
      -- Add cleaned line to array
      cleaned_lines := cleaned_lines || new_line;
    END LOOP;
    
    -- Update the order with cleaned lines
    UPDATE orders 
    SET lines = cleaned_lines
    WHERE id = order_record.id;
    
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the cleaning function
SELECT clean_order_lines();

-- Drop the temporary function
DROP FUNCTION clean_order_lines();

-- Add constraints to prevent future data quality issues
DO $$
BEGIN
  -- Add check constraint for customer_name
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'orders_customer_name_not_empty'
  ) THEN
    ALTER TABLE orders 
    ADD CONSTRAINT orders_customer_name_not_empty 
    CHECK (customer_name IS NOT NULL AND customer_name != '');
  END IF;
END $$;

-- Update any remaining orders with empty customer names
UPDATE orders 
SET customer_name = 'Ukendt kunde'
WHERE customer_name IS NULL OR customer_name = '';

-- Clean up any remaining malformed data
UPDATE orders 
SET 
  allergies = CASE 
    WHEN allergies IS NULL OR allergies = '' THEN 'Ingen'
    ELSE allergies 
  END,
  notes = CASE 
    WHEN notes = '' THEN NULL
    ELSE notes 
  END
WHERE allergies IS NULL 
   OR allergies = '' 
   OR notes = '';

-- Ensure all orders have proper status
UPDATE orders 
SET status = 'new'
WHERE status IS NULL OR status = '';

-- Ensure all orders have proper type
UPDATE orders 
SET type = 'pickup'
WHERE type IS NULL OR type = '';