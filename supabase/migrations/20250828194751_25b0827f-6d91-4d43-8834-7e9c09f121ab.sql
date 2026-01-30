-- Remove the insecure order_preview view that bypasses RLS
-- This fixes the Security Definer View security issue
DROP VIEW IF EXISTS public.order_preview;