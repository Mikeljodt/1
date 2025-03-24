import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Download, Upload, Search, History, Edit, Info, Trash, CheckCircle } from 'lucide-react';
import { RootState, AppDispatch } from '@/store';
import { fetchClients, addClient, updateClient, deleteClient } from '@/store/slices/clientsSlice';
import { fetchCollectionsByClient } from '@/store/slices/collectionsSlice';
import { CollectionHistory } from '@/components/CollectionHistory';
import { SignaturePad } from '@/components/SignatureCanvas';
import { useToast } from "@/components/ui/use-toast"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
// import { NewClientForm } from './ClientsPage';
// import { MachineDepositSignatureForm } from './ClientsPage';
// import { EditClientForm } from './ClientsPage';

// Define the Client type based on your database schema
interface Client {
  id: number;
  establishmentName: string;
  businessType: string;
  ownerName: string;
  fiscalIdType: string;
  fiscalId: string;
  street: string;
  number: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
  email: string;
  openingTimeMorning: string;
  closingTimeMorning: string;
  openingTimeAfternoon: string;
  closingTimeAfternoon: string;
  closingDay: string;
  additionalNotes: string;
  machines: number;
  createdAt: string;
  updatedAt: string;
  depositoSignature?: string; // Add this line
}

const ClientsPage = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { clients, status } = useSelector((state: RootState) => state.clients);
    const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [isNewClientDialogOpen, setIsNewClientDialogOpen] = useState(false);
  const [isEditClientDialogOpen, setIsEditClientDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);
    const [clientIdToDelete, setClientIdToDelete] = useState<number | null>(null);
    const [clientData, setClientData] = useState<Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'machines' | 'depositoSignature'> | null>(null);
    const [isMachineDepositDialogOpen, setIsMachineDepositDialogOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchClients());
  }, [dispatch]);

  const filteredClients = clients.filter(client =>
    (client.establishmentName && client.establishmentName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (client.businessType && client.businessType.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (client.city && client.city.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleViewHistory = (clientId: number) => {
    setSelectedClientId(clientId);
    dispatch(fetchCollectionsByClient(clientId));
    setIsHistoryDialogOpen(true);
  };

  const handleOpenNewClientDialog = () => {
    setIsNewClientDialogOpen(true);
  };

  const handleCloseNewClientDialog = () => {
    setIsNewClientDialogOpen(false);
  };

    const handleOpenMachineDepositDialog = (clientId: number) => {
        const clientToSign = clients.find(client => client.id === clientId);
        if (clientToSign) {
            setSelectedClient(clientToSign);
            setIsMachineDepositDialogOpen(true);
        }
    };

    const handleCloseMachineDepositDialog = () => {
        setIsMachineDepositDialogOpen(false);
        setSelectedClient(null);
    };

  const handleCreateClient = (newClientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'machines' | 'depositoSignature'>) => {
    dispatch(addClient(newClientData));
        toast({
            title: "Éxito",
            description: "Cliente creado correctamente.",
        })
    setClientData(newClientData);
    handleOpenMachineDepositDialog(clients.length + 1);
    handleCloseNewClientDialog();
  };

  const handleOpenEditClientDialog = (clientId: number) => {
    const clientToEdit = clients.find(client => client.id === clientId);
    if (clientToEdit) {
      setSelectedClient(clientToEdit);
      setIsEditClientDialogOpen(true);
    }
  };

  const handleCloseEditClientDialog = () => {
    setIsEditClientDialogOpen(false);
    setSelectedClient(null);
  };

  const handleUpdateClient = (updatedClientData: Partial<Client> & { id: number }) => {
    dispatch(updateClient(updatedClientData));
        toast({
            title: "Éxito",
            description: "Cliente actualizado correctamente.",
        })
    handleCloseEditClientDialog();
  };

    const handleDeleteClient = (clientId: number) => {
        setClientIdToDelete(clientId);
        setIsDeleteConfirmationOpen(true);
    };

    const handleConfirmDelete = () => {
        if (clientIdToDelete !== null) {
            dispatch(deleteClient(clientIdToDelete));
            toast({
                title: "Éxito",
                description: "Cliente eliminado correctamente.",
            });
            setIsDeleteConfirmationOpen(false);
            setClientIdToDelete(null);
        }
    };

    const handleCancelDelete = () => {
        setIsDeleteConfirmationOpen(false);
        setClientIdToDelete(null);
    };

  const handleViewDetails = (clientId: number) => {
    // Implement logic to view client details
    console.log(`View details for client ID: ${clientId}`);
  };

  const handleImportClients = () => {
    // Implement logic to import clients
    console.log('Import clients');
  };

  const handleExportClients = () => {
    // Implement logic to export clients
    console.log('Export clients');
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground">Gestiona tus clientes y sus máquinas</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 justify-between">
        <div className="space-x-2">
          <Button variant="default" onClick={handleOpenNewClientDialog}>
            <Plus className="mr-2 h-4 w-4" /> Nuevo Cliente
          </Button>
        </div>
        <div className="space-x-2">
          <Button variant="violet" onClick={handleImportClients}>
            <Upload className="mr-2 h-4 w-4" /> Importar
          </Button>
          <Button variant="violet" onClick={handleExportClients}>
            <Download className="mr-2 h-4 w-4" /> Exportar
          </Button>
        </div>
      </div>

      <div className="flex items-center space-x-2 mb-4">
        <Search className="h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, tipo de negocio o ciudad..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Diálogo para historial de recaudaciones */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Historial de Recaudaciones</DialogTitle>
            <DialogDescription>
              {selectedClientId && clients.find(c => c.id === selectedClientId)?.establishmentName}
            </DialogDescription>
          </DialogHeader>
          {selectedClientId && (
            <CollectionHistory
              type="client"
              id={selectedClientId}
              showFilters={true}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo para nuevo cliente */}
      <Dialog open={isNewClientDialogOpen} onOpenChange={setIsNewClientDialogOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Nuevo Cliente</DialogTitle>
            <DialogDescription>
              Ingresa los datos del nuevo cliente. Los campos marcados con * son obligatorios.
            </DialogDescription>
          </DialogHeader>
          <NewClientForm onCreate={handleCreateClient} onCancel={handleCloseNewClientDialog} />
        </DialogContent>
      </Dialog>

        {/* Diálogo para firma de máquina en depósito */}
        <Dialog open={isMachineDepositDialogOpen} onOpenChange={setIsMachineDepositDialogOpen}>
            <DialogContent className="sm:max-w-[800px]">
                <DialogHeader>
                    <DialogTitle>Firma de Contrato de Depósito de Máquina</DialogTitle>
                    <DialogDescription>
                        Firma el contrato de depósito de la máquina.
                    </DialogDescription>
                </DialogHeader>
                {selectedClient && (
                    <MachineDepositSignatureForm
                        clientData={selectedClient}
                        onCancel={handleCloseMachineDepositDialog}
                    />
                )}
            </DialogContent>
        </Dialog>

      {/* Diálogo para editar cliente */}
      <Dialog open={isEditClientDialogOpen} onOpenChange={setIsEditClientDialogOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
            <DialogDescription>
              Modifica los datos del cliente.
            </DialogDescription>
          </DialogHeader>
          {selectedClient && (
            <EditClientForm
              client={selectedClient}
              onUpdate={handleUpdateClient}
              onCancel={handleCloseEditClientDialog}
            />
          )}
        </DialogContent>
      </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteConfirmationOpen} onOpenChange={setIsDeleteConfirmationOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará el cliente permanentemente. ¿Estás seguro?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={handleCancelDelete}>
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDelete}>
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

      <Card className="bg-card">
        <CardHeader className="pb-2">
          <CardTitle>Listado de Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead className="text-sm text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left">Nombre</th>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-left">Propietario</th>
                  <th className="px-4 py-3 text-left">Ubicación</th>
                  <th className="px-4 py-3 text-left">Contacto</th>
                  <th className="px-4 py-3 text-center">Máquinas</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => (
                  <tr key={client.id} className="border-b border-border">
                    <td className="px-4 py-3 font-medium">{client.establishmentName}</td>
                    <td className="px-4 py-3">{client.businessType || '-'}</td>
                    <td className="px-4 py-3">{client.ownerName || '-'}</td>
                    <td className="px-4 py-3">{client.city || '-'}</td>
                    <td className="px-4 py-3">{client.phone || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                        {client.machines}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewHistory(client.id)}
                        >
                          <History className="mr-1 h-4 w-4" />
                          Historial
                        </Button>
                        <Button variant="violet" size="sm" onClick={() => handleOpenEditClientDialog(client.id)}>
                          <Edit className="mr-1 h-4 w-4" />
                          Editar
                        </Button>
                          <AlertDialog>
                              <AlertDialogTrigger asChild>
                                  <Button variant="destructive" size="sm" onClick={() => handleDeleteClient(client.id)}>
                                      <Trash className="mr-1 h-4 w-4" />
                                      Eliminar
                                  </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                  <AlertDialogHeader>
                                      <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                          Esta acción eliminará el cliente permanentemente. ¿Estás seguro?
                                      </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                      <AlertDialogCancel onClick={handleCancelDelete}>
                                          Cancelar
                                      </AlertDialogCancel>
                                      <AlertDialogAction onClick={handleConfirmDelete}>
                                          Eliminar
                                      </AlertDialogAction>
                                  </AlertDialogFooter>
                              </AlertDialogContent>
                          </AlertDialog>
                        <Button variant="default" size="sm" onClick={() => handleViewDetails(client.id)}>
                          <Info className="mr-1 h-4 w-4" />
                          Detalle
                        </Button>
                                                  <Button variant="lime" size="sm" onClick={() => handleOpenMachineDepositDialog(client.id)}>
                          Firma Depósito
                        </Button>
                        {client.depositoSignature && (
                          <CheckCircle className="text-green-500 h-5 w-5" />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// NewClientForm component
interface NewClientFormProps {
  onCreate: (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'machines' | 'depositoSignature'>) => void;
  onCancel: () => void;
}

const NewClientForm: React.FC<NewClientFormProps> = ({ onCreate, onCancel }) => {
    const { toast } = useToast()
  const [establishmentName, setEstablishmentName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerLastName, setOwnerLastName] = useState('');
  const [fiscalIdType, setFiscalIdType] = useState('');
  const [fiscalId, setFiscalId] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [openingTimeMorning, setOpeningTimeMorning] = useState('');
  const [closingTimeMorning, setClosingTimeMorning] = useState('');
  const [openingTimeAfternoon, setOpeningTimeAfternoon] = useState('');
  const [closingTimeAfternoon, setClosingTimeAfternoon] = useState('');
  const [closingDay, setClosingDay] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  const timeOptions = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return `${hour}:00`;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newClientData = {
      establishmentName,
      businessType,
      ownerName: ownerName + ' ' + ownerLastName,
      fiscalIdType,
      fiscalId,
      street,
      number,
      city,
      province,
      postalCode,
      phone,
      email,
      openingTimeMorning,
      closingTimeMorning,
      openingTimeAfternoon,
      closingTimeAfternoon,
      closingDay,
      additionalNotes
    };
    onCreate(newClientData);
        toast({
            title: "Éxito",
            description: "Cliente creado correctamente.",
        })
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="establishmentName">Nombre del Bar o Establecimiento *</Label>
          <Input type="text" id="establishmentName" value={establishmentName} onChange={(e) => setEstablishmentName(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="businessType">Tipo de Negocio</Label>
          <select
            id="businessType"
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Seleccionar tipo</option>
            <option value="bar">Bar</option>
            <option value="restaurante">Restaurante</option>
            <option value="cafeteria">Cafetería</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="ownerName">Nombre del Propietario *</Label>
          <Input type="text" id="ownerName" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="ownerLastName">Apellidos del Propietario *</Label>
          <Input type="text" id="ownerLastName" value={ownerLastName} onChange={(e) => setOwnerLastName(e.target.value)} required />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="fiscalIdType">Tipo de Identificación Fiscal *</Label>
          <select
            id="fiscalIdType"
            value={fiscalIdType}
            onChange={(e) => setFiscalIdType(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            required
          >
            <option value="">Seleccionar tipo</option>
            <option value="NIF">NIF</option>
            <option value="CIF">CIF</option>
            <option value="DNI">DNI</option>
            <option value="Pasaporte">Pasaporte</option>
          </select>
        </div>
        <div>
          <Label htmlFor="fiscalId">Número de Identificación Fiscal *</Label>
          <Input type="text" id="fiscalId" value={fiscalId} onChange={(e) => setFiscalId(e.target.value)} required />
        </div>
      </div>
      <div>
        <Label htmlFor="street">Calle *</Label>
        <Input type="text" id="street" value={street} onChange={(e) => setStreet(e.target.value)} required />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="number">Número *</Label>
          <Input type="text" id="number" value={number} onChange={(e) => setNumber(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="city">Ciudad *</Label>
          <Input type="text" id="city" value={city} onChange={(e) => setCity(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="province">Provincia *</Label>
          <Input type="text" id="province" value={province} onChange={(e) => setProvince(e.target.value)} required />
        </div>
      </div>
      <div>
        <Label htmlFor="postalCode">Código Postal *</Label>
        <Input type="text" id="postalCode" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} required />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="phone">Teléfono *</Label>
          <Input type="tel" id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="email">Correo Electrónico *</Label>
          <Input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="openingTimeMorning">Apertura Mañana</Label>
          <select
            id="openingTimeMorning"
            value={openingTimeMorning}
            onChange={(e) => setOpeningTimeMorning(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Seleccionar hora</option>
            {timeOptions.map((time) => (
              <option key={time} value={time}>{time}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="closingTimeMorning">Cierre Mañana</Label>
          <select
            id="closingTimeMorning"
            value={closingTimeMorning}
            onChange={(e) => setClosingTimeMorning(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Seleccionar hora</option>
            {timeOptions.map((time) => (
              <option key={time} value={time}>{time}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="openingTimeAfternoon">Apertura Tarde</Label>
          <select
            id="openingTimeAfternoon"
            value={openingTimeAfternoon}
            onChange={(e) => setOpeningTimeAfternoon(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Seleccionar hora</option>
            {timeOptions.map((time) => (
              <option key={time} value={time}>{time}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="closingTimeAfternoon">Cierre Tarde</Label>
          <select
            id="closingTimeAfternoon"
            value={closingTimeAfternoon}
            onChange={(e) => setClosingTimeAfternoon(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Seleccionar hora</option>
            {timeOptions.map((time) => (
              <option key={time} value={time}>{time}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <Label htmlFor="closingDay">Día de Cierre *</Label>
        <select
          id="closingDay"
          value={closingDay}
          onChange={(e) => setClosingDay(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          required
        >
          <option value="">Seleccionar día</option>
          <option value="Lunes">Lunes</option>
          <option value="Martes">Martes</option>
          <option value="Miércoles">Miércoles</option>
          <option value="Jueves">Jueves</option>
          <option value="Viernes">Viernes</option>
          <option value="Sábado">Sábado</option>
          <option value="Domingo">Domingo</option>
        </select>
      </div>
      <div>
        <Label htmlFor="additionalNotes">Notas Adicionales</Label>
        <Input
          type="text"
          id="additionalNotes"
          value={additionalNotes}
          onChange={(e) => setAdditionalNotes(e.target.value)}
        />
      </div>
      <div className="flex justify-end space-x-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">Crear Cliente</Button>
      </div>
    </form>
  );
};

interface MachineDepositSignatureFormProps {
    clientData: Client | null;
    onCancel: () => void;
}

const MachineDepositSignatureForm: React.FC<MachineDepositSignatureFormProps> = ({ clientData, onCancel }) => {
    const [signature, setSignature] = useState('');
    const { toast } = useToast();

    const handleSignatureChange = (value: string) => {
        setSignature(value);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!signature) {
            toast({
                title: "Error",
                description: "Por favor, firma el contrato de depósito.",
                variant: "destructive",
            });
            return;
        }

        // Here you would handle the submission of the signature and client data
        console.log("Client Data:", clientData);
        console.log("Signature:", signature);
        toast({
            title: "Éxito",
            description: "Contrato de depósito firmado correctamente.",
        });
        onCancel();
    };

    return (
        <form onSubmit={handleSubmit} className="grid gap-4">
            {clientData && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="establishmentName">Nombre del Bar o Establecimiento</Label>
                            <Input type="text" id="establishmentName" value={clientData.establishmentName} readOnly />
                        </div>
                        <div>
                            <Label htmlFor="ownerName">Nombre del Propietario</Label>
                            <Input type="text" id="ownerName" value={clientData.ownerName} readOnly />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="fiscalIdType">Tipo de Identificación Fiscal</Label>
                            <Input type="text" id="fiscalIdType" value={clientData.fiscalIdType} readOnly />
                        </div>
                        <div>
                            <Label htmlFor="fiscalId">Número de Identificación Fiscal</Label>
                            <Input type="text" id="fiscalId" value={clientData.fiscalId} readOnly />
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="street">Dirección</Label>
                        <Input type="text" id="street" value={`${clientData.street}, ${clientData.number}, ${clientData.city}, ${clientData.province}, ${clientData.postalCode}`} readOnly />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="phone">Teléfono</Label>
                            <Input type="tel" id="phone" value={clientData.phone} readOnly />
                        </div>
                        <div>
                            <Label htmlFor="email">Correo Electrónico</Label>
                            <Input type="email" id="email" value={clientData.email} readOnly />
                        </div>
                    </div>
                </>
            )}
            <div>
                <Label htmlFor="signature">Firma del Cliente</Label>
                <SignaturePad onChange={handleSignatureChange} />
                {signature && <img src={signature} alt="Signature" />}
            </div>
            <div className="flex justify-end space-x-2">
                <Button variant="secondary" onClick={onCancel}>
                    Cancelar
                </Button>
                <Button type="submit">Firmar Contrato</Button>
            </div>
        </form>
    );
};

// EditClientForm component
interface EditClientFormProps {
  client: Client;
  onUpdate: (clientData: Partial<Client> & { id: number }) => void;
  onCancel: () => void;
}

const EditClientForm: React.FC<EditClientFormProps> = ({ client, onUpdate, onCancel }) => {
  const [establishmentName, setEstablishmentName] = useState(client.establishmentName);
  const [businessType, setBusinessType] = useState(client.businessType);
  const [ownerName, setOwnerName] = useState(client.ownerName);
  const [fiscalIdType, setFiscalIdType] = useState(client.fiscalIdType);
  const [fiscalId, setFiscalId] = useState(client.fiscalId);
  const [street, setStreet] = useState(client.street);
  const [number, setNumber] = useState(client.number);
  const [city, setCity] = useState(client.city);
  const [province, setProvince] = useState(client.province);
  const [postalCode, setPostalCode] = useState(client.postalCode);
  const [phone, setPhone] = useState(client.phone);
  const [email, setEmail] = useState(client.email);
  const [openingTimeMorning, setOpeningTimeMorning] = useState(client.openingTimeMorning);
  const [closingTimeMorning, setClosingTimeMorning] = useState(client.closingTimeMorning);
  const [openingTimeAfternoon, setOpeningTimeAfternoon] = useState(client.openingTimeAfternoon);
  const [closingTimeAfternoon, setClosingTimeAfternoon] = useState(client.closingTimeAfternoon);
  const [closingDay, setClosingDay] = useState(client.closingDay);
  const [additionalNotess, setAdditionalNotes] = useState(client.additionalNotes);

  const timeOptions = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return `${hour}:00`;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedClientData = {
      id: client.id,
      establishmentName,
      businessType,
      ownerName,
      fiscalIdType,
      fiscalId,
      street,
      number,
      city,
      province,
      postalCode,
      phone,
      email,
      openingTimeMorning,
      closingTimeMorning,
      openingTimeAfternoon,
      closingTimeAfternoon,
      closingDay,
      additionalNotes
    };
    onUpdate(updatedClientData);
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="establishmentName">Nombre del Bar o Establecimiento *</Label>
          <Input type="text" id="establishmentName" value={establishmentName} onChange={(e) => setEstablishmentName(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="businessType">Tipo de Negocio</Label>
          <select
            id="businessType"
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Seleccionar tipo</option>
            <option value="bar">Bar</option>
            <option value="restaurante">Restaurante</option>
            <option value="cafeteria">Cafetería</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="ownerName">Nombre del Propietario *</Label>
          <Input type="text" id="ownerName" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="fiscalIdType">Tipo de Identificación Fiscal *</Label>
          <select
            id="fiscalIdType"
            value={fiscalIdType}
            onChange={(e) => setFiscalIdType(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            required
          >
            <option value="">Seleccionar tipo</option>
            <option value="NIF">NIF</option>
            <option value="CIF">CIF</option>
            <option value="DNI">DNI</option>
            <option value="Pasaporte">Pasaporte</option>
          </select>
        </div>
      </div>
      <div>
        <Label htmlFor="fiscalId">Número de Identificación Fiscal *</Label>
        <Input type="text" id="fiscalId" value={fiscalId} onChange={(e) => setFiscalId(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="street">Calle *</Label>
        <Input type="text" id="street" value={street} onChange={(e) => setStreet(e.target.value)} required />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="number">Número *</Label>
          <Input type="text" id="number" value={number} onChange={(e) => setNumber(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="city">Ciudad *</Label>
          <Input type="text" id="city" value={city} onChange={(e) => setCity(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="province">Provincia *</Label>
          <Input type="text" id="province" value={province} onChange={(e) => setProvince(e.target.value)} required />
        </div>
      </div>
      <div>
        <Label htmlFor="postalCode">Código Postal *</Label>
        <Input type="text" id="postalCode" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} required />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="phone">Teléfono *</Label>
          <Input type="tel" id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="email">Correo Electrónico *</Label>
          <Input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="openingTimeMorning">Apertura Mañana</Label>
          <select
            id="openingTimeMorning"
            value={openingTimeMorning}
            onChange={(e) => setOpeningTimeMorning(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Seleccionar hora</option>
            {timeOptions.map((time) => (
              <option key={time} value={time}>{time}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="closingTimeMorning">Cierre Mañana</Label>
          <select
            id="closingTimeMorning"
            value={closingTimeMorning}
            onChange={(e) => setClosingTimeMorning(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Seleccionar hora</option>
            {timeOptions.map((time) => (
              <option key={time} value={time}>{time}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="openingTimeAfternoon">Apertura Tarde</Label>
          <select
            id="openingTimeAfternoon"
            value={openingTimeAfternoon}
            onChange={(e) => setOpeningTimeAfternoon(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Seleccionar hora</option>
            {timeOptions.map((time) => (
              <option key={time} value={time}>{time}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="closingTimeAfternoon">Cierre Tarde</Label>
          <select
            id="closingTimeAfternoon"
            value={closingTimeAfternoon}
            onChange={(e) => setClosingTimeAfternoon(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Seleccionar hora</option>
            {timeOptions.map((time) => (
              <option key={time} value={time}>{time}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <Label htmlFor="closingDay">Día de Cierre *</Label>
        <select
          id="closingDay"
          value={closingDay}
          onChange={(e) => setClosingDay(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          required
        >
          <option value="">Seleccionar día</option>
          <option value="Lunes">Lunes</option>
          <option value="Martes">Martes</option>
          <option value="Miércoles">Miércoles</option>
          <option value="Jueves">Jueves</option>
          <option value="Viernes">Viernes</option>
          <option value="Sábado">Sábado</option>
          <option value="Domingo">Domingo</option>
        </select>
      </div>
      <div>
        <Label htmlFor="additionalNotes">Notas Adicionales</Label>
        <Input
          type="text"
          id="additionalNotes"
          value={additionalNotes}
          onChange={(e) => setAdditionalNotes(e.target.value)}
        />
      </div>
      <div className="flex justify-end space-x-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">Actualizar Cliente</Button>
      </div>
    </form>
  );
};

export default ClientsPage;
