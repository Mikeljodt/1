import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Download, Upload, Search, CheckCircle2, Printer, QrCode, Share2, Package, Building, ArrowRightLeft, History } from 'lucide-react';
import { getStatusConfig } from '@/lib/utils';
import { MachineQRCode } from '@/components/MachineQRCode';
import { RootState, AppDispatch } from '@/store';
import { fetchMachines, addMachine, updateMachine, deleteMachine, installMachine, transferMachine } from '@/store/slices/machinesSlice';
import { fetchClients } from '@/store/slices/clientsSlice';
import { fetchAllCounters, updateMachineCounter } from '@/store/slices/counterSlice';
import { fetchCollectionsByMachine } from '@/store/slices/collectionsSlice';
import { toast } from '@/components/ui/use-toast';
import { CounterSelector } from '@/components/CounterSelector';
import { SignaturePad } from '@/components/SignatureCanvas';
import { CollectionHistory } from '@/components/CollectionHistory';

const MachinesPage = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { machines, status } = useSelector((state: RootState) => state.machines);
  const { clients } = useSelector((state: RootState) => state.clients);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados para el diálogo de nueva máquina
  const [isNewMachineDialogOpen, setIsNewMachineDialogOpen] = useState(false);
  const [newMachineFormData, setNewMachineFormData] = useState({
    serialNumber: '',
    type: 'arcade',
    model: '',
    brand: '',
    purchasePrice: '',
    purchaseDate: '',
    initialCounter: '',
    description: '',
    hasManual: false,
    hasWarrantyDoc: false,
  });
  
  // Estados para el diálogo de instalación
  const [isInstallDialogOpen, setIsInstallDialogOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<number | null>(null);
  const [installationFormData, setInstallationFormData] = useState({
    responsibleName: '',
    responsibleId: '',
    acceptedTerms: false,
    installationDate: new Date().toISOString().split('T')[0],
    lastCounter: '',
    signatureData: '',
    technician: '',
  });
  
  // Estados para el diálogo de traslado
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [transferMachineId, setTransferMachineId] = useState<string | null>(null);
  const [transferFormData, setTransferFormData] = useState({
    fromClientId: 0,
    toClientId: null as number | null,
    responsibleName: '',
    responsibleId: '',
    transferDate: new Date().toISOString().split('T')[0],
    currentCounter: '',
    observations: '',
    technician: '',
    signatureData: '',
  });
  
  // Estado para el diálogo de QR
  const [selectedQRMachine, setSelectedQRMachine] = useState<any>(null);

  // Estado para el diálogo de historial
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [historyMachineId, setHistoryMachineId] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchMachines());
    dispatch(fetchClients());
    dispatch(fetchAllCounters());
  }, [dispatch]);

  // Cuando se selecciona una máquina para traslado, cargar sus datos actuales
  useEffect(() => {
    if (transferMachineId) {
      const machine = machines.find(m => m.id === transferMachineId);
      if (machine && machine.clientId) {
        setTransferFormData(prev => ({
          ...prev,
          fromClientId: parseInt(machine.clientId),
          currentCounter: machine.currentCounter.toString()
        }));
      }
    }
  }, [transferMachineId, machines]);

  const filteredMachines = machines.filter(machine => 
    machine.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    machine.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    machine.brand?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Máquinas disponibles para instalación (solo las que están en almacén)
  const availableMachines = machines.filter(machine => machine.status === 'warehouse');
  
  // Máquinas instaladas para el card de resumen
  const installedMachines = machines.filter(machine => machine.status === 'installed');

  // Agrupación de máquinas por tipo para los cards de resumen
  const machinesByType = machines.reduce((acc, machine) => {
    const type = machine.type || 'unknown';
    if (!acc[type]) {
      acc[type] = { total: 0, installed: 0, warehouse: 0 };
    }
    acc[type].total += 1;
    
    if (machine.status === 'installed') {
      acc[type].installed += 1;
    } else if (machine.status === 'warehouse') {
      acc[type].warehouse += 1;
    }
    
    return acc;
  }, {} as Record<string, { total: number, installed: number, warehouse: number }>);

  const handleNewMachineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Preparar los datos para enviar al servidor
      const machineData = {
        ...newMachineFormData,
        cost: parseFloat(newMachineFormData.purchasePrice || '0'),
        status: 'warehouse' as 'warehouse',
        initialCounter: parseInt(newMachineFormData.initialCounter || '0'),
        splitPercentage: 50,
        description: newMachineFormData.description || '',
        hasManual: newMachineFormData.hasManual || false,
        hasWarrantyDoc: newMachineFormData.hasWarrantyDoc || false,
        // Set default values for removed fields
        warranty: 0,
        supplier: '',
        initialStatus: 'new',
      };

      const result = await dispatch(addMachine(machineData)).unwrap();
      
      // Update counter system with initial value
      if (result && result.id) {
        await dispatch(updateMachineCounter({
          machineId: result.id,
          newCounter: parseInt(newMachineFormData.initialCounter || '0'),
          source: 'installation'
        }));
      }
      
      toast({
        title: "¡Máquina creada!",
        description: "La máquina ha sido añadida exitosamente al inventario.",
        icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
        duration: 3000,
      });
      
      setIsNewMachineDialogOpen(false);
      // Resetear el formulario
      setNewMachineFormData({
        serialNumber: '',
        type: 'arcade',
        model: '',
        brand: '',
        purchasePrice: '',
        purchaseDate: '',
        initialCounter: '',
        description: '',
        hasManual: false,
        hasWarrantyDoc: false,
      });
    } catch (error) {
      console.error('Error al crear la máquina:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la máquina. Por favor, intente nuevamente.",
        variant: "destructive",
      });
    }
  };

  const handleInstallSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedMachine || !selectedClient) {
      toast({
        title: "Error",
        description: "Por favor selecciona una máquina y un cliente.",
        variant: "destructive",
      });
      return;
    }

    if (!installationFormData.acceptedTerms) {
      toast({
        title: "Error",
        description: "Debes aceptar las condiciones de instalación.",
        variant: "destructive",
      });
      return;
    }

    if (!installationFormData.lastCounter || !installationFormData.technician) {
      toast({
        title: "Error",
        description: "Todos los campos obligatorios deben ser completados.",
        variant: "destructive",
      });
      return;
    }

    if (!installationFormData.signatureData) {
      toast({
        title: "Error",
        description: "Se requiere la firma digital para completar la instalación.",
        variant: "destructive",
      });
      return;
    }

    const selectedMachineData = machines.find(m => m.id === selectedMachine);
    if (!selectedMachineData) {
      toast({
        title: "Error",
        description: "No se pudo encontrar la máquina seleccionada.",
        variant: "destructive",
      });
      return;
    }

    try {
      const counterValue = parseInt(installationFormData.lastCounter) || selectedMachineData.currentCounter;
      
      // First update the machine installation
      await dispatch(installMachine({
        machineId: selectedMachine,
        clientId: selectedClient,
        installationData: {
          responsibleName: installationFormData.responsibleName,
          responsibleId: installationFormData.responsibleId,
          acceptedTerms: installationFormData.acceptedTerms,
          acceptedResponsibility: true, // Mantenemos este valor por defecto para compatibilidad
          acceptanceDate: new Date().toISOString(),
          installationDate: installationFormData.installationDate,
          installationCounter: counterValue,
          location: "N/A", // Mantenemos este campo por compatibilidad
          observations: "Firma digital registrada", // Nota sobre firma digital
          technician: installationFormData.technician
        }
      })).unwrap();
      
      // Then update the counter in the counter system
      await dispatch(updateMachineCounter({
        machineId: selectedMachine,
        newCounter: counterValue,
        source: 'installation',
        notes: `Instalación en cliente ID: ${selectedClient}`
      }));

      // Store the signature in a collection specific to signatures
      // This would typically be done through a dedicated API endpoint
      // For now, we'll just log it to console
      console.log("Signature data stored:", {
        machineId: selectedMachine,
        clientId: selectedClient,
        type: 'installation',
        date: new Date().toISOString(),
        signatureData: installationFormData.signatureData
      });

      toast({
        title: "¡Máquina instalada!",
        description: "La máquina ha sido instalada exitosamente con firma digital.",
        icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
        duration: 3000,
      });

      setIsInstallDialogOpen(false);
      resetInstallationForm();
      dispatch(fetchMachines());
    } catch (error) {
      console.error('Error al instalar la máquina:', error);
      toast({
        title: "Error",
        description: "No se pudo instalar la máquina. Por favor, intente nuevamente.",
        variant: "destructive",
      });
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!transferMachineId || !transferFormData.toClientId) {
      toast({
        title: "Error",
        description: "Por favor selecciona un cliente destino válido.",
        variant: "destructive",
      });
      return;
    }

    if (transferFormData.fromClientId === transferFormData.toClientId) {
      toast({
        title: "Error",
        description: "El cliente origen y destino no pueden ser el mismo.",
        variant: "destructive",
      });
      return;
    }

    if (!transferFormData.responsibleName || !transferFormData.responsibleId || !transferFormData.technician) {
      toast({
        title: "Error",
        description: "Todos los campos obligatorios deben ser completados.",
        variant: "destructive",
      });
      return;
    }

    if (!transferFormData.signatureData) {
      toast({
        title: "Error",
        description: "Se requiere la firma digital para completar el traslado.",
        variant: "destructive",
      });
      return;
    }

    try {
      const counterValue = parseInt(transferFormData.currentCounter) || 0;
      
      // Ejecutar el traslado de la máquina
      await dispatch(transferMachine({
        machineId: transferMachineId,
        fromClientId: transferFormData.fromClientId,
        toClientId: transferFormData.toClientId,
        transferData: {
          responsibleName: transferFormData.responsibleName,
          responsibleId: transferFormData.responsibleId,
          transferDate: transferFormData.transferDate,
          currentCounter: counterValue,
          observations: transferFormData.observations || "Traslado estándar",
          technician: transferFormData.technician,
          signatureData: transferFormData.signatureData
        }
      })).unwrap();
      
      // Actualizar el contador en el sistema de contadores
      await dispatch(updateMachineCounter({
        machineId: transferMachineId,
        newCounter: counterValue,
        source: 'transfer',
        notes: `Traslado desde cliente ID: ${transferFormData.fromClientId} a cliente ID: ${transferFormData.toClientId}`
      }));

      toast({
        title: "¡Máquina trasladada!",
        description: "La máquina ha sido trasladada exitosamente al nuevo cliente.",
        icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
        duration: 3000,
      });

      setIsTransferDialogOpen(false);
      resetTransferForm();
      dispatch(fetchMachines());
    } catch (error) {
      console.error('Error al trasladar la máquina:', error);
      toast({
        title: "Error",
        description: "No se pudo trasladar la máquina. Por favor, intente nuevamente.",
        variant: "destructive",
      });
    }
  };

  const resetInstallationForm = () => {
    setSelectedMachine(null);
    setSelectedClient(null);
    setInstallationFormData({
      responsibleName: '',
      responsibleId: '',
      acceptedTerms: false,
      installationDate: new Date().toISOString().split('T')[0],
      lastCounter: '',
      signatureData: '',
      technician: '',
    });
  };

  const resetTransferForm = () => {
    setTransferMachineId(null);
    setTransferFormData({
      fromClientId: 0,
      toClientId: null,
      responsibleName: '',
      responsibleId: '',
      transferDate: new Date().toISOString().split('T')[0],
      currentCounter: '',
      observations: '',
      technician: '',
      signatureData: '',
    });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta máquina?')) {
      try {
        await dispatch(deleteMachine(id)).unwrap();
        toast({
          title: "Máquina eliminada",
          description: "La máquina ha sido eliminada correctamente.",
          duration: 3000,
        });
      } catch (error) {
        console.error('Error al eliminar la máquina:', error);
        toast({
          title: "Error",
          description: "No se pudo eliminar la máquina.",
          variant: "destructive",
        });
      }
    }
  };

  const handleViewHistory = (machineId: string) => {
    setHistoryMachineId(machineId);
    dispatch(fetchCollectionsByMachine(machineId));
    setIsHistoryDialogOpen(true);
  };

  // Función para renderizar el tipo de máquina en español
  const getMachineTypeLabel = (type: string): string => {
    const typeLabels: Record<string, string> = {
      'arcade': 'Arcade',
      'pinball': 'Pinball',
      'redemption': 'Redención',
      'darts': 'Diana Electrónica',
      'foosball': 'Futbolín',
      'billiards': 'Billar',
      'other': 'Otro'
    };
    
    return typeLabels[type] || 'Desconocido';
  };

  // Función para obtener el nombre del cliente a partir de su ID
  const getClientName = (clientId: string | undefined): string => {
    if (!clientId) return '-';
    const client = clients.find(c => c.id.toString() === clientId);
    return client ? client.name : `Cliente ID: ${clientId}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Máquinas</h1>
          <p className="text-muted-foreground">Gestiona tu inventario de máquinas</p>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2 justify-between">
        <div className="space-x-2">
          {/* Diálogo para Nueva Máquina */}
          <Dialog open={isNewMachineDialogOpen} onOpenChange={setIsNewMachineDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="default">
                <Plus className="mr-2 h-4 w-4" /> Nueva Máquina
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Añadir Nueva Máquina</DialogTitle>
                <DialogDescription>
                  Por favor, completa los datos de la nueva máquina.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleNewMachineSubmit} className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid w-full gap-1.5">
                    <Label htmlFor="serialNumber">Número de Serie</Label>
                    <Input 
                      id="serialNumber" 
                      placeholder="Número de serie único"
                      value={newMachineFormData.serialNumber}
                      onChange={(e) => setNewMachineFormData(prev => ({ ...prev, serialNumber: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="grid w-full gap-1.5">
                    <Label htmlFor="type">Tipo de Máquina</Label>
                    <select 
                      id="type"
                      value={newMachineFormData.type}
                      onChange={(e) => setNewMachineFormData(prev => ({ ...prev, type: e.target.value }))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      required
                    >
                      <option value="">Seleccionar tipo</option>
                      <option value="arcade">Arcade</option>
                      <option value="pinball">Pinball</option>
                      <option value="redemption">Redención</option>
                      <option value="darts">Diana Electrónica</option>
                      <option value="foosball">Futbolín</option>
                      <option value="billiards">Billar</option>
                      <option value="other">Otro</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid w-full gap-1.5">
                    <Label htmlFor="model">Modelo</Label>
                    <Input 
                      id="model" 
                      placeholder="Modelo de la máquina"
                      value={newMachineFormData.model}
                      onChange={(e) => setNewMachineFormData(prev => ({ ...prev, model: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="grid w-full gap-1.5">
                    <Label htmlFor="brand">Marca</Label>
                    <Input 
                      id="brand" 
                      placeholder="Marca del fabricante"
                      value={newMachineFormData.brand}
                      onChange={(e) => setNewMachineFormData(prev => ({ ...prev, brand: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid w-full gap-1.5">
                    <Label htmlFor="purchasePrice">Precio de Compra (€)</Label>
                    <Input 
                      id="purchasePrice" 
                      type="number" 
                      min="0" 
                      step="0.01" 
                      placeholder="0.00"
                      value={newMachineFormData.purchasePrice}
                      onChange={(e) => setNewMachineFormData(prev => ({ ...prev, purchasePrice: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="grid w-full gap-1.5">
                    <Label htmlFor="purchaseDate">Fecha de Compra</Label>
                    <Input 
                      id="purchaseDate" 
                      type="date"
                      value={newMachineFormData.purchaseDate}
                      onChange={(e) => setNewMachineFormData(prev => ({ ...prev, purchaseDate: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="grid w-full gap-1.5">
                  <Label htmlFor="initialCounter">Contador Inicial</Label>
                  <Input 
                    id="initialCounter" 
                    type="number" 
                    min="0" 
                    placeholder="0"
                    value={newMachineFormData.initialCounter}
                    onChange={(e) => setNewMachineFormData(prev => ({ ...prev, initialCounter: e.target.value }))}
                    required
                  />
                </div>

                <div className="grid w-full gap-1.5">
                  <Label htmlFor="description">Descripción</Label>
                  <textarea
                    id="description"
                    rows={3}
                    placeholder="Descripción detallada de la máquina..."
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={newMachineFormData.description}
                    onChange={(e) => setNewMachineFormData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <div className="grid w-full gap-1.5">
                  <Label>Documentación</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="hasManual"
                        className="h-4 w-4 rounded border-gray-300"
                        checked={newMachineFormData.hasManual}
                        onChange={(e)=> setNewMachineFormData(prev => ({ ...prev, hasManual: e.target.checked }))}
                      />
                      <Label htmlFor="hasManual" className="text-sm font-normal">
                        Manual de usuario
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="hasWarrantyDoc"
                        className="h-4 w-4 rounded border-gray-300"
                        checked={newMachineFormData.hasWarrantyDoc}
                        onChange={(e) => setNewMachineFormData(prev => ({ ...prev, hasWarrantyDoc: e.target.checked }))}
                      />
                      <Label htmlFor="hasWarrantyDoc" className="text-sm font-normal">
                        Documento de garantía
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsNewMachineDialogOpen(false);
                      setNewMachineFormData({
                        serialNumber: '',
                        type: 'arcade',
                        model: '',
                        brand: '',
                        purchasePrice: '',
                        purchaseDate: '',
                        initialCounter: '',
                        description: '',
                        hasManual: false,
                        hasWarrantyDoc: false,
                      });
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    variant="default"
                  >
                    Guardar Máquina
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Diálogo para Instalación de Máquina */}
          <Dialog open={isInstallDialogOpen} onOpenChange={setIsInstallDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" /> Instalación
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Instalar Máquina en Cliente</DialogTitle>
                <DialogDescription>
                  Selecciona una máquina y un cliente para realizar la instalación.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleInstallSubmit} className="space-y-4 py-4">
                <div className="grid w-full gap-1.5">
                  <Label htmlFor="machine">Máquina</Label>
                  <select 
                    id="machine"
                    value={selectedMachine || ''}
                    onChange={(e) => setSelectedMachine(e.target.value || null)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  >
                    <option value="">Seleccionar máquina</option>
                    {availableMachines.map((machine) => (
                      <option key={machine.id} value={machine.id}>
                        {machine.serialNumber} - {machine.model} ({machine.brand})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid w-full gap-1.5">
                  <Label htmlFor="client">Cliente</Label>
                  <select 
                    id="client"
                    value={selectedClient || ''}
                    onChange={(e) => setSelectedClient(e.target.value ? parseInt(e.target.value) : null)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  >
                    <option value="">Seleccionar cliente</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid w-full gap-1.5">
                    <Label htmlFor="responsibleName">Nombre del Responsable</Label>
                    <Input 
                      id="responsibleName" 
                      placeholder="Nombre completo"
                      value={installationFormData.responsibleName}
                      onChange={(e) => setInstallationFormData(prev => ({ ...prev, responsibleName: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="grid w-full gap-1.5">
                    <Label htmlFor="responsibleId">DNI/NIE del Responsable</Label>
                    <Input 
                      id="responsibleId" 
                      placeholder="Documento de identidad"
                      value={installationFormData.responsibleId}
                      onChange={(e) => setInstallationFormData(prev => ({ ...prev, responsibleId: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="grid w-full gap-1.5">
                  <Label htmlFor="installationDate">Fecha de Instalación</Label>
                  <Input 
                    id="installationDate" 
                    type="date"
                    value={installationFormData.installationDate}
                    onChange={(e) => setInstallationFormData(prev => ({ ...prev, installationDate: e.target.value }))}
                    required
                  />
                </div>

                {/* Reemplazado el campo de contador con el componente CounterSelector */}
                <CounterSelector
                  machineId={selectedMachine}
                  value={installationFormData.lastCounter}
                  onChange={(value) => setInstallationFormData(prev => ({ ...prev, lastCounter: value }))}
                  label="Último Contador Registrado"
                  required={true}
                />

                <div className="grid w-full gap-1.5">
                  <Label htmlFor="technician">Técnico Responsable</Label>
                  <Input 
                    id="technician" 
                    placeholder="Nombre del técnico que realiza la instalación"
                    value={installationFormData.technician}
                    onChange={(e) => setInstallationFormData(prev => ({ ...prev, technician: e.target.value }))}
                    required
                  />
                </div>

                {/* Reemplazado el área de firma manual con el componente SignaturePad */}
                <SignaturePad
                  value={installationFormData.signatureData}
                  onChange={(value) => setInstallationFormData(prev => ({ ...prev, signatureData: value }))}
                  label="Firma Digital del Responsable"
                />

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="acceptedTerms"
                    className="h-4 w-4 rounded border-gray-300"
                    checked={installationFormData.acceptedTerms}
                    onChange={(e) => setInstallationFormData(prev => ({ ...prev, acceptedTerms: e.target.checked }))}
                    required
                  />
                  <Label htmlFor="acceptedTerms" className="text-sm font-normal">
                    El cliente acepta las condiciones de instalación y uso de la máquina
                  </Label>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsInstallDialogOpen(false);
                      resetInstallationForm();
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    variant="default"
                  >
                    Completar Instalación
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Diálogo para Traslado de Máquina */}
          <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Trasladar Máquina a Otro Cliente</DialogTitle>
                <DialogDescription>
                  Completa la información para trasladar la máquina a un nuevo cliente.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleTransferSubmit} className="space-y-4 py-4">
                <div className="grid w-full gap-1.5">
                  <Label>Máquina a Trasladar</Label>
                  <div className="p-3 bg-muted rounded-md">
                    {transferMachineId && (
                      <div className="space-y-1">
                        <p className="font-medium">
                          {machines.find(m => m.id === transferMachineId)?.serialNumber} - 
                          {machines.find(m => m.id === transferMachineId)?.model}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Cliente actual: {getClientName(machines.find(m => m.id === transferMachineId)?.clientId)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid w-full gap-1.5">
                  <Label htmlFor="toClientId">Cliente Destino</Label>
                  <select 
                    id="toClientId"
                    value={transferFormData.toClientId || ''}
                    onChange={(e) => setTransferFormData(prev => ({ 
                      ...prev, 
                      toClientId: e.target.value ? parseInt(e.target.value) : null 
                    }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  >
                    <option value="">Seleccionar cliente destino</option>
                    {clients
                      .filter(client => client.id !== transferFormData.fromClientId) // Excluir el cliente actual
                      .map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))
                    }
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid w-full gap-1.5">
                    <Label htmlFor="transferResponsibleName">Nombre del Responsable</Label>
                    <Input 
                      id="transferResponsibleName" 
                      placeholder="Nombre completo"
                      value={transferFormData.responsibleName}
                      onChange={(e) => setTransferFormData(prev => ({ ...prev, responsibleName: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="grid w-full gap-1.5">
                    <Label htmlFor="transferResponsibleId">DNI/NIE del Responsable</Label>
                    <Input 
                      id="transferResponsibleId" 
                      placeholder="Documento de identidad"
                      value={transferFormData.responsibleId}
                      onChange={(e) => setTransferFormData(prev => ({ ...prev, responsibleId: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid w-full gap-1.5">
                    <Label htmlFor="transferDate">Fecha de Traslado</Label>
                    <Input 
                      id="transferDate" 
                      type="date"
                      value={transferFormData.transferDate}
                      onChange={(e) => setTransferFormData(prev => ({ ...prev, transferDate: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="grid w-full gap-1.5">
                    <Label htmlFor="currentCounter">Contador Actual</Label>
                    <Input 
                      id="currentCounter" 
                      type="number" 
                      min="0" 
                      placeholder="Contador actual"
                      value={transferFormData.currentCounter}
                      onChange={(e) => setTransferFormData(prev => ({ ...prev, currentCounter: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="grid w-full gap-1.5">
                  <Label htmlFor="transferTechnician">Técnico Responsable</Label>
                  <Input 
                    id="transferTechnician" 
                    placeholder="Nombre del técnico que realiza el traslado"
                    value={transferFormData.technician}
                    onChange={(e) => setTransferFormData(prev => ({ ...prev, technician: e.target.value }))}
                    required
                  />
                </div>

                <div className="grid w-full gap-1.5">
                  <Label htmlFor="transferObservations">Observaciones</Label>
                  <textarea
                    id="transferObservations"
                    rows={2}
                    placeholder="Observaciones sobre el traslado..."
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={transferFormData.observations}
                    onChange={(e) => setTransferFormData(prev => ({ ...prev, observations: e.target.value }))}
                  />
                </div>

                <SignaturePad
                  value={transferFormData.signatureData}
                  onChange={(value) => setTransferFormData(prev => ({ ...prev, signatureData: value }))}
                  label="Firma Digital del Responsable"
                />

                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsTransferDialogOpen(false);
                      resetTransferForm();
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    variant="default"
                  >
                    Completar Traslado
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <div className="space-x-2">
          <Button variant="violet">
            <Upload className="mr-2 h-4 w-4" /> Importar
          </Button>
          <Button variant="violet">
            <Download className="mr-2 h-4 w-4" /> Exportar
          </Button>
        </div>
      </div>
      
      <div className="flex items-center space-x-2 mb-4">
        <Search className="h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Buscar por número de serie, modelo o marca..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Diálogo para mostrar el código QR */}
      <Dialog open={selectedQRMachine !== null} onOpenChange={(open) => !open && setSelectedQRMachine(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Código QR de la Máquina</DialogTitle>
            <DialogDescription>
              Escanea o imprime el código QR para acceder a la información de la máquina
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-6">
            <div className="w-72 h-72 bg-violet-500 rounded-xl p-2 shadow-lg flex items-center justify-center">
              <div className="w-[80%] h-[80%] bg-white rounded-lg flex items-center justify-center">
                <div className="w-full h-full">
                  {selectedQRMachine && <MachineQRCode machine={selectedQRMachine} />}
                </div>
              </div>
            </div>
            <div className="w-full space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium">Código:</p>
                  <p className="text-muted-foreground">{selectedQRMachine?.serialNumber}</p>
                </div>
                <div>
                  <p className="font-medium">Tipo:</p>
                  <p className="text-muted-foreground">{selectedQRMachine?.type}</p>
                </div>
                <div>
                  <p className="font-medium">Modelo:</p>
                  <p className="text-muted-foreground">{selectedQRMachine?.model}</p>
                </div>
                <div>
                  <p className="font-medium">Estado:</p>
                  <p className="text-muted-foreground">{selectedQRMachine && getStatusConfig(selectedQRMachine.status).label}</p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Button variant="outline" className="w-full" onClick={() => window.print()}>
                  <Printer className="mr-2 h-4 w-4" />
                  Imprimir QR
                </Button>
                <Button variant="outline" className="w-full" onClick={() => {
                  toast({
                    title: "Compartir",
                    description: "Función de compartir en desarrollo",
                  });
                }}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Compartir QR
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo para historial de recaudaciones */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Historial de Recaudaciones</DialogTitle>
            <DialogDescription>
              {historyMachineId && machines.find(m => m.id === historyMachineId)?.serialNumber} - 
              {historyMachineId && machines.find(m => m.id === historyMachineId)?.model}
            </DialogDescription>
          </DialogHeader>
          {historyMachineId && (
            <CollectionHistory 
              type="machine" 
              id={historyMachineId} 
              showFilters={true}
            />
          )}
        </DialogContent>
      </Dialog>

      <Card className="bg-card">
        <CardHeader className="pb-2">
          <CardTitle>Listado de Máquinas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead className="text-sm text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left w-8">QR</th>
                  <th className="px-4 py-3 text-left">Código</th>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-left">Modelo</th>
                  <th className="px-4 py-3 text-left">Cliente Asignado</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredMachines.map((machine) => (
                  <tr key={machine.id} className="border-b border-border">
                    <td className="px-4 py-3">
                      <Button 
                        size="icon"
                        className="bg-lime-500 hover:bg-lime-600 text-blue-900"
                        onClick={() => setSelectedQRMachine(machine)}
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>
                    </td>
                    <td className="px-4 py-3">{machine.serialNumber}</td>
                    <td className="px-4 py-3">{machine.type}</td>
                    <td className="px-4 py-3">{machine.model}</td>
                    <td className="px-4 py-3">{getClientName(machine.clientId)}</td>
                    <td className="px-4 py-3">
                      <span className={getStatusConfig(machine.status).className}>
                        {getStatusConfig(machine.status).label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end space-x-2">
                        {machine.status === 'installed' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewHistory(machine.id)}
                          >
                            <History className="mr-1 h-4 w-4" />
                            Historial
                          </Button>
                        )}
                        {machine.status === 'warehouse' ? (
                          <Button 
                            className="bg-lime-500 hover:bg-lime-600 text-violet-700"
                            size="sm"
                            onClick={() => {
                              setSelectedMachine(machine.id);
                              setIsInstallDialogOpen(true);
                            }}
                          >
                            Instalación
                          </Button>
                        ) : (
                          <Button 
                            className="bg-lime-500 hover:bg-lime-600 text-violet-700"
                            size="sm"
                            onClick={() => {
                              // Iniciar el proceso de traslado
                              setTransferMachineId(machine.id);
                              setIsTransferDialogOpen(true);
                            }}
                          >
                            <ArrowRightLeft className="mr-1 h-3 w-3" />
                            Traslado
                          </Button>
                        )}
                        <Button 
                          variant="violet" 
                          size="icon"
                          onClick={() => {
                            // Aquí iría la lógica para editar la máquina
                            toast({
                              title: "Editar",
                              description: "Función de edición en desarrollo",
                            });
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                        </Button>
                        <Button 
                          variant="violet" 
                          size="icon"
                          onClick={() => handleDelete(machine.id)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Nuevas tarjetas de resumen de máquinas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        {/* Tarjeta de Máquinas Instaladas */}
        <Card className="bg-card">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xl font-bold">
              <Building className="inline-block mr-2 h-5 w-5 text-violet-500" />
              Máquinas Instaladas
            </CardTitle>
            <span className="text-2xl font-bold text-violet-500">{installedMachines.length}</span>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(machinesByType)
                  .filter(([_, stats]) => stats.installed > 0)
                  .map(([type, stats]) => (
                    <div key={`installed-${type}`} className="flex items-center justify-between p-2 rounded-md bg-violet-50 dark:bg-violet-900/20">
                      <span className="font-medium">{getMachineTypeLabel(type)}</span>
                      <span className="font-bold text-violet-600 dark:text-violet-300">{stats.installed}</span>
                    </div>
                  ))}
              </div>
              
              {installedMachines.length > 0 ? (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Últimas instalaciones</h4>
                  <div className="space-y-2">
                    {installedMachines
                      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                      .slice(0, 3)
                      .map(machine => (
                        <div key={`recent-${machine.id}`} className="flex justify-between items-center p-2 rounded-md bg-background border border-border">
                          <div>
                            <p className="font-medium">{machine.serialNumber}</p>
                            <p className="text-xs text-muted-foreground">{machine.model} ({machine.brand})</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Cliente: {getClientName(machine.clientId)}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <p className="text-muted-foreground">No hay máquinas instaladas</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => setIsInstallDialogOpen(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Instalar máquina
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tarjeta de Máquinas en Almacén */}
        <Card className="bg-card">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xl font-bold">
              <Package className="inline-block mr-2 h-5 w-5 text-lime-500" />
              Máquinas en Almacén
            </CardTitle>
            <span className="text-2xl font-bold text-lime-500">{availableMachines.length}</span>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(machinesByType)
                  .filter(([_, stats]) => stats.warehouse > 0)
                  .map(([type, stats]) => (
                    <div key={`warehouse-${type}`} className="flex items-center justify-between p-2 rounded-md bg-lime-50 dark:bg-lime-900/20">
                      <span className="font-medium">{getMachineTypeLabel(type)}</span>
                      <span className="font-bold text-lime-600 dark:text-lime-300">{stats.warehouse}</span>
                    </div>
                  ))}
              </div>
              
              {availableMachines.length > 0 ? (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Disponibles para instalación</h4>
                  <div className="space-y-2">
                    {availableMachines
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .slice(0, 3)
                      .map(machine => (
                        <div key={`available-${machine.id}`} className="flex justify-between items-center p-2 rounded-md bg-background border border-border">
                          <div>
                            <p className="font-medium">{machine.serialNumber}</p>
                            <p className="text-xs text-muted-foreground">{machine.model} ({machine.brand})</p>
                          </div>
                          <Button 
                            size="sm"
                            className="bg-lime-500 hover:bg-lime-600 text-violet-700"
                            onClick={() => {
                              setSelectedMachine(machine.id);
                              setIsInstallDialogOpen(true);
                            }}
                          >
                            Instalar
                          </Button>
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <p className="text-muted-foreground">No hay máquinas en almacén</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => setIsNewMachineDialogOpen(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Añadir máquina
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MachinesPage;
