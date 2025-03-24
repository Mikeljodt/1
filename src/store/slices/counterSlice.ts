import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { getDB } from '@/lib/db';
import { generateUniqueId } from '@/lib/utils';

// Define the Counter interface
export interface Counter {
  id: string;
  machineId: string;
  value: number;
  date: string;
  source: string;
  notes?: string;
  createdAt: string;
  createdBy?: string;
}

// Define the state interface
interface CounterState {
  counters: Counter[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

// Initial state
const initialState: CounterState = {
  counters: [],
  status: 'idle',
  error: null
};

// Async thunks
export const fetchAllCounters = createAsyncThunk(
  'counters/fetchAllCounters',
  async () => {
    const db = await getDB();
    return db.getAll('counters');
  }
);

export const fetchCountersByMachine = createAsyncThunk(
  'counters/fetchCountersByMachine',
  async (machineId: string) => {
    const db = await getDB();
    const index = db.transaction('counters').store.index('by-machine-id');
    return index.getAll(machineId);
  }
);

export const updateMachineCounter = createAsyncThunk(
  'counters/updateMachineCounter',
  async ({ 
    machineId, 
    newCounter, 
    source, 
    notes 
  }: { 
    machineId: string; 
    newCounter: number; 
    source: string;
    notes?: string;
  }) => {
    const db = await getDB();
    const now = new Date().toISOString();
    
    // Get the machine to update its counter
    const machine = await db.get('machines', machineId);
    if (!machine) {
      throw new Error('Machine not found');
    }
    
    // Create new counter record
    const newCounterRecord: Counter = {
      id: generateUniqueId(),
      machineId,
      value: newCounter,
      date: now,
      source,
      notes,
      createdAt: now
    };
    
    // Update machine counter
    const updatedMachine = {
      ...machine,
      currentCounter: newCounter,
      updatedAt: now,
      history: [
        ...(machine.history || []),
        {
          date: now,
          action: 'counter_update',
          details: `Counter updated to ${newCounter} via ${source}${notes ? `: ${notes}` : ''}`
        }
      ]
    };
    
    // Use transaction to ensure both operations succeed or fail together
    const tx = db.transaction(['counters', 'machines'], 'readwrite');
    await tx.objectStore('counters').add(newCounterRecord);
    await tx.objectStore('machines').put(updatedMachine);
    await tx.done;
    
    return { counter: newCounterRecord, machine: updatedMachine };
  }
);

// Create the slice
const counterSlice = createSlice({
  name: 'counter',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Handle fetchAllCounters
      .addCase(fetchAllCounters.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchAllCounters.fulfilled, (state, action: PayloadAction<Counter[]>) => {
        state.status = 'succeeded';
        state.counters = action.payload;
      })
      .addCase(fetchAllCounters.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch counters';
      })
      
      // Handle fetchCountersByMachine
      .addCase(fetchCountersByMachine.fulfilled, (state, action: PayloadAction<Counter[]>) => {
        // We don't replace all counters, just add these to the existing array if they're not already there
        const existingIds = new Set(state.counters.map(c => c.id));
        const newCounters = action.payload.filter(c => !existingIds.has(c.id));
        state.counters = [...state.counters, ...newCounters];
      })
      
      // Handle updateMachineCounter
      .addCase(updateMachineCounter.fulfilled, (state, action) => {
        state.counters.push(action.payload.counter);
      });
  }
});

export default counterSlice.reducer;
