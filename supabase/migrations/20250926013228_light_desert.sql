/*
  # Fix address storage and parsing

  1. Database Changes
    - Add individual address columns if they don't exist
    - Create function to parse JSON addresses and populate individual columns
    - Update existing orders with parsed address data

  2. Data Migration
    - Parse existing JSON addresses into individual columns
    - Ensure proper address formatting for display
*/

-- Add individual address columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'address_street'
  ) THEN
    ALTER TABLE orders ADD COLUMN address_street text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'address_number'
  ) THEN
    ALTER TABLE orders ADD COLUMN address_number text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'address_floor'
  ) THEN
    ALTER TABLE orders ADD COLUMN address_floor text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'address_door'
  ) THEN
    ALTER TABLE orders ADD COLUMN address_door text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'address_staircase'
  ) THEN
    ALTER TABLE orders ADD COLUMN address_staircase text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'address_postcode'
  ) THEN
    ALTER TABLE orders ADD COLUMN address_postcode text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'address_city'
  ) THEN
    ALTER TABLE orders ADD COLUMN address_city text;
  END IF;
END $$;

-- Create function to parse JSON addresses
CREATE OR REPLACE FUNCTION parse_json_address(address_json text)
RETURNS TABLE (
  street text,
  number text,
  floor text,
  door text,
  staircase text,
  postcode text,
  city text
) AS $$
BEGIN
  -- Try to parse JSON address
  BEGIN
    IF address_json IS NOT NULL AND address_json != '' AND address_json LIKE '{%}' THEN
      RETURN QUERY
      SELECT 
        (address_json::json->>'street')::text,
        (address_json::json->>'number')::text,
        (address_json::json->>'floor')::text,
        (address_json::json->>'door')::text,
        (address_json::json->>'staircase')::text,
        (address_json::json->>'zip')::text,
        (address_json::json->>'city')::text;
    ELSE
      -- Return nulls if not valid JSON
      RETURN QUERY SELECT NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Return nulls if JSON parsing fails
    RETURN QUERY SELECT NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text;
  END;
END;
$$ LANGUAGE plpgsql;

-- Update existing orders with parsed address data
UPDATE orders 
SET 
  address_street = parsed.street,
  address_number = parsed.number,
  address_floor = parsed.floor,
  address_door = parsed.door,
  address_staircase = parsed.staircase,
  address_postcode = parsed.postcode,
  address_city = parsed.city
FROM (
  SELECT 
    id,
    (SELECT street FROM parse_json_address(address)) as street,
    (SELECT number FROM parse_json_address(address)) as number,
    (SELECT floor FROM parse_json_address(address)) as floor,
    (SELECT door FROM parse_json_address(address)) as door,
    (SELECT staircase FROM parse_json_address(address)) as staircase,
    (SELECT postcode FROM parse_json_address(address)) as postcode,
    (SELECT city FROM parse_json_address(address)) as city
  FROM orders 
  WHERE address IS NOT NULL 
    AND address != ''
    AND address LIKE '{%}'
    AND (address_street IS NULL OR address_street = '')
) as parsed
WHERE orders.id = parsed.id;

-- Clean up function
DROP FUNCTION IF EXISTS parse_json_address(text);