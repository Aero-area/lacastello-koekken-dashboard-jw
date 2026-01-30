-- Fix critical security issue: Restrict orders access to authenticated users only
-- Remove overly permissive policies that allow public access to customer data

-- Drop existing insecure policies
DROP POLICY IF EXISTS "kitchen full" ON public.orders;
DROP POLICY IF EXISTS "orders_read_all" ON public.orders;  
DROP POLICY IF EXISTS "orders_write_all" ON public.orders;
DROP POLICY IF EXISTS "orders_update_all" ON public.orders;
DROP POLICY IF EXISTS "read orders (anon)" ON public.orders;

-- Create secure policies that require authentication
CREATE POLICY "authenticated_users_can_read_orders" 
ON public.orders 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "authenticated_users_can_insert_orders" 
ON public.orders 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "authenticated_users_can_update_orders" 
ON public.orders 
FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "authenticated_users_can_delete_orders" 
ON public.orders 
FOR DELETE 
TO authenticated 
USING (true);