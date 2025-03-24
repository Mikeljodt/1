import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';

const DashboardPage = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const { clients } = useSelector((state: RootState) => state.clients);
  const { machines } = useSelector((state: RootState) => state.machines);
  const { collections } = useSelector((state: RootState) => state.collections);
  const { expenses } = useSelector((state: RootState) => state.expenses);
  
  // Calcular estadísticas
  const totalClients = clients.length;
  const totalMachines = machines.length;
  const installedMachines = machines.filter(m => m.status === 'installed').length;
  const warehouseMachines = machines.filter(m => m.status === 'warehouse').length;
  
  // Calcular ingresos y gastos del mes actual
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const monthlyCollections = collections.filter(c => {
    const collectionDate = new Date(c.date);
    return collectionDate.getMonth() === currentMonth && collectionDate.getFullYear() === currentYear;
  });
  
  const monthlyExpenses = expenses.filter(e => {
    const expenseDate = new Date(e.date);
    return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
  });
  
  const totalMonthlyCollections = monthlyCollections.reduce((sum, c) => sum + c.amount, 0);
  const totalMonthlyExpenses = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
  const monthlyNetIncome = totalMonthlyCollections - totalMonthlyExpenses;
  
  // Calcular mantenimientos pendientes
  const pendingMaintenance = machines.filter(m => m.status === 'repair').length;
  
  // Formatear moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
  };
  
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Panel de Control</h1>
        <p className="text-muted-foreground">Bienvenido, {user?.name}.</p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClients}</div>
            <p className="text-xs text-muted-foreground mt-1">Clientes registrados</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Máquinas</CardTitle>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><rect width="18" height="12" x="3" y="6" rx="2"></rect><line x1="7" x2="7" y1="12" y2="12"></line><line x1="11" x2="11" y1="12" y2="12"></line><line x1="15" x2="15" y1="12" y2="12"></line></svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMachines}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {installedMachines} instaladas, {warehouseMachines} en almacén
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos del Mes</CardTitle>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalMonthlyCollections)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(monthlyNetIncome)} neto
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mantenimientos Pendientes</CardTitle>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingMaintenance}</div>
            <p className="text-xs text-muted-foreground mt-1">Máquinas en reparación</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
            <CardDescription>Últimas acciones en el sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...machines, ...collections, ...expenses]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 5)
                .map((item, i) => (
                  <div key={i} className="flex items-center">
                    <div className="w-2 h-2 rounded-full bg-primary mr-3" />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {'history' in item ? 
                          item.history[0]?.details : 
                          (item as any).amount ? 
                          `Recaudación registrada: ${formatCurrency((item as any).amount)}` : 
                          'Nueva máquina agregada'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.createdAt).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'long',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Resumen Mensual</CardTitle>
            <CardDescription>
              Periodo: {new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">Total Recaudaciones</span>
              <span className="font-medium">{formatCurrency(totalMonthlyCollections)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Total Gastos</span>
              <span className="font-medium">{formatCurrency(totalMonthlyExpenses)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Margen Neto</span>
              <span className="font-medium">{formatCurrency(monthlyNetIncome)}</span>
            </div>
            <div className="h-px w-full bg-border my-2" />
            <div className="flex justify-between items-center">
              <span className="text-sm">Eficiencia de Máquinas</span>
              <span className="font-medium">
                {Math.round((installedMachines / totalMachines) * 100)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Clientes Activos</span>
              <span className="font-medium">{totalClients}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Máquinas Activas</span>
              <span className="font-medium">{installedMachines}/{totalMachines}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
