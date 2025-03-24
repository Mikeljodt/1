import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Download, Search, File, Calendar, Filter, ArrowUpDown, Printer, BarChart3 } from 'lucide-react';
import { RootState, AppDispatch } from '@/store';
import { 
  fetchCollections, 
  setFilters,
  clearFilters,
  selectCollection,
  clearSelectedCollection,
  Collection
} from '@/store/slices/collectionsSlice';
import { fetchMachines } from '@/store/slices/machinesSlice';
import { fetchClients } from '@/store/slices/clientsSlice';
import { fetchAllCounters } from '@/store/slices/counterSlice';
import { toast } from '@/components/ui/use-toast';
import { CollectionForm } from '@/components/CollectionForm';
import { CollectionHistory } from '@/components/CollectionHistory';
import { CollectionReport } from '@/components/CollectionReport';
import { CollectionAuditTrail } from '@/components/CollectionAuditTrail';
import { formatDate, formatCurrency, exportToCSV } from '@/lib/utils';

const CollectionsPage = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { collections, filteredCollections, status, filters } = useSelector((state: RootState) => state.collections);
  const { machines } = useSelector((state: RootState) => state.machines);
  const { clients } = useSelector((state: RootState) => state.clients);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estado para el diálogo de nueva recaudación
  const [isNewCollectionDialogOpen, setIsNewCollectionDialogOpen] = useState(false);
  
  // Estado para el diálogo de filtros
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [filterFormData, setFilterFormData] = useState({
    startDate: filters.startDate || '',
    endDate: filters.endDate || '',
    clientId: filters.clientId || '',
    machineId: filters.machineId || '',
    minAmount: filters.minAmount || '',
    maxAmount: filters.maxAmount || '',
    staffMember: filters.staffMember || ''
  });

  // Estado para el diálogo de detalles
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [selectedCollectionData, setSelectedCollectionData] = useState<Collection | null>(null);

  // Estado para el diálogo de informes
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportType, setReportType] = useState('client');
  const [reportPeriod, setReportPeriod] = useState('month');
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const [reportClientId, setReportClientId] = useState('');
  const [reportMachineId, setReportMachineId] = useState('');

  // Estado para el diálogo de historial
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [historyMachineId, setHistoryMachineId] = useState<string | null>(null);
  const [historyClientId, setHistoryClientId] = useState<number | null>(null);

  // Estado para el diálogo de auditoría
  const [isAuditDialogOpen, setIsAuditDialogOpen] = useState(false);

  // Estado para ordenación
  const [sortField, setSortField] = useState<keyof Collection>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    dispatch(fetchMachines());
    dispatch(fetchClients());
    dispatch(fetchCollections());
    dispatch(fetchAllCounters());
  }, [dispatch]);

  // Filtrar colecciones por término de búsqueda
  const displayedCollections = filteredCollections.filter(collection => {
    const clientName = clients.find(c => c.id === collection.clientId)?.name || '';
    const machineSerial = machines.find(m => m.id === collection.machineId)?.serialNumber || '';
    
    return clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           machineSerial.toLowerCase().includes(searchTerm.toLowerCase()) ||
           collection.staffMember.toLowerCase().includes(searchTerm.toLowerCase()) ||
           collection.id.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Ordenar colecciones
  const sortedCollections = [...displayedCollections].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];
    
    // Handle date comparison
    if (sortField === 'date' || sortField === 'createdAt') {
      aValue = new Date(aValue as string).getTime();
      bValue = new Date(bValue as string).getTime();
    }
    
    // Handle numeric comparison
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    // Handle string comparison
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue) 
        : bValue.localeCompare(aValue);
    }
    
    return 0;
  });

  // Cuando se selecciona una colección para ver detalles
  useEffect(() => {
    if (selectedCollectionId) {
      const collection = collections.find(c => c.id === selectedCollectionId);
      if (collection) {
        setSelectedCollectionData(collection);
      }
    } else {
      setSelectedCollectionData(null);
    }
  }, [selectedCollectionId, collections]);

  const handleSort = (field: keyof Collection) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newFilters = {
      startDate: filterFormData.startDate || null,
      endDate: filterFormData.endDate || null,
      clientId: filterFormData.clientId ? parseInt(filterFormData.clientId) : null,
      machineId: filterFormData.machineId || null,
      minAmount: filterFormData.minAmount ? parseFloat(filterFormData.minAmount) : null,
      maxAmount: filterFormData.maxAmount ? parseFloat(filterFormData.maxAmount) : null,
      staffMember: filterFormData.staffMember || null
    };
    
    dispatch(setFilters(newFilters));
    setIsFilterDialogOpen(false);
  };

  const handleClearFilters = () => {
    dispatch(clearFilters());
    setFilterFormData({
      startDate: '',
      endDate: '',
      clientId: '',
      machineId: '',
      minAmount: '',
      maxAmount: '',
      staffMember: ''
    });
    setIsFilterDialogOpen(false);
  };

  const handleGenerateReport = () => {
    // In a real application, this would generate a proper report
    // For now, we'll just export the filtered data to CSV
    
    const reportFilters = {
      startDate: reportStartDate || null,
      endDate: reportEndDate || null,
      clientId: reportClientId ? parseInt(reportClientId) : null,
      machineId: reportMachineId || null
    };
    
    // Apply filters to get the report data
    let reportData = collections.filter(collection => {
      if (reportFilters.startDate && new Date(collection.date) < new Date(reportFilters.startDate)) {
        return false;
      }
      if (reportFilters.endDate && new Date(collection.date) > new Date(reportFilters.endDate)) {
        return false;
      }
      if (reportFilters.clientId && collection.clientId !== reportFilters.clientId) {
        return false;
      }
      if (reportFilters.machineId && collection.machineId !== reportFilters.machineId) {
        return false;
      }
      return true;
    });
    
    // Prepare data for export
    const exportData = reportData.map(collection => {
      const machine = machines.find(m => m.id === collection.machineId);
      const client = clients.find(c => c.id === collection.clientId);
      
      return {
        ID: collection.id,
        Fecha: formatDate(collection.date),
        Cliente: client?.name || 'Desconocido',
        Máquina: machine?.serialNumber || 'Desconocida',
        'Contador Anterior': collection.previousCounter,
        'Contador Actual': collection.currentCounter,
        'Diferencia': collection.currentCounter - collection.previousCounter,
        'Distribución': collection.distributionPercentage || 50,
        Importe: collection.amount,
        Técnico: collection.staffMember,
        'Método de Pago': collection.collectionMethod || 'Efectivo',
        Notas: collection.notes || ''
      };
    });
    
    // Generate report title
    let reportTitle = 'Informe_Recaudaciones';
    if (reportFilters.clientId) {
      const clientName = clients.find(c => c.id === reportFilters.clientId)?.name;
      reportTitle += `_Cliente_${clientName}`;
    }
    if (reportFilters.machineId) {
      const machineSerial = machines.find(m => m.id === reportFilters.machineId)?.serialNumber;
      reportTitle += `_Maquina_${machineSerial}`;
    }
    if (reportFilters.startDate || reportFilters.endDate) {
      reportTitle += `_${reportFilters.startDate || 'Inicio'}_a_${reportFilters.endDate || 'Fin'}`;
    }
    
    // Export to CSV
    exportToCSV(exportData, reportTitle);
    
    toast({
      title: "Informe generado",
      description: "El informe ha sido generado y descargado como CSV.",
      duration: 3000,
    });
    
    setIsReportDialogOpen(false);
  };

  // Función para obtener el nombre del cliente
  const getClientName = (clientId: number) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : 'Cliente desconocido';
  };

  // Función para obtener el número de serie de la máquina
  const getMachineSerial = (machineId: string) => {
    const machine = machines.find(m => m.id === machineId);
    return machine ? machine.serialNumber : 'Máquina desconocida';
  };

  // Calcular estadísticas de recaudación
  const totalCollected = filteredCollections.reduce((sum, collection) => sum + collection.amount, 0);
  const averageCollection = filteredCollections.length > 0 ? totalCollected / filteredCollections.length : 0;
  const highestCollection = filteredCollections.length > 0 
    ? Math.max(...filteredCollections.map(c => c.amount)) 
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recaudaciones</h1>
          <p className="text-muted-foreground">Gestiona los registros de recaudación de tus máquinas.</p>
        </div>
      </div>
      
      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Recaudado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCollected)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredCollections.length} recaudaciones
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Promedio por Recaudación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(averageCollection)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Por cada recaudación registrada
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Mayor Recaudación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(highestCollection)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Valor más alto registrado
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="flex flex-wrap gap-2 justify-between">
        <div className="space-x-2">
          <Dialog open={isNewCollectionDialogOpen} onOpenChange={setIsNewCollectionDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="default">
                <Plus className="mr-2 h-4 w-4" /> Nueva Recaudación
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px]">
              <DialogHeader>
                <DialogTitle>Registrar Nueva Recaudación</DialogTitle>
                <DialogDescription>
                  Ingresa los datos de la recaudación realizada.
                </DialogDescription>
              </DialogHeader>
              <CollectionForm 
                onSuccess={() => setIsNewCollectionDialogOpen(false)}
                onCancel={() => setIsNewCollectionDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>

          {/* Diálogo de filtros */}
          <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" /> Filtros
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Filtrar Recaudaciones</DialogTitle>
                <DialogDescription>
                  Aplica filtros para encontrar recaudaciones específicas.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleFilterSubmit} className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid w-full gap-1.5">
                    <Label htmlFor="startDate">Fecha Inicio</Label>
                    <Input 
                      id="startDate" 
                      type="date"
                      value={filterFormData.startDate}
                      onChange={(e) => setFilterFormData(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  <div className="grid w-full gap-1.5">
                    <Label htmlFor="endDate">Fecha Fin</Label>
                    <Input 
                      id="endDate" 
                      type="date"
                      value={filterFormData.endDate}
                      onChange={(e) => setFilterFormData(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid w-full gap-1.5">
                    <Label htmlFor="clientId">Cliente</Label>
                    <select 
                      id="clientId"
                      value={filterFormData.clientId}
                      onChange={(e) => setFilterFormData(prev => ({ ...prev, clientId: e.target.value }))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Todos los clientes</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid w-full gap-1.5">
                    <Label htmlFor="machineId">Máquina</Label>
                    <select 
                      id="machineId"
                      value={filterFormData.machineId}
                      onChange={(e) => setFilterFormData(prev => ({ ...prev, machineId: e.target.value }))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Todas las máquinas</option>
                      {machines.map((machine) => (
                        <option key={machine.id} value={machine.id}>
                          {machine.serialNumber} - {machine.model}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid w-full gap-1.5">
                    <Label htmlFor="minAmount">Importe Mínimo (€)</Label>
                    <Input 
                      id="minAmount" 
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={filterFormData.minAmount}
                      onChange={(e) => setFilterFormData(prev => ({ ...prev, minAmount: e.target.value }))}
                    />
                  </div>
                  <div className="grid w-full gap-1.5">
                    <Label htmlFor="maxAmount">Importe Máximo (€)</Label>
                    <Input 
                      id="maxAmount" 
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={filterFormData.maxAmount}
                      onChange={(e) => setFilterFormData(prev => ({ ...prev, maxAmount: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid w-full gap-1.5">
                  <Label htmlFor="staffMember">Técnico</Label>
                  <Input 
                    id="staffMember" 
                    placeholder="Nombre del técnico"
                    value={filterFormData.staffMember}
                    onChange={(e) => setFilterFormData(prev => ({ ...prev, staffMember: e.target.value }))}
                  />
                </div>

                <div className="flex justify-between pt-4">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={handleClearFilters}
                  >
                    Limpiar Filtros
                  </Button>
                  <div className="space-x-2">
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => setIsFilterDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" variant="default">Aplicar Filtros</Button>
                  </div>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Diálogo de informes */}
          <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <BarChart3 className="mr-2 h-4 w-4" /> Informes
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Generar Informe</DialogTitle>
                <DialogDescription>
                  Configura los parámetros para generar un informe de recaudaciones.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid w-full gap-1.5">
                  <Label htmlFor="reportType">Tipo de Informe</Label>
                  <select 
                    id="reportType"
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="client">Por Cliente</option>
                    <option value="machine">Por Máquina</option>
                    <option value="period">Por Período</option>
                    <option value="comparative">Comparativo</option>
                  </select>
                </div>

                {reportType === 'client' && (
                  <div className="grid w-full gap-1.5">
                    <Label htmlFor="reportClientId">Cliente</Label>
                    <select 
                      id="reportClientId"
                      value={reportClientId}
                      onChange={(e) => setReportClientId(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Todos los clientes</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {reportType === 'machine' && (
                  <div className="grid w-full gap-1.5">
                    <Label htmlFor="reportMachineId">Máquina</Label>
                    <select 
                      id="reportMachineId"
                      value={reportMachineId}
                      onChange={(e) => setReportMachineId(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Todas las máquinas</option>
                      {machines.map((machine) => (
                        <option key={machine.id} value={machine.id}>
                          {machine.serialNumber} - {machine.model}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {(reportType === 'period' || reportType === 'comparative') && (
                  <div className="grid w-full gap-1.5">
                    <Label htmlFor="reportPeriod">Período</Label>
                    <select 
                      id="reportPeriod"
                      value={reportPeriod}
                      onChange={(e) => setReportPeriod(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="day">Diario</option>
                      <option value="week">Semanal</option>
                      <option value="month">Mensual</option>
                      <option value="year">Anual</option>
                      <option value="custom">Personalizado</option>
                    </select>
                  </div>
                )}

                {reportPeriod === 'custom' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid w-full gap-1.5">
                      <Label htmlFor="reportStartDate">Fecha Inicio</Label>
                      <Input 
                        id="reportStartDate" 
                        type="date"
                        value={reportStartDate}
                        onChange={(e) => setReportStartDate(e.target.value)}
                      />
                    </div>
                    <div className="grid w-full gap-1.5">
                      <Label htmlFor="reportEndDate">Fecha Fin</Label>
                      <Input 
                        id="reportEndDate" 
                        type="date"
                        value={reportEndDate}
                        onChange={(e) => setReportEndDate(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setIsReportDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="button" 
                    variant="default"
                    onClick={handleGenerateReport}
                  >
                    Generar Informe
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Diálogo de historial */}
          <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Calendar className="mr-2 h-4 w-4" /> Historial
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px]">
              <DialogHeader>
                <DialogTitle>Historial de Recaudaciones</DialogTitle>
                <DialogDescription>
                  Visualiza el historial de recaudaciones por máquina o cliente.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="grid w-full gap-1.5">
                    <Label htmlFor="historyClientId">Cliente</Label>
                    <select 
                      id="historyClientId"
                      value={historyClientId || ''}
                      onChange={(e) => setHistoryClientId(e.target.value ? parseInt(e.target.value) : null)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Todos los clientes</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid w-full gap-1.5">
                    <Label htmlFor="historyMachineId">Máquina</Label>
                    <select
                      id="historyMachineId"
                      value={historyMachineId || ''}
                      onChange={(e) => setHistoryMachineId(e.target.value || null)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Todas las máquinas</option>
                      {machines.map((machine) => (
                        <option key={machine.id} value={machine.id}>
                          {machine.serialNumber} - {machine.model}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <CollectionHistory 
                  clientId={historyClientId} 
                  machineId={historyMachineId}
                />
              </div>
            </DialogContent>
          </Dialog>

          {/* Diálogo de auditoría */}
          <Dialog open={isAuditDialogOpen} onOpenChange={setIsAuditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <File className="mr-2 h-4 w-4" /> Auditoría
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px]">
              <DialogHeader>
                <DialogTitle>Auditoría de Recaudaciones</DialogTitle>
                <DialogDescription>
                  Registro de cambios y actividades en las recaudaciones.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <CollectionAuditTrail />
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="space-x-2">
          <Button variant="violet" onClick={() => {
            // Exportar a CSV
            const exportData = sortedCollections.map(collection => {
              const machine = machines.find(m => m.id === collection.machineId);
              const client = clients.find(c => c.id === collection.clientId);
              
              return {
                ID: collection.id,
                Fecha: formatDate(collection.date),
                Cliente: client?.name || 'Desconocido',
                Máquina: machine?.serialNumber || 'Desconocida',
                'Contador Anterior': collection.previousCounter,
                'Contador Actual': collection.currentCounter,
                'Diferencia': collection.currentCounter - collection.previousCounter,
                'Distribución': collection.distributionPercentage || 50,
                Importe: collection.amount,
                Técnico: collection.staffMember,
                'Método de Pago': collection.collectionMethod || 'Efectivo',
                Notas: collection.notes || ''
              };
            });
            
            exportToCSV(exportData, 'Recaudaciones');
            
            toast({
              title: "Exportación completada",
              description: "Los datos han sido exportados a CSV.",
              duration: 3000,
            });
          }}>
            <Download className="mr-2 h-4 w-4" /> Exportar
          </Button>
          <Button variant="violet">
            <Printer className="mr-2 h-4 w-4" /> Imprimir
          </Button>
        </div>
      </div>
      
      <div className="flex items-center space-x-2 mb-4">
        <Search className="h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Buscar por cliente, máquina, técnico o ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Diálogo de detalles de recaudación */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Detalles de Recaudación</DialogTitle>
            <DialogDescription>
              Información completa de la recaudación seleccionada.
            </DialogDescription>
          </DialogHeader>
          {selectedCollectionData && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium">ID de Recaudación</h3>
                  <p className="text-sm">{selectedCollectionData.id}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium">Fecha</h3>
                  <p className="text-sm">{formatDate(selectedCollectionData.date, true)}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium">Cliente</h3>
                  <p className="text-sm">{getClientName(selectedCollectionData.clientId)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium">Máquina</h3>
                  <p className="text-sm">{getMachineSerial(selectedCollectionData.machineId)}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <h3 className="text-sm font-medium">Contador Anterior</h3>
                  <p className="text-sm">{selectedCollectionData.previousCounter}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium">Contador Actual</h3>
                  <p className="text-sm">{selectedCollectionData.currentCounter}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium">Diferencia</h3>
                  <p className="text-sm">{selectedCollectionData.currentCounter - selectedCollectionData.previousCounter}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium">Importe</h3>
                  <p className="text-sm font-bold">{formatCurrency(selectedCollectionData.amount)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium">Distribución</h3>
                  <p className="text-sm">{selectedCollectionData.distributionPercentage || 50}%</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium">Técnico</h3>
                  <p className="text-sm">{selectedCollectionData.staffMember}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium">Método de Pago</h3>
                  <p className="text-sm">{selectedCollectionData.collectionMethod || 'Efectivo'}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium">Ticket</h3>
                  <p className="text-sm">{selectedCollectionData.ticketNumber || '-'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium">Factura</h3>
                  <p className="text-sm">{selectedCollectionData.invoiceNumber || '-'}</p>
                </div>
              </div>
              
              {selectedCollectionData.notes && (
                <div>
                  <h3 className="text-sm font-medium">Notas</h3>
                  <p className="text-sm">{selectedCollectionData.notes}</p>
                </div>
              )}
              
              {selectedCollectionData.signatureData && (
                <div>
                  <h3 className="text-sm font-medium">Firma Digital</h3>
                  <div className="mt-2 border rounded-md p-2 bg-background">
                    <img 
                      src={selectedCollectionData.signatureData} 
                      alt="Firma digital" 
                      className="max-h-[100px] mx-auto"
                    />
                  </div>
                </div>
              )}
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setIsDetailDialogOpen(false)}
                >
                  Cerrar
                </Button>
                <Button 
                  type="button" 
                  variant="default"
                  onClick={() => {
                    // Imprimir detalles (simulado)
                    toast({
                      title: "Impresión",
                      description: "Enviando a impresora...",
                      duration: 3000,
                    });
                  }}
                >
                  <Printer className="mr-2 h-4 w-4" /> Imprimir
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card className="bg-card">
        <CardHeader className="pb-2">
          <CardTitle>Registro de Recaudaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead className="text-sm text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left">
                    <button 
                      className="flex items-center"
                      onClick={() => handleSort('id')}
                    >
                      ID {sortField === 'id' && (
                        <ArrowUpDown className="ml-1 h-3 w-3" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button 
                      className="flex items-center"
                      onClick={() => handleSort('date')}
                    >
                      Fecha {sortField === 'date' && (
                        <ArrowUpDown className="ml-1 h-3 w-3" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">Cliente</th>
                  <th className="px-4 py-3 text-left">Máquina</th>
                  <th className="px-4 py-3 text-right">
                    <button 
                      className="flex items-center ml-auto"
                      onClick={() => handleSort('amount')}
                    >
                      Importe {sortField === 'amount' && (
                        <ArrowUpDown className="ml-1 h-3 w-3" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">Técnico</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sortedCollections.map((collection) => (
                  <tr key={collection.id} className="border-b border-border">
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <File className="h-4 w-4 mr-2 text-muted-foreground" />
                        {collection.id.substring(0, 8)}
                      </div>
                    </td>
                    <td className="px-4 py-3">{formatDate(collection.date)}</td>
                    <td className="px-4 py-3 font-medium">{getClientName(collection.clientId)}</td>
                    <td className="px-4 py-3">{getMachineSerial(collection.machineId)}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(collection.amount)}</td>
                    <td className="px-4 py-3">{collection.staffMember}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end space-x-2">
                        <Button 
                          variant="violet" 
                          size="sm"
                          onClick={() => {
                            // Abrir diálogo de edición (no implementado en este ejemplo)
                            toast({
                              title: "Editar",
                              description: "Función de edición en desarrollo",
                              duration: 3000,
                            });
                          }}
                        >
                          Editar
                        </Button>
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => {
                            setSelectedCollectionId(collection.id);
                            setIsDetailDialogOpen(true);
                          }}
                        >
                          Detalle
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {sortedCollections.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      No se encontraron recaudaciones con los filtros aplicados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CollectionsPage;
