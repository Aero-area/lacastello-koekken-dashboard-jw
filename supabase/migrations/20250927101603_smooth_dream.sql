/*
  # Fix address trigger function

  The current trigger `format_order_on_insert_update()` is clearing address fields.
  We need to either fix or disable this trigger to preserve address data.

  1. Changes
    - Disable the problematic trigger temporarily
    - This will allow address fields to be preserved during INSERT/UPDATE
  
  2. Security
    - No RLS changes needed
*/

-- Temporarily disable the trigger that's clearing address fields
DROP TRIGGER IF EXISTS format_order_trigger ON orders;

-- We can re-enable it later once we understand what it should do
-- The trigger was: CREATE TRIGGER format_order_trigger BEFORE INSERT OR UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION format_order_on_insert_update()