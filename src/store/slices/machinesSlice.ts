import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { getDB, Machine, Client } from '@/lib/db';
import { generateUniqueId } from '@/lib/utils';

interface MachinesState {
  machines: Machine[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

interface InstallationData {
  responsibleName: string;
  responsibleId: string;
  acceptedTerms: boolean;
  acceptedResponsibility: boolean;
  acceptanceDate: string;
  installationDate: string;
  installationCounter: number;
  location: string;
  observations: string;
  technician: string;
}

interface InstallMachineParams {
  machineId: string;
  clientId: number;
  installationData: InstallationData;
}

interface TransferMachineParams {
  machineId: string;
  fromClientId: number;
  toClientId: number;
  transferData: {
    responsibleName: string;
    responsibleId: string;
    transferDate: string;
    currentCounter: number;
    observations: string;
    technician: string;
    signatureData?: string;
  };
}

const initialState: MachinesState = {
  machines: [],
  status: 'idle',
  error: null,
};

export const fetchMachines = createAsyncThunk('machines/fetchMachines', async () => {
  const db = await getDB();
  const machines = await db.getAll('machines');
  return machines;
});

export const addMachine = createAsyncThunk(
  'machines/addMachine',
  async (machineData: Omit<Machine, 'id' | 'createdAt' | 'updatedAt' | 'history' | 'currentCounter'>) => {
    const db = await getDB();
    const now = new Date().toISOString();
    
    const newMachine: Machine = {
      ...machineData,
      id: generateUniqueId(),
      createdAt: now,
      updatedAt: now,
      history: [{
        date: now,
        action: 'created',
        details: 'Máquina creada'
      }],
      currentCounter: machineData.initialCounter
    };
    
    await db.add('machines', newMachine);
    return newMachine;
  }
);

export const updateMachine = createAsyncThunk(
  'machines/updateMachine',
  async (machineData: Partial<Machine> & { id: string }) => {
    const db = await getDB();
    const existingMachine = await db.get('machines', machineData.id);
    
    if (!existingMachine) {
      throw new Error('Máquina no encontrada');
    }
    
    const now = new Date().toISOString();
    const updatedMachine: Machine = {
      ...existingMachine,
      ...machineData,
      updatedAt: now,
      history: [
        ...existingMachine.history,
        {
          date: now,
          action: 'updated',
          details: 'Máquina actualizada'
        }
      ]
    };
    
    await db.put('machines', updatedMachine);
    return updatedMachine;
  }
);

export const deleteMachine = createAsyncThunk(
  'machines/deleteMachine',
  async (id: string) => {
    const db = await getDB();
    await db.delete('machines', id);
    return id;
  }
);

export const installMachine = createAsyncThunk(
  'machines/installMachine',
  async ({ machineId, clientId, installationData }: InstallMachineParams) => {
    const db = await getDB();
    const machine = await db.get('machines', machineId);
    const client = await db.get('clients', clientId);

    if (!machine) {
      throw new Error('Máquina no encontrada');
    }

    if (!client) {
      throw new Error('Cliente no encontrado');
    }

    const updatedMachine: Machine = {
      ...machine,
      status: 'installed',
      clientId: clientId.toString(),
      installationData,
      history: [
        ...machine.history,
        {
          date: new Date().toISOString(),
          action: 'installed',
          details: `Instalada en ${client.name} por ${installationData.technician}. Responsable: ${installationData.responsibleName} (${installationData.responsibleId})`
        }
      ]
    };

    const updatedClient: Client = {
      ...client,
      machines: client.machines + 1
    };

    const tx = db.transaction(['machines', 'clients'], 'readwrite');
    await tx.objectStore('machines').put(updatedMachine);
    await tx.objectStore('clients').put(updatedClient);
    await tx.done;

    return updatedMachine;
  }
);

// Nueva función para trasladar una máquina de un cliente a otro
export const transferMachine = createAsyncThunk(
  'machines/transferMachine',
  async ({ machineId, fromClientId, toClientId, transferData }: TransferMachineParams) => {
    const db = await getDB();
    const machine = await db.get('machines', machineId);
    const fromClient = await db.get('clients', fromClientId);
    const toClient = await db.get('clients', toClientId);

    if (!machine) {
      throw new Error('Máquina no encontrada');
    }

    if (!fromClient) {
      throw new Error('Cliente origen no encontrado');
    }

    if (!toClient) {
      throw new Error('Cliente destino no encontrado');
    }

    // Actualizar la máquina con la nueva información de cliente
    const now = new Date().toISOString();
    const updatedMachine: Machine = {
      ...machine,
      clientId: toClientId.toString(),
      currentCounter: transferData.currentCounter,
      updatedAt: now,
      history: [
        ...machine.history,
        {
          date: now,
          action: 'transferred',
          details: `Trasladada desde ${fromClient.name} a ${toClient.name} por ${transferData.technician}. Responsable: ${transferData.responsibleName} (${transferData.responsibleId}). Observaciones: ${transferData.observations}`
        }
      ],
      // Actualizar o añadir datos de instalación para el nuevo cliente
      installationData: {
        ...machine.installationData!,
        responsibleName: transferData.responsibleName,
        responsibleId: transferData.responsibleId,
        acceptanceDate: now,
        installationDate: transferData.transferDate,
        installationCounter: transferData.currentCounter,
        observations: transferData.observations,
        technician: transferData.technician
      }
    };

    // Actualizar contadores de máquinas para ambos clientes
    const updatedFromClient: Client = {
      ...fromClient,
      machines: Math.max(0, fromClient.machines - 1) // Asegurar que no sea negativo
    };

    const updatedToClient: Client = {
      ...toClient,
      machines: toClient.machines + 1
    };

    // Realizar todas las actualizaciones en una transacción
    const tx = db.transaction(['machines', 'clients'], 'readwrite');
    await tx.objectStore('machines').put(updatedMachine);
    await tx.objectStore('clients').put(updatedFromClient);
    await tx.objectStore('clients').put(updatedToClient);
    await tx.done;

    return {
      machine: updatedMachine,
      fromClient: updatedFromClient,
      toClient: updatedToClient
    };
  }
);

const machinesSlice = createSlice({
  name: 'machines',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMachines.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchMachines.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.machines = action.payload;
      })
      .addCase(fetchMachines.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Error al cargar las máquinas';
      })
      .addCase(addMachine.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(addMachine.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.machines.push(action.payload);
      })
      .addCase(addMachine.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Error al agregar la máquina';
      })
      .addCase(updateMachine.fulfilled, (state, action) => {
        const index = state.machines.findIndex(m => m.id === action.payload.id);
        if (index !== -1) {
          state.machines[index] = action.payload;
        }
      })
      .addCase(deleteMachine.fulfilled, (state, action) => {
        state.machines = state.machines.filter(m => m.id !== action.payload);
      })
      .addCase(installMachine.fulfilled, (state, action: PayloadAction<Machine>) => {
        const index = state.machines.findIndex((machine) => machine.id === action.payload.id);
        if (index !== -1) {
          state.machines[index] = action.payload;
        }
      })
      .addCase(transferMachine.fulfilled, (state, action) => {
        const index = state.machines.findIndex((machine) => machine.id === action.payload.machine.id);
        if (index !== -1) {
          state.machines[index] = action.payload.machine;
        }
      });
  },
});

export default machinesSlice.reducer;
