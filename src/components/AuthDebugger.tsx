import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createDefaultAdmin, validateUser, deleteAllUsers } from '@/lib/auth';

const AuthDebugger = () => {
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'success' | 'error' | null>(null);

  const handleCreateDefaultAdmin = async () => {
    try {
      await createDefaultAdmin(true);
      setMessage('Administrador por defecto creado correctamente. Usuario: admin, Contraseña: admin');
      setStatus('success');
    } catch (error) {
      setMessage(`Error al crear administrador por defecto: ${error}`);
      setStatus('error');
    }
  };

  const handleDeleteAllUsers = async () => {
    try {
      await deleteAllUsers();
      setMessage('Todos los usuarios eliminados correctamente');
      setStatus('success');
    } catch (error) {
      setMessage(`Error al eliminar usuarios: ${error}`);
      setStatus('error');
    }
  };

  const handleGetStoredUser = () => {
    try {
      const token = localStorage.getItem('authToken');
      const user = localStorage.getItem('user');
      setMessage(`Token: ${token || 'ninguno'}\nUsuario: ${user || 'ninguno'}`);
      setStatus('success');
    } catch (error) {
      setMessage(`Error al obtener datos almacenados: ${error}`);
      setStatus('error');
    }
  };

  const handleCheckDB = async () => {
    try {
      const users = await validateUser('admin', 'admin');
      setMessage(`Resultado de validación: ${JSON.stringify(users, null, 2)}`);
      setStatus('success');
    } catch (error) {
      setMessage(`Error en la base de datos: ${error}`);
      setStatus('error');
    }
  };

  return (
    <Card className="mt-6 w-full max-w-md">
      <CardHeader>
        <CardTitle>Herramientas de Solución</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={handleCreateDefaultAdmin} variant="outline" size="sm">
              Crear Admin Predeterminado
            </Button>
            <Button onClick={handleDeleteAllUsers} variant="outline" size="sm">
              Eliminar Todos los Usuarios
            </Button>
            <Button onClick={handleGetStoredUser} variant="outline" size="sm">
              Ver Datos Almacenados
            </Button>
            <Button onClick={handleCheckDB} variant="outline" size="sm">
              Verificar BD
            </Button>
          </div>
          
          {message && (
            <div 
              className={`mt-4 p-3 rounded-md text-sm whitespace-pre-wrap ${
                status === 'success' ? 'bg-green-50 text-green-700' : 
                status === 'error' ? 'bg-red-50 text-red-500' : ''
              }`}
            >
              {message}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AuthDebugger;
