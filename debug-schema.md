# Database Schema Analysis

Looking at the database schema, I can see:

## Orders Table Columns:
- `address` (text, nullable)
- `address_street` (text, nullable) 
- `address_number` (text, nullable)
- `address_floor` (text, nullable)
- `address_door` (text, nullable)
- `address_staircase` (text, nullable)
- `address_postcode` (text, nullable)
- `address_city` (text, nullable)

## Triggers on Orders Table:
1. **"Make.com Ny Ordre"** - HTTP trigger to external webhook
2. **"format_order_trigger"** - BEFORE INSERT OR UPDATE trigger that calls `format_order_on_insert_update()`

## The Problem:
The `format_order_trigger` might be modifying or clearing address data during INSERT/UPDATE operations!

This trigger function `format_order_on_insert_update()` could be:
- Overwriting address fields
- Setting them to NULL
- Reformatting the data incorrectly

## Next Steps:
1. Check what the `format_order_on_insert_update()` function does
2. Temporarily disable the trigger to test
3. Fix the function if it's causing issues