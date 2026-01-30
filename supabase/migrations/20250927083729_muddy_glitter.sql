/*
  # Clear all orders and address data

  1. Data Cleanup
    - Delete all existing orders from the orders table
    - Clear all address-related data from streets table
    - Reset any related audit logs in order_events table
  
  2. Fresh Start
    - Provides clean slate for new order data
    - Maintains table structure and policies
    - Preserves all triggers and functions
*/

-- Clear all order events first (due to foreign key constraint)
DELETE FROM order_events;

-- Clear all orders
DELETE FROM orders;

-- Clear all street/address data
DELETE FROM streets;

-- Reset sequences if they exist
DO $$
BEGIN
  -- Reset order_events sequence if it exists
  IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'order_events_id_seq') THEN
    ALTER SEQUENCE order_events_id_seq RESTART WITH 1;
  END IF;
  
  -- Reset streets sequence if it exists
  IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'streets_id_seq') THEN
    ALTER SEQUENCE streets_id_seq RESTART WITH 1;
  END IF;
END $$;