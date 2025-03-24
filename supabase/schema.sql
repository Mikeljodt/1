-- REKREATIV DATABASE SCHEMA
-- This schema defines all tables, relationships, RLS policies and indexes
-- for the business management system

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Set up auth schema for custom auth functionality
CREATE SCHEMA IF NOT EXISTS auth;
GRANT USAGE ON SCHEMA auth TO service_role;
GRANT ALL ON SCHEMA auth TO postgres;

-- Create custom types
CREATE TYPE machine_status AS ENUM ('warehouse', 'installed', 'repair');
CREATE TYPE maintenance_type AS ENUM ('preventive', 'corrective');
CREATE TYPE maintenance_status AS ENUM ('pending', 'in-progress', 'completed');
CREATE TYPE user_role AS ENUM ('admin', 'technician');

-- ===========================================
-- TABLE DEFINITIONS
-- ===========================================

-- Clients table
CREATE TABLE public.clients (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  business_type TEXT,
  owner TEXT,
  address TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  phone TEXT,
  email TEXT,
  tax_id TEXT,
  morning_open_time TEXT,
  morning_close_time TEXT,
  evening_open_time TEXT,
  evening_close_time TEXT,
  closing_day TEXT,
  machines INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create index on client name for faster searches
CREATE INDEX idx_clients_name ON public.clients USING GIN (name gin_trgm_ops);

-- Machines table
CREATE TABLE public.machines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  serial_number TEXT NOT NULL,
  type TEXT NOT NULL,
  model TEXT NOT NULL,
  brand TEXT NOT NULL,
  cost DECIMAL(10, 2) NOT NULL,
  purchase_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status machine_status NOT NULL DEFAULT 'warehouse',
  client_id INTEGER REFERENCES public.clients(id) ON DELETE SET NULL,
  current_counter INTEGER NOT NULL DEFAULT 0,
  initial_counter INTEGER NOT NULL DEFAULT 0,
  split_percentage INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  CONSTRAINT serial_number_unique UNIQUE (serial_number)
);

-- Create indexes for machine searches and relationships
CREATE INDEX idx_machines_client_id ON public.machines (client_id);
CREATE INDEX idx_machines_status ON public.machines (status);
CREATE INDEX idx_machines_serial_number ON public.machines (serial_number);

-- Machine History table
CREATE TABLE public.machine_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id UUID REFERENCES public.machines(id) ON DELETE CASCADE NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE INDEX idx_machine_history_machine_id ON public.machine_history (machine_id);

-- Installation Data table
CREATE TABLE public.installation_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id UUID REFERENCES public.machines(id) ON DELETE CASCADE UNIQUE NOT NULL,
  responsible_name TEXT NOT NULL,
  responsible_id TEXT NOT NULL,
  accepted_terms BOOLEAN NOT NULL DEFAULT FALSE,
  accepted_responsibility BOOLEAN NOT NULL DEFAULT FALSE,
  acceptance_date TIMESTAMP WITH TIME ZONE,
  installation_date TIMESTAMP WITH TIME ZONE NOT NULL,
  installation_counter INTEGER NOT NULL DEFAULT 0,
  location TEXT,
  observations TEXT,
  technician TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE INDEX idx_installation_data_machine_id ON public.installation_data (machine_id);

-- Installation Photos table
CREATE TABLE public.installation_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  installation_id UUID REFERENCES public.installation_data(id) ON DELETE CASCADE NOT NULL,
  photo_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE INDEX idx_installation_photos_installation_id ON public.installation_photos (installation_id);

-- Collections table
CREATE TABLE public.collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id UUID REFERENCES public.machines(id) ON DELETE CASCADE NOT NULL,
  client_id INTEGER REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  previous_counter INTEGER NOT NULL,
  current_counter INTEGER NOT NULL,
  notes TEXT,
  ticket_number TEXT,
  invoice_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE INDEX idx_collections_machine_id ON public.collections (machine_id);
CREATE INDEX idx_collections_client_id ON public.collections (client_id);
CREATE INDEX idx_collections_date ON public.collections (date);

-- Expenses table
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id UUID REFERENCES public.machines(id) ON DELETE SET NULL,
  client_id INTEGER REFERENCES public.clients(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  receipt_image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE INDEX idx_expenses_machine_id ON public.expenses (machine_id);
CREATE INDEX idx_expenses_client_id ON public.expenses (client_id);
CREATE INDEX idx_expenses_date ON public.expenses (date);
CREATE INDEX idx_expenses_type ON public.expenses (type);

-- Spare Parts table
CREATE TABLE public.spare_parts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  min_quantity INTEGER NOT NULL DEFAULT 0,
  cost DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE INDEX idx_spare_parts_name ON public.spare_parts USING GIN (name gin_trgm_ops);

-- Maintenance table
CREATE TABLE public.maintenance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id UUID REFERENCES public.machines(id) ON DELETE CASCADE NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  type maintenance_type NOT NULL,
  description TEXT NOT NULL,
  cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
  status maintenance_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE INDEX idx_maintenance_machine_id ON public.maintenance (machine_id);
CREATE INDEX idx_maintenance_date ON public.maintenance (date);
CREATE INDEX idx_maintenance_status ON public.maintenance (status);

-- Maintenance Spare Parts table
CREATE TABLE public.maintenance_spare_parts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  maintenance_id UUID REFERENCES public.maintenance(id) ON DELETE CASCADE NOT NULL,
  spare_part_id UUID REFERENCES public.spare_parts(id) ON DELETE RESTRICT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE INDEX idx_maintenance_spare_parts_maintenance_id ON public.maintenance_spare_parts (maintenance_id);
CREATE INDEX idx_maintenance_spare_parts_spare_part_id ON public.maintenance_spare_parts (spare_part_id);

-- Payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id INTEGER REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  method TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE INDEX idx_payments_client_id ON public.payments (client_id);
CREATE INDEX idx_payments_date ON public.payments (date);

-- Company Profile table
CREATE TABLE public.company_profile (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT,
  tax_id TEXT,
  phone TEXT,
  email TEXT,
  logo TEXT,
  vat_percentage DECIMAL(5, 2) NOT NULL DEFAULT 21.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Custom Users table (extends Supabase auth.users)
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'technician',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE INDEX idx_user_profiles_username ON public.user_profiles (username);

-- ===========================================
-- ROW LEVEL SECURITY POLICIES
-- ===========================================

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
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for clients table
CREATE POLICY "Clients are viewable by authenticated users" 
ON public.clients FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Clients are insertable by admins" 
ON public.clients FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);

CREATE POLICY "Clients are updatable by admins" 
ON public.clients FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);

CREATE POLICY "Clients are deletable by admins" 
ON public.clients FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);

-- Create policies for machines table
CREATE POLICY "Machines are viewable by authenticated users" 
ON public.machines FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Machines are insertable by admins" 
ON public.machines FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);

CREATE POLICY "Machines are updatable by admins" 
ON public.machines FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);

CREATE POLICY "Machines are deletable by admins" 
ON public.machines FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);

-- Similar policies for other tables (abbreviated for brevity)
-- In production, each table would have its own specific policies

-- Generic policy pattern for all data tables
DO $$
DECLARE
  table_names TEXT[] := ARRAY[
    'machine_history', 'installation_data', 'installation_photos', 
    'collections', 'expenses', 'spare_parts', 'maintenance', 
    'maintenance_spare_parts', 'payments'
  ];
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY table_names
  LOOP
    EXECUTE format('
      CREATE POLICY "%1$s are viewable by authenticated users" 
      ON public.%1$s FOR SELECT 
      TO authenticated
      USING (true);

      CREATE POLICY "%1$s are insertable by all authenticated users" 
      ON public.%1$s FOR INSERT 
      TO authenticated
      WITH CHECK (true);

      CREATE POLICY "%1$s are updatable by admins or technicians who created them" 
      ON public.%1$s FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE user_profiles.id = auth.uid()
          AND (user_profiles.role = ''admin'' OR (
            %1$s.created_by = auth.uid()
          ))
        )
      );

      CREATE POLICY "%1$s are deletable by admins" 
      ON public.%1$s FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.role = ''admin''
        )
      );
    ', table_name);
  END LOOP;
END
$$;

-- Company profile special policies
CREATE POLICY "Company profile is viewable by authenticated users" 
ON public.company_profile FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Company profile is editable by admins" 
ON public.company_profile FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);

-- User profiles policies
CREATE POLICY "User profiles are viewable by authenticated users" 
ON public.user_profiles FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.user_profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  -- Ensure users can't change their own role
  (auth.uid() = id AND role = (SELECT role FROM public.user_profiles WHERE id = auth.uid()))
  OR
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can insert user profiles" 
ON public.user_profiles FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can delete user profiles" 
ON public.user_profiles FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);

-- ===========================================
-- FUNCTIONS & TRIGGERS
-- ===========================================

-- Function to update timestamp fields
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to all tables with updated_at
DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOR table_name IN 
    SELECT table_name 
    FROM information_schema.columns 
    WHERE column_name = 'updated_at' 
    AND table_schema = 'public'
  LOOP
    EXECUTE format('
      CREATE TRIGGER update_%1$s_updated_at
      BEFORE UPDATE ON public.%1$s
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at();
    ', table_name);
  END LOOP;
END
$$;

-- Function to automatically create user profile
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, username, name, role)
  VALUES (
    NEW.id, 
    NEW.email, -- Default to email as username
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), -- Use name from metadata or generate from email
    CASE WHEN (SELECT COUNT(*) FROM auth.users) = 1 
         THEN 'admin'::user_role -- First user is admin
         ELSE 'technician'::user_role 
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create user profile on signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user();

-- Function to update machine counters
CREATE OR REPLACE FUNCTION update_machine_counter()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the machine's current counter
  UPDATE public.machines
  SET current_counter = NEW.current_counter
  WHERE id = NEW.machine_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update machine counter after collection
CREATE TRIGGER after_collection_insert
AFTER INSERT ON public.collections
FOR EACH ROW
EXECUTE FUNCTION update_machine_counter();

-- Function to increment client machines count
CREATE OR REPLACE FUNCTION update_client_machine_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.client_id IS NOT NULL AND (OLD.client_id IS NULL OR OLD.client_id != NEW.client_id) THEN
    -- Increment the new client's machine count
    UPDATE public.clients
    SET machines = machines + 1
    WHERE id = NEW.client_id;
  END IF;
  
  IF OLD.client_id IS NOT NULL AND (NEW.client_id IS NULL OR OLD.client_id != NEW.client_id) THEN
    -- Decrement the old client's machine count
    UPDATE public.clients
    SET machines = GREATEST(machines - 1, 0)
    WHERE id = OLD.client_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to manage client machine count
CREATE TRIGGER on_machine_client_change
AFTER UPDATE ON public.machines
FOR EACH ROW
WHEN (OLD.client_id IS DISTINCT FROM NEW.client_id)
EXECUTE FUNCTION update_client_machine_count();

-- ===========================================
-- DEFAULT DATA
-- ===========================================

-- Create a default company profile if none exists
INSERT INTO public.company_profile (name, vat_percentage)
VALUES ('My Company', 21.0)
ON CONFLICT DO NOTHING;
