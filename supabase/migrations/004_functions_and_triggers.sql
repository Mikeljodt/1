-- MIGRATION 004: FUNCTIONS AND TRIGGERS
-- Implements database functions and triggers for business logic

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

-- Function to log machine history
CREATE OR REPLACE FUNCTION log_machine_history()
RETURNS TRIGGER AS $$
BEGIN
  -- Log machine status changes
  IF OLD.status != NEW.status THEN
    INSERT INTO public.machine_history (
      machine_id, 
      action, 
      details
    ) VALUES (
      NEW.id,
      'status_change',
      format('Status changed from %s to %s', OLD.status, NEW.status)
    );
  END IF;
  
  -- Log machine client changes
  IF OLD.client_id IS DISTINCT FROM NEW.client_id THEN
    INSERT INTO public.machine_history (
      machine_id, 
      action, 
      details
    ) VALUES (
      NEW.id,
      'client_change',
      CASE 
        WHEN NEW.client_id IS NULL THEN 'Removed from client'
        WHEN OLD.client_id IS NULL THEN 'Assigned to client'
        ELSE 'Transferred to another client'
      END
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to log machine history
CREATE TRIGGER on_machine_update
AFTER UPDATE ON public.machines
FOR EACH ROW
EXECUTE FUNCTION log_machine_history();

-- Function to check spare parts stock
CREATE OR REPLACE FUNCTION check_spare_parts_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if there's enough stock
  IF EXISTS (
    SELECT 1 
    FROM public.spare_parts 
    WHERE id = NEW.spare_part_id AND quantity < NEW.quantity
  ) THEN
    RAISE EXCEPTION 'Not enough stock for spare part %', NEW.spare_part_id;
  END IF;
  
  -- Update the stock
  UPDATE public.spare_parts
  SET quantity = quantity - NEW.quantity
  WHERE id = NEW.spare_part_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check and update spare parts stock
CREATE TRIGGER on_maintenance_spare_part_insert
BEFORE INSERT ON public.maintenance_spare_parts
FOR EACH ROW
EXECUTE FUNCTION check_spare_parts_stock();

-- Function to update maintenance cost based on spare parts
CREATE OR REPLACE FUNCTION update_maintenance_cost()
RETURNS TRIGGER AS $$
DECLARE
  new_cost DECIMAL(10, 2);
BEGIN
  -- Calculate the total cost of spare parts
  SELECT COALESCE(SUM(sp.cost * msp.quantity), 0)
  INTO new_cost
  FROM public.maintenance_spare_parts msp
  JOIN public.spare_parts sp ON msp.spare_part_id = sp.id
  WHERE msp.maintenance_id = NEW.maintenance_id;
  
  -- Update the maintenance cost
  UPDATE public.maintenance
  SET cost = new_cost
  WHERE id = NEW.maintenance_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update maintenance cost
CREATE TRIGGER on_maintenance_spare_part_change
AFTER INSERT OR UPDATE OR DELETE ON public.maintenance_spare_parts
FOR EACH ROW
EXECUTE FUNCTION update_maintenance_cost();

-- Function to track created_by for all tables
CREATE OR REPLACE FUNCTION set_created_by()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    -- Only set if the column exists in the table
    IF EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = TG_TABLE_NAME 
        AND column_name = 'created_by'
    ) THEN
      NEW.created_by = auth.uid();
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the created_by trigger to all tables (would be customized in real implementation)
DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOR table_name IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
  LOOP
    -- Check if table has created_by column
    IF EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = table_name 
        AND column_name = 'created_by'
    ) THEN
      EXECUTE format('
        CREATE TRIGGER set_%1$s_created_by
        BEFORE INSERT ON public.%1$s
        FOR EACH ROW
        EXECUTE FUNCTION set_created_by();
      ', table_name);
    END IF;
  END LOOP;
END
$$;
