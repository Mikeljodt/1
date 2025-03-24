-- MIGRATION 005: ADD CREATED_BY FIELDS
-- Adds created_by tracking to relevant tables for accountability

-- Add created_by column to tables that need ownership tracking
ALTER TABLE public.collections ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE public.maintenance ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE public.maintenance_spare_parts ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE public.installation_data ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE public.installation_photos ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE public.machine_history ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Create indexes on created_by columns for faster ownership queries
CREATE INDEX IF NOT EXISTS idx_collections_created_by ON public.collections(created_by);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON public.expenses(created_by);
CREATE INDEX IF NOT EXISTS idx_maintenance_created_by ON public.maintenance(created_by);
CREATE INDEX IF NOT EXISTS idx_installation_data_created_by ON public.installation_data(created_by);
CREATE INDEX IF NOT EXISTS idx_payments_created_by ON public.payments(created_by);
CREATE INDEX IF NOT EXISTS idx_machine_history_created_by ON public.machine_history(created_by);

-- Update RLS policies to allow users to modify their own created content
CREATE POLICY "Collections are updatable by admins or creators" 
ON public.collections FOR UPDATE
TO authenticated
USING (
  is_admin() OR created_by = auth.uid()
)
WITH CHECK (
  is_admin() OR created_by = auth.uid()
);

CREATE POLICY "Expenses are updatable by admins or creators" 
ON public.expenses FOR UPDATE
TO authenticated
USING (
  is_admin() OR created_by = auth.uid()
)
WITH CHECK (
  is_admin() OR created_by = auth.uid()
);

CREATE POLICY "Maintenance is updatable by admins or creators" 
ON public.maintenance FOR UPDATE
TO authenticated
USING (
  is_admin() OR created_by = auth.uid()
)
WITH CHECK (
  is_admin() OR created_by = auth.uid()
);

CREATE POLICY "Installation data is updatable by admins or creators" 
ON public.installation_data FOR UPDATE
TO authenticated
USING (
  is_admin() OR created_by = auth.uid()
)
WITH CHECK (
  is_admin() OR created_by = auth.uid()
);

CREATE POLICY "Payments are updatable by admins or creators" 
ON public.payments FOR UPDATE
TO authenticated
USING (
  is_admin() OR created_by = auth.uid()
)
WITH CHECK (
  is_admin() OR created_by = auth.uid()
);

CREATE POLICY "Machine history is updatable by admins or creators" 
ON public.machine_history FOR UPDATE
TO authenticated
USING (
  is_admin() OR created_by = auth.uid()
)
WITH CHECK (
  is_admin() OR created_by = auth.uid()
);

-- Allow users to delete their own content (if needed for specific business requirements)
CREATE POLICY "Collections are deletable by admins or creators" 
ON public.collections FOR DELETE
TO authenticated
USING (
  is_admin() OR created_by = auth.uid()
);

CREATE POLICY "Installation photos are deletable by admins or creators" 
ON public.installation_photos FOR DELETE
TO authenticated
USING (
  is_admin() OR created_by = auth.uid()
);

CREATE POLICY "Machine history is deletable by admins or creators" 
ON public.machine_history FOR DELETE
TO authenticated
USING (
  is_admin() OR created_by = auth.uid()
);
