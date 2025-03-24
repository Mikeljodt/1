import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RootState, AppDispatch } from '@/store';
import { fetchCompanyProfile, saveCompanyProfile } from '@/store/slices/companyProfileSlice';
import { BackupManager } from '@/components/BackupManager';

const SettingsPage = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { profile, status } = useSelector((state: RootState) => state.companyProfile);
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    taxId: '',
    logo: '',
  });

  // Cargar el perfil de la empresa cuando se monta el componente
  useEffect(() => {
    dispatch(fetchCompanyProfile());
  }, [dispatch]);

  // Actualizar el formulario cuando se carga el perfil
  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        address: profile.address || '',
        phone: profile.phone || '',
        email: profile.email || '',
        taxId: profile.taxId || '',
        logo: profile.logo || '',
      });
    }
  }, [profile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(saveCompanyProfile(formData));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setFormData(prev => ({ ...prev, logo: event.target.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCancel = () => {
    // Implementa la lógica para cancelar la operación
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configuración</h1>
        <p className="text-muted-foreground">Gestiona la configuración de tu empresa y datos</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Perfil de Empresa</CardTitle>
            <CardDescription>
              Configura los datos de tu empresa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col justify-center items-center mb-6">
                <div className="h-24 w-24 rounded-full overflow-hidden border border-border mb-2">
                  {formData.logo ? (
                    <img 
                      src={formData.logo} 
                      alt="Logo de la empresa" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
                      Logo
                    </div>
                  )}
                </div>
                <Label htmlFor="logo" className="cursor-pointer text-violet hover:text-violet/90">
                  Cambiar Logo
                </Label>
                <Input 
                  id="logo" 
                  type="file" 
                  accept="image/*" 
                  onChange={handleLogoChange} 
                  className="hidden" 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nombre de la Empresa</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Nombre de tu empresa"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxId">NIF/CIF</Label>
                <Input
                  id="taxId"
                  name="taxId"
                  value={formData.taxId}
                  onChange={handleChange}
                  placeholder="Número de identificación fiscal"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Dirección</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Dirección completa"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Número de contacto"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="correo@ejemplo.com"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" type="button" onClick={handleCancel}>
                  Cancelar
                </Button>
                <Button variant="default" type="submit">
                  Guardar Cambios
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        
        <BackupManager />
      </div>
    </div>
  );
};

export default SettingsPage;
