import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { getDB } from '@/lib/db';
// import { generateUniqueId } from '@/lib/utils'; // No longer needed here
import { 
  CounterHistoryEntry, 
  CounterUpdate, 
  updateMachineCounter as updateMachineCounterInDB 
} from '@/lib/counterSync'; // Import necessary types and function

// Define the state interface
interface CounterState {
  counters: CounterHistoryEntry[]; // Use CounterHistoryEntry
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
// Specify return type as CounterHistoryEntry[]
export const fetchAllCounters = createAsyncThunk<CounterHistoryEntry[]>(
  'counters/fetchAllCounters',
  async () => {
    const db = await getDB();
    return db.getAll('counterHistory'); // Corregido el nombre del almacén
  }
);

// Specify return type as CounterHistoryEntry[] and correct store/index
export const fetchCountersByMachine = createAsyncThunk<CounterHistoryEntry[], string>(
  'counters/fetchCountersByMachine',
  async (machineId) => {
    const db = await getDB();
    // Use 'counterHistory' store and 'by-machine-id' index
    const index = db.transaction('counterHistory').store.index('by-machine-id'); 
    return index.getAll(machineId);
  }
);

// Rewrite updateMachineCounter thunk to use the imported function
// Specify return type as CounterHistoryEntry | null
export const updateMachineCounter = createAsyncThunk<CounterHistoryEntry | null, CounterUpdate>(
  'counters/updateMachineCounter',
  async (updateData) => {
    const result = await updateMachineCounterInDB(updateData);
    if (!result) {
      // Handle the error case, maybe throw an error or return a specific structure
      // For now, let's throw an error to be caught by the rejected case
      throw new Error(`Failed to update counter for machine ${updateData.machineId}`);
    }
    return result; // Return the created CounterHistoryEntry
    /* 
    // Original implementation removed:
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
    */
  }
);
/* Original parameters for reference:
  async ({ 
    machineId, 
    newCounter, 
    source, 
    notes 
  }: CounterUpdate) => { ... }
*/

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
      // Update PayloadAction type
      .addCase(fetchAllCounters.fulfilled, (state, action: PayloadAction<CounterHistoryEntry[]>) => { 
        state.status = 'succeeded';
        state.counters = action.payload;
      })
      .addCase(fetchAllCounters.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch counters';
      })
      
      // Handle fetchCountersByMachine
      // Update PayloadAction type and merging logic
      .addCase(fetchCountersByMachine.fulfilled, (state, action: PayloadAction<CounterHistoryEntry[]>) => {
        // Use timestamp as the unique key for merging
        const existingTimestamps = new Set(state.counters.map(c => c.timestamp));
        const newCounters = action.payload.filter(c => !existingTimestamps.has(c.timestamp));
        state.counters = [...state.counters, ...newCounters].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); // Keep sorted
      })
      .addCase(fetchCountersByMachine.pending, (_state) => { // Optional: Add pending/rejected if needed
        // state.status = 'loading';
      })
      .addCase(fetchCountersByMachine.rejected, (_state, _action) => { // Optional: Add pending/rejected if needed - Fix unused variable
        // _state.status = 'failed'; // Use _state if uncommented
        // _state.error = _action.error.message || 'Failed to fetch counters for machine'; // Use _action and _state if uncommented
      })

      // Handle updateMachineCounter
      // Update PayloadAction type and logic
      .addCase(updateMachineCounter.fulfilled, (state, action: PayloadAction<CounterHistoryEntry | null>) => {
        if (action.payload) { // Only add if the update was successful
          state.counters.push(action.payload);
          state.counters.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); // Keep sorted
        }
        // Optionally handle the null case (update failed) if needed
      })
      .addCase(updateMachineCounter.pending, (_state) => { // Optional: Add pending/rejected if needed
        // state.status = 'loading';
      })
      .addCase(updateMachineCounter.rejected, (_state, action) => { // Optional: Add pending/rejected if needed
         // _state.status = 'failed'; // Example: Set status to failed - Let's keep the state modification commented out as it was, but fix the unused variable warning. If needed, uncomment and use _state.
         // _state.error = action.error.message || 'Failed to update counter'; // Example: Store error - Same as above.
         // For now, just log the error or handle it differently if needed without modifying state directly here.
         console.error("Update machine counter failed:", action.error);
      });
  }
});

export default counterSlice.reducer;
