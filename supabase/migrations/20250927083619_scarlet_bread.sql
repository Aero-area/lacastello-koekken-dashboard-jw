/*
  # Fix RLS policies for orders table

  1. Security Changes
    - Drop existing conflicting policies
    - Create proper RLS policies for authenticated and anon users
    - Ensure orders can be read by both authenticated and anon users
    - Maintain security while allowing necessary access

  2. Policy Structure
    - Allow anon users to read orders (for public dashboard access)
    - Allow authenticated users full CRUD access
    - Maintain data integrity and security
*/

-- Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "authenticated_users_can_read_orders" ON public.orders;
DROP POLICY IF EXISTS "authenticated_users_can_insert_orders" ON public.orders;
DROP POLICY IF EXISTS "authenticated_users_can_update_orders" ON public.orders;
DROP POLICY IF EXISTS "authenticated_users_can_delete_orders" ON public.orders;
DROP POLICY IF EXISTS "orders_select_authenticated" ON public.orders;
DROP POLICY IF EXISTS "orders_update_status_authenticated" ON public.orders;
DROP POLICY IF EXISTS "kitchen full" ON public.orders;
DROP POLICY IF EXISTS "orders_read_all" ON public.orders;
DROP POLICY IF EXISTS "orders_write_all" ON public.orders;
DROP POLICY IF EXISTS "orders_update_all" ON public.orders;
DROP POLICY IF EXISTS "read orders (anon)" ON public.orders;

-- Create new comprehensive policies
CREATE POLICY "orders_select_all" 
ON public.orders 
FOR SELECT 
TO anon, authenticated 
USING (true);

CREATE POLICY "orders_insert_authenticated" 
ON public.orders 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "orders_update_authenticated" 
ON public.orders 
FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "orders_delete_authenticated" 
ON public.orders 
FOR DELETE 
TO authenticated 
USING (true);