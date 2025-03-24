-- Agregar columna created_by a machine_history
ALTER TABLE public.machine_history 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Crear índice para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_machine_history_created_by 
ON public.machine_history(created_by);

-- Crear políticas RLS para que los usuarios puedan modificar y eliminar sus propios registros
CREATE POLICY "Machine history is updatable by admins or creators" 
ON public.machine_history FOR UPDATE
TO authenticated
USING (
  (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'admin' 
  OR created_by = auth.uid()
)
WITH CHECK (
  (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'admin' 
  OR created_by = auth.uid()
);

CREATE POLICY "Machine history is deletable by admins or creators" 
ON public.machine_history FOR DELETE
TO authenticated
USING (
  (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'admin' 
  OR created_by = auth.uid()
);
