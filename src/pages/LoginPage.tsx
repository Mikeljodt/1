import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { login } from '@/store/slices/authSlice';
import { RootState, AppDispatch } from '@/store';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import AuthDebugger from '@/components/AuthDebugger';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showDebugger, setShowDebugger] = useState(false);
  
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { status, error } = useSelector((state: RootState) => state.auth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await dispatch(login({ username, password })).unwrap();
      navigate('/');
    } catch (err) {
      // Error is handled in the component through the Redux state
    }
  };

  const toggleDebugger = () => setShowDebugger(!showDebugger);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Rekreativ@</CardTitle>
            <CardDescription className="text-center">
              Iniciar sesión para acceder al sistema
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">{error}</div>
              )}
              <div className="space-y-2">
                <Label htmlFor="username">Usuario</Label>
                <Input
                  id="username"
                  placeholder="usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={status === 'loading'}>
                {status === 'loading' ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </Button>
              <div className="text-center text-sm">
                ¿No tienes una cuenta?{' '}
                <Link to="/register" className="text-primary hover:underline">
                  Registrarse
                </Link>
              </div>
              <div className="text-center mt-6">
                <Button variant="link" size="sm" onClick={toggleDebugger} className="text-xs text-muted-foreground">
                  {showDebugger ? 'Ocultar herramientas' : 'Herramientas de desarrollo'}
                </Button>
              </div>
            </CardFooter>
          </form>
        </Card>
        
        {showDebugger && <AuthDebugger />}
      </div>
    </div>
  );
};

export default LoginPage;
