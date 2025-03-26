import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';
import { RootState, AppDispatch } from '@/store';
import { fetchClients, addClient, updateClient, deleteClient } from '@/store/slices/clientsSlice';
import { fetchCollectionsByClient } from '@/store/slices/collectionsSlice';
import { CollectionHistory } from '@/components/CollectionHistory';
import { SignaturePad } from '@/components/SignatureCanvas';
import { useToast } from "@/components/ui/use-toast"
import { Client } from '@/lib/db';

const ClientsPage = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { clients, status, error } = useSelector((state: RootState) => state.clients);
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [isNewClientDialogOpen, setIsNewClientDialogOpen] = useState(false);
  const [isEditClientDialogOpen, setIsEditClientDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);
  const [clientIdToDelete, setClientIdToDelete] = useState<number | null>(null);
  const [isMachineDepositDialogOpen, setIsMachineDepositDialogOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchClients());
  }, [dispatch]);

  const filteredClients = clients.filter(client =>
    (client.name && client.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
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
    });
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
    });
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


  if (status === 'loading') {
    return <div>Cargando clientes...</div>;
  }

  if (status === 'failed') {
    return <div>Error al cargar clientes: {error}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder="Buscar clientes..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={handleOpenNewClientDialog}>Nuevo Cliente</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Tipo de Negocio</TableHead>
            <TableHead>Ciudad</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredClients.map((client) => (
            <TableRow key={client.id}>
              <TableCell>{client.name}</TableCell>
              <TableCell>{client.businessType}</TableCell>
              <TableCell>{client.city}</TableCell>
              <TableCell className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => handleViewHistory(client.id)}
                >
                  Historial
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleOpenEditClientDialog(client.id)}
                >
                  Editar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDeleteClient(client.id)}
                >
                  Eliminar
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Diálogos */}
      <Dialog
        open={isNewClientDialogOpen}
        onOpenChange={setIsNewClientDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Cliente</DialogTitle>
          </DialogHeader>
          <NewClientForm
            onSubmit={handleCreateClient}
            onCancel={handleCloseNewClientDialog}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={isEditClientDialogOpen}
        onOpenChange={setIsEditClientDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          {selectedClient && (
            <EditClientForm
              client={selectedClient}
              onSubmit={handleUpdateClient}
              onCancel={handleCloseEditClientDialog}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={isDeleteConfirmationOpen}
        onOpenChange={setIsDeleteConfirmationOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro que deseas eliminar este cliente? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelDelete}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isMachineDepositDialogOpen}
        onOpenChange={setIsMachineDepositDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Firma de Depósito</DialogTitle>
          </DialogHeader>
          {selectedClient && (
            <MachineDepositSignatureForm
              client={selectedClient}
              onSubmit={handleUpdateClient}
              onCancel={handleCloseMachineDepositDialog}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface NewClientFormProps {
  onSubmit: (data: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'machines' | 'depositoSignature'>) => void;
  onCancel: () => void;
}

const NewClientForm = ({ onSubmit, onCancel }: NewClientFormProps) => {
  const [formData, setFormData] = useState<Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'machines' | 'depositoSignature'>>({
    name: '',
    establishmentName: '',
    ownerName: '',
    businessType: '',
    address: '',
    city: '',
    phone: '',
    email: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Nombre</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required
          />
        </div>
        <div>
          <Label htmlFor="establishmentName">Nombre del Establecimiento</Label>
          <Input
            id="establishmentName"
            value={formData.establishmentName}
            onChange={(e) => setFormData({...formData, establishmentName: e.target.value})}
            required
          />
        </div>
        <div>
          <Label htmlFor="ownerName">Nombre del Propietario</Label>
          <Input
            id="ownerName"
            value={formData.ownerName}
            onChange={(e) => setFormData({...formData, ownerName: e.target.value})}
            required
          />
        </div>
        {/* Resto de campos del formulario... */}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">Guardar</Button>
      </DialogFooter>
    </form>
  );
};

interface EditClientFormProps {
  client: Client;
  onSubmit: (data: Partial<Client> & { id: number }) => void;
  onCancel: () => void;
}

const EditClientForm = ({ client, onSubmit, onCancel }: EditClientFormProps) => {
  const [formData, setFormData] = useState<Partial<Client>>({
    name: client.name,
    establishmentName: client.establishmentName,
    ownerName: client.ownerName,
    businessType: client.businessType,
    address: client.address,
    city: client.city,
    phone: client.phone,
    email: client.email,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      id: client.id
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Nombre</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required
          />
        </div>
        <div>
          <Label htmlFor="establishmentName">Nombre del Establecimiento</Label>
          <Input
            id="establishmentName"
            value={formData.establishmentName}
            onChange={(e) => setFormData({...formData, establishmentName: e.target.value})}
            required
          />
        </div>
        <div>
          <Label htmlFor="ownerName">Nombre del Propietario</Label>
          <Input
            id="ownerName"
            value={formData.ownerName}
            onChange={(e) => setFormData({...formData, ownerName: e.target.value})}
            required
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">Guardar</Button>
      </DialogFooter>
    </form>
  );
};

interface MachineDepositSignatureFormProps {
  client: Client;
  onSubmit: (data: Partial<Client> & { id: number }) => void;
  onCancel: () => void;
}

const MachineDepositSignatureForm = ({ client, onSubmit, onCancel }: MachineDepositSignatureFormProps) => {
  const [signature, setSignature] = useState(client.depositoSignature || '');

  const handleSave = () => {
    // Actualizar el cliente con la nueva firma
    onSubmit({
      id: client.id,
      depositoSignature: signature
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Firma del cliente: {client.name}</Label>
        <SignaturePad 
          value={signature}
          onChange={setSignature}
        />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={!signature}>
          Guardar Firma
        </Button>
      </DialogFooter>
    </div>
  );
};

export default ClientsPage;
