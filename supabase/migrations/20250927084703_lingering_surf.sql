/*
  # Fix address table access policies

  1. Security Updates
    - Add proper RLS policies for streets table
    - Add proper RLS policies for delivery_zips table  
    - Add proper RLS policies for pickup_windows table
    - Add proper RLS policies for menu_items table
    - Ensure all tables have appropriate access for both anon and authenticated users

  2. Tables Updated
    - `streets` - Enable read access for address lookups
    - `delivery_zips` - Enable read access for delivery validation
    - `pickup_windows` - Enable read access for pickup time calculations
    - `menu_items` - Enable read access for menu display
*/

-- Streets table policies
DROP POLICY IF EXISTS "streets_select_all" ON public.streets;
DROP POLICY IF EXISTS "streets_read_all" ON public.streets;

CREATE POLICY "streets_select_all" 
ON public.streets 
FOR SELECT 
TO anon, authenticated 
USING (true);

-- Delivery zips policies  
DROP POLICY IF EXISTS "delivery_zips_select_all" ON public.delivery_zips;
DROP POLICY IF EXISTS "delivery_zips_read_all" ON public.delivery_zips;

CREATE POLICY "delivery_zips_select_all" 
ON public.delivery_zips 
FOR SELECT 
TO anon, authenticated 
USING (true);

-- Pickup windows policies
DROP POLICY IF EXISTS "pickup_windows_select_all" ON public.pickup_windows;
DROP POLICY IF EXISTS "pickup_windows_read_all" ON public.pickup_windows;

CREATE POLICY "pickup_windows_select_all" 
ON public.pickup_windows 
FOR SELECT 
TO anon, authenticated 
USING (true);

-- Menu items policies (already has service_role policy, add anon/authenticated)
DROP POLICY IF EXISTS "menu_items_select_all" ON public.menu_items;
DROP POLICY IF EXISTS "menu_items_read_all" ON public.menu_items;

CREATE POLICY "menu_items_select_all" 
ON public.menu_items 
FOR SELECT 
TO anon, authenticated 
USING (true);

-- Menu addons policies
DROP POLICY IF EXISTS "menu_addons_select_all" ON public.menu_addons;
DROP POLICY IF EXISTS "menu_addons_read_all" ON public.menu_addons;

CREATE POLICY "menu_addons_select_all" 
ON public.menu_addons 
FOR SELECT 
TO anon, authenticated 
USING (true);

-- Pickup policy table
DROP POLICY IF EXISTS "pickup_policy_select_all" ON public.pickup_policy;
DROP POLICY IF EXISTS "pickup_policy_read_all" ON public.pickup_policy;

CREATE POLICY "pickup_policy_select_all" 
ON public.pickup_policy 
FOR SELECT 
TO anon, authenticated 
USING (true);

-- Delivery policy table  
DROP POLICY IF EXISTS "delivery_policy_select_all" ON public.delivery_policy;
DROP POLICY IF EXISTS "delivery_policy_read_all" ON public.delivery_policy;

CREATE POLICY "delivery_policy_select_all" 
ON public.delivery_policy 
FOR SELECT 
TO anon, authenticated 
USING (true);