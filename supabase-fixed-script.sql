-- SCRIPT COMPLETO PARA CONFIGURAR SUPABASE (CORREGIDO)
-- Este script contiene todas las instrucciones necesarias para configurar la base de datos

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Crear schema de auth si no existe
CREATE SCHEMA IF NOT EXISTS auth;
GRANT USAGE ON SCHEMA auth TO service_role;
GRANT ALL ON SCHEMA auth TO postgres;

-- Crear tabla para seguimiento de migraciones
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  version TEXT PRIMARY KEY,
  description TEXT,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Crear tipos ENUM
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'machine_status') THEN
    CREATE TYPE machine_status AS ENUM ('warehouse', 'installed', 'repair');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'maintenance_type') THEN
    CREATE TYPE maintenance_type AS ENUM ('preventive', 'corrective');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'maintenance_status') THEN
    CREATE TYPE maintenance_status AS ENUM ('pending', 'in-progress', 'completed');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('admin', 'technician');
  END IF;
END$$;

-- TABLAS PRINCIPALES --

-- Clientes
CREATE TABLE IF NOT EXISTS public.clients (
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

-- Máquinas
CREATE TABLE IF NOT EXISTS public.machines (
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

-- Historial de Máquinas
CREATE TABLE IF NOT EXISTS public.machine_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id UUID REFERENCES public.machines(id) ON DELETE CASCADE NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id)
);

-- Instalaciones
CREATE TABLE IF NOT EXISTS public.installation_data (
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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id)
);

-- Fotos de instalación
CREATE TABLE IF NOT EXISTS public.installation_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  installation_id UUID REFERENCES public.installation_data(id) ON DELETE CASCADE NOT NULL,
  photo_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id)
);

-- Recaudaciones
CREATE TABLE IF NOT EXISTS public.collections (
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id)
);

-- Gastos
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id UUID REFERENCES public.machines(id) ON DELETE SET NULL,
  client_id INTEGER REFERENCES public.clients(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  receipt_image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id)
);

-- Repuestos
CREATE TABLE IF NOT EXISTS public.spare_parts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  min_quantity INTEGER NOT NULL DEFAULT 0,
  cost DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Mantenimiento
CREATE TABLE IF NOT EXISTS public.maintenance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id UUID REFERENCES public.machines(id) ON DELETE CASCADE NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  type maintenance_type NOT NULL,
  description TEXT NOT NULL,
  cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
  status maintenance_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id)
);

-- Repuestos usados en mantenimiento
CREATE TABLE IF NOT EXISTS public.maintenance_spare_parts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  maintenance_id UUID REFERENCES public.maintenance(id) ON DELETE CASCADE NOT NULL,
  spare_part_id UUID REFERENCES public.spare_parts(id) ON DELETE RESTRICT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id)
);

-- Pagos
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id INTEGER REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  method TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id)
);

-- Perfil de empresa
CREATE TABLE IF NOT EXISTS public.company_profile (
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

-- Perfiles de usuarios
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'technician',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- ÍNDICES --

-- Índices para clientes
CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients USING GIN (name gin_trgm_ops);

-- Índices para máquinas
CREATE INDEX IF NOT EXISTS idx_machines_client_id ON public.machines (client_id);
CREATE INDEX IF NOT EXISTS idx_machines_status ON public.machines (status);
CREATE INDEX IF NOT EXISTS idx_machines_serial_number ON public.machines (serial_number);

-- Índices para historial de máquinas
CREATE INDEX IF NOT EXISTS idx_machine_history_machine_id ON public.machine_history (machine_id);
CREATE INDEX IF NOT EXISTS idx_machine_history_created_by ON public.machine_history (created_by);

-- Índices para instalaciones
CREATE INDEX IF NOT EXISTS idx_installation_data_machine_id ON public.installation_data (machine_id);
CREATE INDEX IF NOT EXISTS idx_installation_data_created_by ON public.installation_data (created_by);

-- Índices para fotos de instalación
CREATE INDEX IF NOT EXISTS idx_installation_photos_installation_id ON public.installation_photos (installation_id);

-- Índices para recaudaciones
CREATE INDEX IF NOT EXISTS idx_collections_machine_id ON public.collections (machine_id);
CREATE INDEX IF NOT EXISTS idx_collections_client_id ON public.collections (client_id);
CREATE INDEX IF NOT EXISTS idx_collections_date ON public.collections (date);
CREATE INDEX IF NOT EXISTS idx_collections_created_by ON public.collections (created_by);

-- Índices para gastos
CREATE INDEX IF NOT EXISTS idx_expenses_machine_id ON public.expenses (machine_id);
CREATE INDEX IF NOT EXISTS idx_expenses_client_id ON public.expenses (client_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses (date);
CREATE INDEX IF NOT EXISTS idx_expenses_type ON public.expenses (type);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON public.expenses (created_by);

-- Índices para repuestos
CREATE INDEX IF NOT EXISTS idx_spare_parts_name ON public.spare_parts USING GIN (name gin_trgm_ops);

-- Índices para mantenimiento
CREATE INDEX IF NOT EXISTS idx_maintenance_machine_id ON public.maintenance (machine_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_date ON public.maintenance (date);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON public.maintenance (status);
CREATE INDEX IF NOT EXISTS idx_maintenance_created_by ON public.maintenance (created_by);

-- Índices para repuestos de mantenimiento
CREATE INDEX IF NOT EXISTS idx_maintenance_spare_parts_maintenance_id ON public.maintenance_spare_parts (maintenance_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_spare_parts_spare_part_id ON public.maintenance_spare_parts (spare_part_id);

-- Índices para pagos
CREATE INDEX IF NOT EXISTS idx_payments_client_id ON public.payments (client_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments (date);
CREATE INDEX IF NOT EXISTS idx_payments_created_by ON public.payments (created_by);

-- Índice para perfiles de usuario
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON public.user_profiles (username);

-- FUNCIONES Y TRIGGERS --

-- Función para actualizar campos de fecha de actualización
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a todas las tablas con updated_at (CORREGIDO)
DO $$
DECLARE
  tbl_name TEXT;
BEGIN
  FOR tbl_name IN 
    SELECT information_schema.columns.table_name 
    FROM information_schema.columns 
    WHERE column_name = 'updated_at' 
    AND table_schema = 'public'
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS update_%1$s_updated_at ON public.%1$s;
      CREATE TRIGGER update_%1$s_updated_at
      BEFORE UPDATE ON public.%1$s
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at();
    ', tbl_name);
  END LOOP;
END
$$;

-- Función para crear automáticamente perfiles de usuario
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

-- Trigger para crear perfil de usuario al registrarse
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user();

-- Función para actualizar contadores de máquinas
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

-- Trigger para actualizar contador de máquina después de una recaudación
DROP TRIGGER IF EXISTS after_collection_insert ON public.collections;
CREATE TRIGGER after_collection_insert
AFTER INSERT ON public.collections
FOR EACH ROW
EXECUTE FUNCTION update_machine_counter();

-- Función para incrementar conteo de máquinas de cliente
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

-- Trigger para gestionar conteo de máquinas de cliente
DROP TRIGGER IF EXISTS on_machine_client_change ON public.machines;
CREATE TRIGGER on_machine_client_change
AFTER UPDATE ON public.machines
FOR EACH ROW
WHEN (OLD.client_id IS DISTINCT FROM NEW.client_id)
EXECUTE FUNCTION update_client_machine_count();

-- Función de utilidad para verificar si un usuario es administrador
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql;

-- POLÍTICAS DE SEGURIDAD (RLS) --

-- Habilitar RLS en todas las tablas
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

-- Políticas para clientes
DROP POLICY IF EXISTS "Clients are viewable by authenticated users" ON public.clients;
CREATE POLICY "Clients are viewable by authenticated users" 
ON public.clients FOR SELECT 
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Clients are insertable by admins" ON public.clients;
CREATE POLICY "Clients are insertable by admins" 
ON public.clients FOR INSERT 
TO authenticated
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Clients are updatable by admins" ON public.clients;
CREATE POLICY "Clients are updatable by admins" 
ON public.clients FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Clients are deletable by admins" ON public.clients;
CREATE POLICY "Clients are deletable by admins" 
ON public.clients FOR DELETE
TO authenticated
USING (is_admin());

-- Políticas para máquinas
DROP POLICY IF EXISTS "Machines are viewable by authenticated users" ON public.machines;
CREATE POLICY "Machines are viewable by authenticated users" 
ON public.machines FOR SELECT 
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Machines are insertable by admins" ON public.machines;
CREATE POLICY "Machines are insertable by admins" 
ON public.machines FOR INSERT 
TO authenticated
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Machines are updatable by admins" ON public.machines;
CREATE POLICY "Machines are updatable by admins" 
ON public.machines FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Machines are deletable by admins" ON public.machines;
CREATE POLICY "Machines are deletable by admins" 
ON public.machines FOR DELETE
TO authenticated
USING (is_admin());

-- Políticas para historial de máquinas
DROP POLICY IF EXISTS "Machine history is viewable by authenticated users" ON public.machine_history;
CREATE POLICY "Machine history is viewable by authenticated users" 
ON public.machine_history FOR SELECT 
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Machine history is insertable by all authenticated users" ON public.machine_history;
CREATE POLICY "Machine history is insertable by all authenticated users" 
ON public.machine_history FOR INSERT 
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Machine history is updatable by admins or creators" ON public.machine_history;
CREATE POLICY "Machine history is updatable by admins or creators" 
ON public.machine_history FOR UPDATE
TO authenticated
USING (is_admin() OR created_by = auth.uid())
WITH CHECK (is_admin() OR created_by = auth.uid());

DROP POLICY IF EXISTS "Machine history is deletable by admins or creators" ON public.machine_history;
CREATE POLICY "Machine history is deletable by admins or creators" 
ON public.machine_history FOR DELETE
TO authenticated
USING (is_admin() OR created_by = auth.uid());

-- Políticas genéricas para otras tablas
-- Recaudaciones
DROP POLICY IF EXISTS "Collections are viewable by authenticated users" ON public.collections;
CREATE POLICY "Collections are viewable by authenticated users" 
ON public.collections FOR SELECT 
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Collections are insertable by all authenticated users" ON public.collections;
CREATE POLICY "Collections are insertable by all authenticated users" 
ON public.collections FOR INSERT 
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Collections are updatable by admins or creators" ON public.collections;
CREATE POLICY "Collections are updatable by admins or creators" 
ON public.collections FOR UPDATE
TO authenticated
USING (is_admin() OR created_by = auth.uid())
WITH CHECK (is_admin() OR created_by = auth.uid());

DROP POLICY IF EXISTS "Collections are deletable by admins or creators" ON public.collections;
CREATE POLICY "Collections are deletable by admins or creators" 
ON public.collections FOR DELETE
TO authenticated
USING (is_admin() OR created_by = auth.uid());

-- Gastos
DROP POLICY IF EXISTS "Expenses are viewable by authenticated users" ON public.expenses;
CREATE POLICY "Expenses are viewable by authenticated users" 
ON public.expenses FOR SELECT 
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Expenses are insertable by all authenticated users" ON public.expenses;
CREATE POLICY "Expenses are insertable by all authenticated users" 
ON public.expenses FOR INSERT 
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Expenses are updatable by admins or creators" ON public.expenses;
CREATE POLICY "Expenses are updatable by admins or creators" 
ON public.expenses FOR UPDATE
TO authenticated
USING (is_admin() OR created_by = auth.uid())
WITH CHECK (is_admin() OR created_by = auth.uid());

DROP POLICY IF EXISTS "Expenses are deletable by admins" ON public.expenses;
CREATE POLICY "Expenses are deletable by admins" 
ON public.expenses FOR DELETE
TO authenticated
USING (is_admin());

-- Datos de instalación
DROP POLICY IF EXISTS "Installation data is viewable by authenticated users" ON public.installation_data;
CREATE POLICY "Installation data is viewable by authenticated users" 
ON public.installation_data FOR SELECT 
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Installation data is insertable by all authenticated users" ON public.installation_data;
CREATE POLICY "Installation data is insertable by all authenticated users" 
ON public.installation_data FOR INSERT 
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Installation data is updatable by admins or creators" ON public.installation_data;
CREATE POLICY "Installation data is updatable by admins or creators" 
ON public.installation_data FOR UPDATE
TO authenticated
USING (is_admin() OR created_by = auth.uid())
WITH CHECK (is_admin() OR created_by = auth.uid());

DROP POLICY IF EXISTS "Installation data is deletable by admins" ON public.installation_data;
CREATE POLICY "Installation data is deletable by admins" 
ON public.installation_data FOR DELETE
TO authenticated
USING (is_admin());

-- Fotos de instalación
DROP POLICY IF EXISTS "Installation photos are viewable by authenticated users" ON public.installation_photos;
CREATE POLICY "Installation photos are viewable by authenticated users" 
ON public.installation_photos FOR SELECT 
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Installation photos are insertable by all authenticated users" ON public.installation_photos;
CREATE POLICY "Installation photos are insertable by all authenticated users" 
ON public.installation_photos FOR INSERT 
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Installation photos are deletable by admins or creators" ON public.installation_photos;
CREATE POLICY "Installation photos are deletable by admins or creators" 
ON public.installation_photos FOR DELETE
TO authenticated
USING (is_admin() OR created_by = auth.uid());

-- Mantenimiento
DROP POLICY IF EXISTS "Maintenance is viewable by authenticated users" ON public.maintenance;
CREATE POLICY "Maintenance is viewable by authenticated users" 
ON public.maintenance FOR SELECT 
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Maintenance is insertable by all authenticated users" ON public.maintenance;
CREATE POLICY "Maintenance is insertable by all authenticated users" 
ON public.maintenance FOR INSERT 
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Maintenance is updatable by admins or creators" ON public.maintenance;
CREATE POLICY "Maintenance is updatable by admins or creators" 
ON public.maintenance FOR UPDATE
TO authenticated
USING (is_admin() OR created_by = auth.uid())
WITH CHECK (is_admin() OR created_by = auth.uid());

DROP POLICY IF EXISTS "Maintenance is deletable by admins" ON public.maintenance;
CREATE POLICY "Maintenance is deletable by admins" 
ON public.maintenance FOR DELETE
TO authenticated
USING (is_admin());

-- Pagos
DROP POLICY IF EXISTS "Payments are viewable by authenticated users" ON public.payments;
CREATE POLICY "Payments are viewable by authenticated users" 
ON public.payments FOR SELECT 
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Payments are insertable by all authenticated users" ON public.payments;
CREATE POLICY "Payments are insertable by all authenticated users" 
ON public.payments FOR INSERT 
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Payments are updatable by admins or creators" ON public.payments;
CREATE POLICY "Payments are updatable by admins or creators" 
ON public.payments FOR UPDATE
TO authenticated
USING (is_admin() OR created_by = auth.uid())
WITH CHECK (is_admin() OR created_by = auth.uid());

DROP POLICY IF EXISTS "Payments are deletable by admins" ON public.payments;
CREATE POLICY "Payments are deletable by admins" 
ON public.payments FOR DELETE
TO authenticated
USING (is_admin());

-- Perfil de compañía - políticas especiales
DROP POLICY IF EXISTS "Company profile is viewable by authenticated users" ON public.company_profile;
CREATE POLICY "Company profile is viewable by authenticated users" 
ON public.company_profile FOR SELECT 
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Company profile is editable by admins" ON public.company_profile;
CREATE POLICY "Company profile is editable by admins" 
ON public.company_profile FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Perfiles de usuario - políticas
DROP POLICY IF EXISTS "User profiles are viewable by authenticated users" ON public.user_profiles;
CREATE POLICY "User profiles are viewable by authenticated users" 
ON public.user_profiles FOR SELECT 
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
CREATE POLICY "Users can update their own profile" 
ON public.user_profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id OR is_admin())
WITH CHECK (
  -- Ensure users can't change their own role
  (auth.uid() = id AND role = (SELECT role FROM public.user_profiles WHERE id = auth.uid()))
  OR is_admin()
);

DROP POLICY IF EXISTS "Admins can insert user profiles" ON public.user_profiles;
CREATE POLICY "Admins can insert user profiles" 
ON public.user_profiles FOR INSERT 
TO authenticated
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can delete user profiles" ON public.user_profiles;
CREATE POLICY "Admins can delete user profiles" 
ON public.user_profiles FOR DELETE
TO authenticated
USING (is_admin());

-- DATOS INICIALES --

-- Crear un perfil de compañía predeterminado si no existe
INSERT INTO public.company_profile (name, vat_percentage)
VALUES ('Mi Empresa', 21.0)
ON CONFLICT DO NOTHING;

-- Registrar esta migración
INSERT INTO public.schema_migrations (version, description) 
VALUES ('complete', 'Configuración completa de la base de datos')
ON CONFLICT (version) DO NOTHING;
