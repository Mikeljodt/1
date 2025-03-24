-- MIGRATION 003: ROW LEVEL SECURITY
-- Implements row-level security policies for all tables

-- Enable RLS on all tables
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installation_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installation_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spare_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_spare_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_profile ENABLE ROW LEVEL SECURITY;

-- Create policies for clients table
CREATE POLICY "Clients are viewable by authenticated users" 
ON public.clients FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Clients are insertable by admins" 
ON public.clients FOR INSERT 
TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "Clients are updatable by admins" 
ON public.clients FOR UPDATE
TO authenticated
USING (is_admin());

CREATE POLICY "Clients are deletable by admins" 
ON public.clients FOR DELETE
TO authenticated
USING (is_admin());

-- Create policies for machines table
CREATE POLICY "Machines are viewable by authenticated users" 
ON public.machines FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Machines are insertable by admins" 
ON public.machines FOR INSERT 
TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "Machines are updatable by admins" 
ON public.machines FOR UPDATE
TO authenticated
USING (is_admin());

CREATE POLICY "Machines are deletable by admins" 
ON public.machines FOR DELETE
TO authenticated
USING (is_admin());

-- Create policies for machine_history table
CREATE POLICY "Machine history is viewable by authenticated users" 
ON public.machine_history FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Machine history is insertable by authenticated users" 
ON public.machine_history FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Machine history is not updatable" 
ON public.machine_history FOR UPDATE
TO authenticated
USING (false);

CREATE POLICY "Machine history is deletable by admins" 
ON public.machine_history FOR DELETE
TO authenticated
USING (is_admin());

-- Create policies for installation_data table
CREATE POLICY "Installation data is viewable by authenticated users" 
ON public.installation_data FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Installation data is insertable by authenticated users" 
ON public.installation_data FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Installation data is updatable by authenticated users" 
ON public.installation_data FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Installation data is deletable by admins" 
ON public.installation_data FOR DELETE
TO authenticated
USING (is_admin());

-- Create policies for installation_photos table
CREATE POLICY "Installation photos are viewable by authenticated users" 
ON public.installation_photos FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Installation photos are insertable by authenticated users" 
ON public.installation_photos FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Installation photos are not updatable" 
ON public.installation_photos FOR UPDATE
TO authenticated
USING (false);

CREATE POLICY "Installation photos are deletable by admins or creator" 
ON public.installation_photos FOR DELETE
TO authenticated
USING (is_admin());

-- Create policies for collections table
CREATE POLICY "Collections are viewable by authenticated users" 
ON public.collections FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Collections are insertable by authenticated users" 
ON public.collections FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Collections are not updatable" 
ON public.collections FOR UPDATE
TO authenticated
USING (false);

CREATE POLICY "Collections are deletable by admins" 
ON public.collections FOR DELETE
TO authenticated
USING (is_admin());

-- Create policies for expenses table
CREATE POLICY "Expenses are viewable by authenticated users" 
ON public.expenses FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Expenses are insertable by authenticated users" 
ON public.expenses FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Expenses are updatable by admins" 
ON public.expenses FOR UPDATE
TO authenticated
USING (is_admin());

CREATE POLICY "Expenses are deletable by admins" 
ON public.expenses FOR DELETE
TO authenticated
USING (is_admin());

-- Create policies for spare_parts table
CREATE POLICY "Spare parts are viewable by authenticated users" 
ON public.spare_parts FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Spare parts are insertable by admins" 
ON public.spare_parts FOR INSERT 
TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "Spare parts are updatable by admins" 
ON public.spare_parts FOR UPDATE
TO authenticated
USING (is_admin());

CREATE POLICY "Spare parts are deletable by admins" 
ON public.spare_parts FOR DELETE
TO authenticated
USING (is_admin());

-- Create policies for maintenance table
CREATE POLICY "Maintenance is viewable by authenticated users" 
ON public.maintenance FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Maintenance is insertable by authenticated users" 
ON public.maintenance FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Maintenance is updatable by authenticated users" 
ON public.maintenance FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Maintenance is deletable by admins" 
ON public.maintenance FOR DELETE
TO authenticated
USING (is_admin());

-- Create policies for maintenance_spare_parts table
CREATE POLICY "Maintenance spare parts are viewable by authenticated users" 
ON public.maintenance_spare_parts FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Maintenance spare parts are insertable by authenticated users" 
ON public.maintenance_spare_parts FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Maintenance spare parts are updatable by authenticated users" 
ON public.maintenance_spare_parts FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Maintenance spare parts are deletable by admins" 
ON public.maintenance_spare_parts FOR DELETE
TO authenticated
USING (is_admin());

-- Create policies for payments table
CREATE POLICY "Payments are viewable by authenticated users" 
ON public.payments FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Payments are insertable by authenticated users" 
ON public.payments FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Payments are not updatable" 
ON public.payments FOR UPDATE
TO authenticated
USING (false);

CREATE POLICY "Payments are deletable by admins" 
ON public.payments FOR DELETE
TO authenticated
USING (is_admin());

-- Create policies for company_profile table
CREATE POLICY "Company profile is viewable by authenticated users" 
ON public.company_profile FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Company profile is editable by admins" 
ON public.company_profile FOR ALL
TO authenticated
USING (is_admin());
