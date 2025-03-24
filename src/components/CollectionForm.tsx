import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RootState, AppDispatch } from '@/store';
import { addCollection } from '@/store/slices/collectionsSlice';
import { fetchAllCounters, updateMachineCounter } from '@/store/slices/counterSlice';
import { fetchMachines } from '@/store/slices/machinesSlice';
import { fetchClients } from '@/store/slices/clientsSlice';
import { toast } from '@/components/ui/use-toast';
import { CounterSelector } from '@/components/CounterSelector';
import { SignaturePad } from '@/components/SignatureCanvas';
import { formatDate, formatCurrency, generateUniqueId, calculateCounterDifference, calculateRevenue } from '@/lib/utils';

interface CollectionFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const CollectionForm = ({ onSuccess, onCancel }: CollectionFormProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const { machines } = useSelector((state: RootState) => state.machines);
  const { clients } = useSelector((state: RootState) => state.clients);
  const counterState = useSelector((state: RootState) => state.counter);
  
  // Form state
  const [selectedClient, setSelectedClient] = useState<number | null>(null);
  const [clientMachines, setClientMachines] = useState<any[]>([]);
  const [selectedMachines, setSelectedMachines] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    staffMember: '',
    collectionMethod: 'cash',
    notes: '',
    ticketNumber: generateUniqueId().substring(0, 8).toUpperCase(),
    invoiceNumber: '',
    signatureData: '',
    distributionPercentage: 50
  });

  // Machine counter data
  const [machineCounters, setMachineCounters] = useState<Record<string, {
    previousCounter: number;
    currentCounter: number;
    difference: number;
    amount: number;
  }>>({});

  // Load initial data
  useEffect(() => {
    dispatch(fetchMachines());
    dispatch(fetchClients());
    dispatch(fetchAllCounters());
  }, [dispatch]);

  // Generate ticket number on mount
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      ticketNumber: generateUniqueId().substring(0, 8).toUpperCase()
    }));
  }, []);

  // Update client machines when client is selected
  useEffect(() => {
    if (selectedClient) {
      const clientMachinesList = machines.filter(
        machine => machine.status === 'installed' && 
        machine.clientId === selectedClient.toString()
      );
      setClientMachines(clientMachinesList);
      
      // Reset selected machines when client changes
      setSelectedMachines([]);
      setMachineCounters({});
    } else {
      setClientMachines([]);
      setSelectedMachines([]);
      setMachineCounters({});
    }
  }, [selectedClient, machines]);

  // Toggle machine selection
  const toggleMachineSelection = (machineId: string) => {
    if (selectedMachines.includes(machineId)) {
      setSelectedMachines(prev => prev.filter(id => id !== machineId));
      
      // Remove machine from counters
      const newCounters = { ...machineCounters };
      delete newCounters[machineId];
      setMachineCounters(newCounters);
    } else {
      setSelectedMachines(prev => [...prev, machineId]);
      
      // Initialize machine counter data
      const machine = machines.find(m => m.id === machineId);
      if (machine) {
        setMachineCounters(prev => ({
          ...prev,
          [machineId]: {
            previousCounter: machine.currentCounter || 0,
            currentCounter: machine.currentCounter || 0,
            difference: 0,
            amount: 0
          }
        }));
      }
    }
  };

  // Update counter and calculate amount
  const updateCounter = (machineId: string, currentCounter: number) => {
    const machine = machines.find(m => m.id === machineId);
    if (!machine) return;
    
    const previousCounter = machine.currentCounter || 0;
    const difference = calculateCounterDifference(previousCounter, currentCounter);
    const amount = calculateRevenue(difference, formData.distributionPercentage);
    
    setMachineCounters(prev => ({
      ...prev,
      [machineId]: {
        previousCounter,
        currentCounter,
        difference,
        amount
      }
    }));
  };

  // Calculate total amount
  const calculateTotalAmount = () => {
    return Object.values(machineCounters).reduce((sum, data) => sum + data.amount, 0);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedClient || selectedMachines.length === 0) {
      toast({
        title: "Error",
        description: "Por favor selecciona un cliente y al menos una máquina.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.staffMember) {
      toast({
        title: "Error",
        description: "Por favor ingresa el nombre del técnico.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.signatureData) {
      toast({
        title: "Error",
        description: "Se requiere la firma digital para completar la recaudación.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create a collection for each selected machine
      for (const machineId of selectedMachines) {
        const counterData = machineCounters[machineId];
        if (!counterData) continue;
        
        // Update machine counter
        await dispatch(updateMachineCounter({
          machineId,
          newCounter: counterData.currentCounter,
          source: 'collection',
          notes: `Recaudación: ${counterData.amount}€`
        }));

        // Create collection record
        const collectionData = {
          machineId,
          clientId: selectedClient,
          amount: counterData.amount,
          date: formData.date,
          previousCounter: counterData.previousCounter,
          currentCounter: counterData.currentCounter,
          staffMember: formData.staffMember,
          collectionMethod: formData.collectionMethod,
          notes: formData.notes || undefined,
          ticketNumber: formData.ticketNumber || undefined,
          invoiceNumber: formData.invoiceNumber || undefined,
          signatureData: formData.signatureData,
          distributionPercentage: formData.distributionPercentage
        };

        await dispatch(addCollection(collectionData)).unwrap();
      }

      toast({
        title: "¡Recaudación registrada!",
        description: `Se han registrado ${selectedMachines.length} recaudaciones exitosamente.`,
        duration: 3000,
      });

      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error al registrar la recaudación:', error);
      toast({
        title: "Error",
        description: "No se pudo registrar la recaudación. Por favor, intente nuevamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      <div className="grid w-full gap-1.5">
        <Label htmlFor="date">Fecha de Recaudación</Label>
        <Input 
          id="date" 
          type="date"
          value={formData.date}
          onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
          required
        />
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

      {/* Distribution percentage selection */}
      <div className="grid w-full gap-1.5">
        <Label htmlFor="distributionPercentage">Porcentaje de Distribución</Label>
        <div className="flex space-x-4">
          <label className="flex items-center space-x-2">
            <input 
              type="radio" 
              name="distributionPercentage" 
              value="40"
              checked={formData.distributionPercentage === 40}
              onChange={() => {
                setFormData(prev => ({ ...prev, distributionPercentage: 40 }));
                // Recalculate amounts with new percentage
                const updatedCounters = { ...machineCounters };
                Object.keys(updatedCounters).forEach(machineId => {
                  const data = updatedCounters[machineId];
                  updatedCounters[machineId] = {
                    ...data,
                    amount: calculateRevenue(data.difference, 40)
                  };
                });
                setMachineCounters(updatedCounters);
              }}
              className="h-4 w-4 text-primary"
            />
            <span>40%</span>
          </label>
          <label className="flex items-center space-x-2">
            <input 
              type="radio" 
              name="distributionPercentage" 
              value="50"
              checked={formData.distributionPercentage === 50}
              onChange={() => {
                setFormData(prev => ({ ...prev, distributionPercentage: 50 }));
                // Recalculate amounts with new percentage
                const updatedCounters = { ...machineCounters };
                Object.keys(updatedCounters).forEach(machineId => {
                  const data = updatedCounters[machineId];
                  updatedCounters[machineId] = {
                    ...data,
                    amount: calculateRevenue(data.difference, 50)
                  };
                });
                setMachineCounters(updatedCounters);
              }}
              className="h-4 w-4 text-primary"
            />
            <span>50%</span>
          </label>
          <label className="flex items-center space-x-2">
            <input 
              type="radio" 
              name="distributionPercentage" 
              value="60"
              checked={formData.distributionPercentage === 60}
              onChange={() => {
                setFormData(prev => ({ ...prev, distributionPercentage: 60 }));
                // Recalculate amounts with new percentage
                const updatedCounters = { ...machineCounters };
                Object.keys(updatedCounters).forEach(machineId => {
                  const data = updatedCounters[machineId];
                  updatedCounters[machineId] = {
                    ...data,
                    amount: calculateRevenue(data.difference, 60)
                  };
                });
                setMachineCounters(updatedCounters);
              }}
              className="h-4 w-4 text-primary"
            />
            <span>60%</span>
          </label>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Porcentaje de ingresos que corresponde al operador
        </p>
      </div>

      {/* Machines section */}
      {selectedClient && clientMachines.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Máquinas Instaladas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clientMachines.map(machine => (
              <div 
                key={machine.id} 
                className={`border rounded-md p-4 ${
                  selectedMachines.includes(machine.id) 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium">{machine.serialNumber}</h4>
                    <p className="text-sm text-muted-foreground">{machine.brand} {machine.model}</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={selectedMachines.includes(machine.id)}
                    onChange={() => toggleMachineSelection(machine.id)}
                    className="h-5 w-5"
                  />
                </div>
                
                {selectedMachines.includes(machine.id) && (
                  <div className="mt-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor={`prev-counter-${machine.id}`}>Contador Anterior</Label>
                        <Input 
                          id={`prev-counter-${machine.id}`}
                          type="number"
                          value={machineCounters[machine.id]?.previousCounter || 0}
                          readOnly
                          className="bg-muted"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`curr-counter-${machine.id}`}>Contador Actual</Label>
                        <Input 
                          id={`curr-counter-${machine.id}`}
                          type="number"
                          min={machineCounters[machine.id]?.previousCounter || 0}
                          value={machineCounters[machine.id]?.currentCounter || 0}
                          onChange={(e) => updateCounter(machine.id, parseInt(e.target.value) || 0)}
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Diferencia</Label>
                        <div className="h-10 flex items-center px-3 border rounded-md bg-muted">
                          {machineCounters[machine.id]?.difference || 0}
                        </div>
                      </div>
                      <div>
                        <Label>Importe ({formData.distributionPercentage}%)</Label>
                        <div className="h-10 flex items-center px-3 border rounded-md bg-muted font-medium">
                          {formatCurrency(machineCounters[machine.id]?.amount || 0)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : selectedClient ? (
        <div className="py-4 text-center text-muted-foreground">
          No hay máquinas instaladas para este cliente.
        </div>
      ) : null}

      {/* Collection details */}
      {selectedMachines.length > 0 && (
        <div className="space-y-4 border-t pt-4 mt-4">
          <h3 className="text-lg font-medium">Detalles de la Recaudación</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid w-full gap-1.5">
              <Label htmlFor="staffMember">Técnico</Label>
              <Input 
                id="staffMember" 
                placeholder="Nombre del técnico que realiza la recaudación"
                value={formData.staffMember}
                onChange={(e) => setFormData(prev => ({ ...prev, staffMember: e.target.value }))}
                required
              />
            </div>

            <div className="grid w-full gap-1.5">
              <Label htmlFor="collectionMethod">Método de Recaudación</Label>
              <select 
                id="collectionMethod"
                value={formData.collectionMethod}
                onChange={(e) => setFormData(prev => ({ ...prev, collectionMethod: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="cash">Efectivo</option>
                <option value="transfer">Transferencia</option>
                <option value="card">Tarjeta</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid w-full gap-1.5">
              <Label htmlFor="ticketNumber">Número de Ticket</Label>
              <Input 
                id="ticketNumber" 
                value={formData.ticketNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, ticketNumber: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Generado automáticamente, puede modificarse
              </p>
            </div>
            <div className="grid w-full gap-1.5">
              <Label htmlFor="invoiceNumber">Número de Factura</Label>
              <Input 
                id="invoiceNumber" 
                placeholder="Opcional"
                value={formData.invoiceNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid w-full gap-1.5">
            <Label htmlFor="notes">Notas</Label>
            <textarea 
              id="notes"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Observaciones adicionales"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>

          {/* Total amount */}
          <div className="bg-muted p-4 rounded-md">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total a Recaudar:</span>
              <span className="text-xl font-bold">{formatCurrency(calculateTotalAmount())}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Suma de todos los importes calculados con {formData.distributionPercentage}% de distribución
            </p>
          </div>

          {/* Signature pad */}
          <SignaturePad
            value={formData.signatureData}
            onChange={(value) => setFormData(prev => ({ ...prev, signatureData: value }))}
            label="Firma Digital del Responsable"
          />
        </div>
      )}

      <div className="flex justify-end space-x-2 pt-4">
        {onCancel && (
          <Button 
            type="button" 
            variant="outline"
            onClick={onCancel}
          >
            Cancelar
          </Button>
        )}
        <Button 
          type="submit" 
          variant="default"
          disabled={selectedMachines.length === 0}
        >
          Guardar Recaudación
        </Button>
      </div>
    </form>
  );
};
