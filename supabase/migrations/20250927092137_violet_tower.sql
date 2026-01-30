/*
  # Debug address columns in orders table

  1. Investigation
    - Check if address columns exist in orders table
    - Verify column names and types
    - Ensure all address fields are properly defined

  2. Fix Missing Columns
    - Add any missing address columns if they don't exist
    - Ensure proper data types and constraints

  3. Security
    - Maintain existing RLS policies
*/

-- Check if address columns exist and add them if missing
DO $$
BEGIN
  -- Check and add address_street column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'address_street'
  ) THEN
    ALTER TABLE orders ADD COLUMN address_street text;
  END IF;

  -- Check and add address_number column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'address_number'
  ) THEN
    ALTER TABLE orders ADD COLUMN address_number text;
  END IF;

  -- Check and add address_floor column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'address_floor'
  ) THEN
    ALTER TABLE orders ADD COLUMN address_floor text;
  END IF;

  -- Check and add address_door column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'address_door'
  ) THEN
    ALTER TABLE orders ADD COLUMN address_door text;
  END IF;

  -- Check and add address_staircase column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'address_staircase'
  ) THEN
    ALTER TABLE orders ADD COLUMN address_staircase text;
  END IF;

  -- Check and add address_postcode column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'address_postcode'
  ) THEN
    ALTER TABLE orders ADD COLUMN address_postcode text;
  END IF;

  -- Check and add address_city column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'address_city'
  ) THEN
    ALTER TABLE orders ADD COLUMN address_city text;
  END IF;
END $$;