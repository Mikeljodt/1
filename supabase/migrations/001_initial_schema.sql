-- MIGRATION 001: INITIAL SCHEMA
-- Creates the base tables and schemas for the Rekreativ application

-- NOTE: Extensions are now enabled in 000_enable_extensions.sql
-- DO NOT remove this comment as a reminder

-- Create custom types
CREATE TYPE machine_status AS ENUM ('warehouse', 'installed', 'repair');
CREATE TYPE maintenance_type AS ENUM ('preventive', 'corrective');
CREATE TYPE maintenance_status AS ENUM ('pending', 'in-progress', 'completed');
CREATE TYPE user_role AS ENUM ('admin', 'technician');

-- Create the base tables
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

CREATE TABLE public.machine_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id UUID REFERENCES public.machines(id) ON DELETE CASCADE NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

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

CREATE TABLE public.installation_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  installation_id UUID REFERENCES public.installation_data(id) ON DELETE CASCADE NOT NULL,
  photo_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

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

-- Create other tables
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

CREATE TABLE public.maintenance_spare_parts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  maintenance_id UUID REFERENCES public.maintenance(id) ON DELETE CASCADE NOT NULL,
  spare_part_id UUID REFERENCES public.spare_parts(id) ON DELETE RESTRICT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id INTEGER REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  method TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

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

-- Create basic indexes
CREATE INDEX idx_clients_name ON public.clients USING GIN (name gin_trgm_ops);
CREATE INDEX idx_machines_client_id ON public.machines (client_id);
CREATE INDEX idx_machines_status ON public.machines (status);
CREATE INDEX idx_machines_serial_number ON public.machines (serial_number);
CREATE INDEX idx_collections_machine_id ON public.collections (machine_id);
CREATE INDEX idx_collections_client_id ON public.collections (client_id);
CREATE INDEX idx_collections_date ON public.collections (date);

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

-- Create a default company profile
INSERT INTO public.company_profile (name, vat_percentage)
VALUES ('My Company', 21.0)
ON CONFLICT DO NOTHING;

-- Track this migration
INSERT INTO public.schema_migrations (version, description) 
VALUES ('001', 'Initial schema')
ON CONFLICT (version) DO NOTHING;
