-- MIGRATION 006: SCHEMA MIGRATIONS RLS
-- Enables Row Level Security on the schema_migrations table and creates appropriate policies

-- Enable RLS on schema_migrations table
ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;

-- Create policies for schema_migrations table
-- Only administrators should be able to view migration history
DROP POLICY IF EXISTS "Schema migrations are viewable by admins" ON public.schema_migrations;
CREATE POLICY "Schema migrations are viewable by admins" 
ON public.schema_migrations FOR SELECT 
TO authenticated
USING (is_admin());

-- Only administrators should be able to insert new migrations
DROP POLICY IF EXISTS "Schema migrations are insertable by admins" ON public.schema_migrations;
CREATE POLICY "Schema migrations are insertable by admins" 
ON public.schema_migrations FOR INSERT 
TO authenticated
WITH CHECK (is_admin());

-- Only administrators should be able to update migrations
DROP POLICY IF EXISTS "Schema migrations are updatable by admins" ON public.schema_migrations;
CREATE POLICY "Schema migrations are updatable by admins" 
ON public.schema_migrations FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Only administrators should be able to delete migrations
DROP POLICY IF EXISTS "Schema migrations are deletable by admins" ON public.schema_migrations;
CREATE POLICY "Schema migrations are deletable by admins" 
ON public.schema_migrations FOR DELETE
TO authenticated
USING (is_admin());

-- Add this migration to the schema_migrations table (requires superuser privileges)
-- This statement may fail in environments where you don't have superuser access
-- If it fails, you'll need to run it manually as a superuser
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_roles 
    WHERE rolname = current_user 
    AND rolsuper
  ) THEN
    INSERT INTO public.schema_migrations (version, description) 
    VALUES ('006', 'Enable RLS on schema_migrations table')
    ON CONFLICT (version) DO NOTHING;
  END IF;
END
$$;
