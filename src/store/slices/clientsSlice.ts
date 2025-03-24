import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getDB, Client } from '@/lib/db';

interface ClientsState {
  clients: Client[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: ClientsState = {
  clients: [],
  status: 'idle',
  error: null,
};

export const fetchClients = createAsyncThunk('clients/fetchClients', async () => {
  const db = await getDB();
  const clients = await db.getAll('clients');
  return clients;
});

export const addClient = createAsyncThunk(
  'clients/addClient',
  async (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'machines'>) => {
    const db = await getDB();
    const now = new Date().toISOString();
    
    const newClient: Client = {
      ...clientData,
      id: Date.now(), // Simple ID generation for IndexedDB
      createdAt: now,
      updatedAt: now,
      machines: 0
    };
    
    await db.add('clients', newClient);
    return newClient;
  }
);

export const updateClient = createAsyncThunk(
  'clients/updateClient',
  async (clientData: Partial<Client> & { id: number }) => {
    const db = await getDB();
    const existingClient = await db.get('clients', clientData.id);
    
    if (!existingClient) {
      throw new Error('Cliente no encontrado');
    }
    
    const updatedClient: Client = {
      ...existingClient,
      ...clientData,
      updatedAt: new Date().toISOString()
    };
    
    await db.put('clients', updatedClient);
    return updatedClient;
  }
);

export const deleteClient = createAsyncThunk(
  'clients/deleteClient',
  async (id: number) => {
    const db = await getDB();
    await db.delete('clients', id);
    return id;
  }
);

const clientsSlice = createSlice({
  name: 'clients',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchClients.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchClients.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.clients = action.payload;
      })
      .addCase(fetchClients.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Error al cargar los clientes';
      })
      .addCase(addClient.fulfilled, (state, action) => {
        state.clients.push(action.payload);
      })
      .addCase(updateClient.fulfilled, (state, action) => {
        const index = state.clients.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.clients[index] = action.payload;
        }
      })
      .addCase(deleteClient.fulfilled, (state, action) => {
        state.clients = state.clients.filter(c => c.id !== action.payload);
      });
  },
});

export default clientsSlice.reducer;
