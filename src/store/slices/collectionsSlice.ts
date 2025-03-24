import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { getDB } from '@/lib/db';
import { generateUniqueId } from '@/lib/utils';

// Define the Collection interface
export interface Collection {
  id: string;
  machineId: string;
  clientId: number;
  amount: number;
  date: string;
  previousCounter: number;
  currentCounter: number;
  notes?: string;
  ticketNumber?: string;
  invoiceNumber?: string;
  collectionMethod?: string;
  staffMember: string;
  signatureData?: string;
  distributionPercentage?: number;
  createdAt: string;
  createdBy?: string;
}

// Define the state interface
interface CollectionsState {
  collections: Collection[];
  filteredCollections: Collection[];
  selectedCollection: Collection | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  filters: {
    startDate: string | null;
    endDate: string | null;
    clientId: number | null;
    machineId: string | null;
    minAmount: number | null;
    maxAmount: number | null;
    staffMember: string | null;
  };
}

// Initial state
const initialState: CollectionsState = {
  collections: [],
  filteredCollections: [],
  selectedCollection: null,
  status: 'idle',
  error: null,
  filters: {
    startDate: null,
    endDate: null,
    clientId: null,
    machineId: null,
    minAmount: null,
    maxAmount: null,
    staffMember: null,
  }
};

// Async thunks
export const fetchCollections = createAsyncThunk(
  'collections/fetchCollections',
  async () => {
    const db = await getDB();
    return db.getAll('collections');
  }
);

export const fetchCollectionsByMachine = createAsyncThunk(
  'collections/fetchCollectionsByMachine',
  async (machineId: string) => {
    const db = await getDB();
    const index = db.transaction('collections').store.index('by-machine-id');
    return index.getAll(machineId);
  }
);

export const fetchCollectionsByClient = createAsyncThunk(
  'collections/fetchCollectionsByClient',
  async (clientId: number) => {
    const db = await getDB();
    const index = db.transaction('collections').store.index('by-client-id');
    return index.getAll(clientId);
  }
);

export const fetchCollectionsByDateRange = createAsyncThunk(
  'collections/fetchCollectionsByDateRange',
  async ({ startDate, endDate }: { startDate: string, endDate: string }) => {
    const db = await getDB();
    const allCollections = await db.getAll('collections');
    
    return allCollections.filter(collection => {
      const collectionDate = new Date(collection.date);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      
      if (start && end) {
        return collectionDate >= start && collectionDate <= end;
      } else if (start) {
        return collectionDate >= start;
      } else if (end) {
        return collectionDate <= end;
      }
      
      return true;
    });
  }
);

export const addCollection = createAsyncThunk(
  'collections/addCollection',
  async (collectionData: Omit<Collection, 'id' | 'createdAt'>) => {
    const db = await getDB();
    const now = new Date().toISOString();
    
    // Get the machine to update its counter
    const machine = await db.get('machines', collectionData.machineId);
    if (!machine) {
      throw new Error('Machine not found');
    }
    
    // Create new collection
    const newCollection: Collection = {
      ...collectionData,
      id: generateUniqueId(),
      createdAt: now,
    };
    
    // Update machine counter
    const updatedMachine = {
      ...machine,
      currentCounter: collectionData.currentCounter,
      updatedAt: now,
      history: [
        ...(machine.history || []),
        {
          date: now,
          action: 'collection',
          details: `Collection of ${collectionData.amount} recorded`
        }
      ]
    };
    
    // Use transaction to ensure both operations succeed or fail together
    const tx = db.transaction(['collections', 'machines'], 'readwrite');
    await tx.objectStore('collections').add(newCollection);
    await tx.objectStore('machines').put(updatedMachine);
    await tx.done;
    
    return newCollection;
  }
);

export const updateCollection = createAsyncThunk(
  'collections/updateCollection',
  async ({ id, ...updates }: Partial<Collection> & { id: string }) => {
    const db = await getDB();
    const collection = await db.get('collections', id);
    
    if (!collection) {
      throw new Error('Collection not found');
    }
    
    const updatedCollection: Collection = {
      ...collection,
      ...updates,
    };
    
    await db.put('collections', updatedCollection);
    return updatedCollection;
  }
);

export const deleteCollection = createAsyncThunk(
  'collections/deleteCollection',
  async (id: string) => {
    const db = await getDB();
    await db.delete('collections', id);
    return id;
  }
);

// Create the slice
const collectionsSlice = createSlice({
  name: 'collections',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<CollectionsState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
      
      // Apply filters to the collections
      state.filteredCollections = state.collections.filter(collection => {
        const { startDate, endDate, clientId, machineId, minAmount, maxAmount, staffMember } = state.filters;
        
        // Filter by date range
        if (startDate || endDate) {
          const collectionDate = new Date(collection.date);
          if (startDate && new Date(startDate) > collectionDate) return false;
          if (endDate && new Date(endDate) < collectionDate) return false;
        }
        
        // Filter by client
        if (clientId !== null && collection.clientId !== clientId) return false;
        
        // Filter by machine
        if (machineId !== null && collection.machineId !== machineId) return false;
        
        // Filter by amount range
        if (minAmount !== null && collection.amount < minAmount) return false;
        if (maxAmount !== null && collection.amount > maxAmount) return false;
        
        // Filter by staff member
        if (staffMember !== null && staffMember !== '' && 
            !collection.staffMember.toLowerCase().includes(staffMember.toLowerCase())) return false;
        
        return true;
      });
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
      state.filteredCollections = state.collections;
    },
    selectCollection: (state, action: PayloadAction<string>) => {
      state.selectedCollection = state.collections.find(c => c.id === action.payload) || null;
    },
    clearSelectedCollection: (state) => {
      state.selectedCollection = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Handle fetchCollections
      .addCase(fetchCollections.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchCollections.fulfilled, (state, action: PayloadAction<Collection[]>) => {
        state.status = 'succeeded';
        state.collections = action.payload;
        state.filteredCollections = action.payload;
      })
      .addCase(fetchCollections.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch collections';
      })
      
      // Handle fetchCollectionsByMachine
      .addCase(fetchCollectionsByMachine.fulfilled, (state, action: PayloadAction<Collection[]>) => {
        state.filteredCollections = action.payload;
      })
      
      // Handle fetchCollectionsByClient
      .addCase(fetchCollectionsByClient.fulfilled, (state, action: PayloadAction<Collection[]>) => {
        state.filteredCollections = action.payload;
      })
      
      // Handle fetchCollectionsByDateRange
      .addCase(fetchCollectionsByDateRange.fulfilled, (state, action: PayloadAction<Collection[]>) => {
        state.filteredCollections = action.payload;
      })
      
      // Handle addCollection
      .addCase(addCollection.fulfilled, (state, action: PayloadAction<Collection>) => {
        state.collections.push(action.payload);
        state.filteredCollections = state.collections;
      })
      
      // Handle updateCollection
      .addCase(updateCollection.fulfilled, (state, action: PayloadAction<Collection>) => {
        const index = state.collections.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.collections[index] = action.payload;
        }
        state.filteredCollections = state.collections;
        if (state.selectedCollection?.id === action.payload.id) {
          state.selectedCollection = action.payload;
        }
      })
      
      // Handle delete<boltAction type="file" filePath="src/store/slices/collectionsSlice.ts">      // Handle deleteCollection
      .addCase(deleteCollection.fulfilled, (state, action: PayloadAction<string>) => {
        state.collections = state.collections.filter(c => c.id !== action.payload);
        state.filteredCollections = state.filteredCollections.filter(c => c.id !== action.payload);
        if (state.selectedCollection?.id === action.payload) {
          state.selectedCollection = null;
        }
      });
  }
});

export const { 
  setFilters, 
  clearFilters, 
  selectCollection, 
  clearSelectedCollection 
} = collectionsSlice.actions;

export default collectionsSlice.reducer;
