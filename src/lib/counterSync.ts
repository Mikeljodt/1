import { getDB } from './db';
import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

// Define the counter update structure
export interface CounterUpdate {
  machineId: string;
  newCounter: number;
  source: 'installation' | 'collection' | 'maintenance' | 'transfer' | 'manual';
  notes?: string;
  timestamp?: string;
  userId?: string;
}

// Define the counter history entry structure
export interface CounterHistoryEntry {
  machineId: string;
  timestamp: string;
  previousCounter: number;
  newCounter: number;
  difference: number;
  source: string;
  notes?: string;
  userId?: string;
}

// Function to update a machine's counter
export const updateMachineCounter = async (update: CounterUpdate): Promise<boolean> => {
  try {
    const db = await getDB();
    
    // Get the current machine data
    const machine = await db.get('machines', update.machineId);
    if (!machine) {
      console.error(`Machine with ID ${update.machineId} not found`);
      return false;
    }
    
    // Create a history entry
    const historyEntry: CounterHistoryEntry = {
      machineId: update.machineId,
      timestamp: update.timestamp || new Date().toISOString(),
      previousCounter: machine.currentCounter,
      newCounter: update.newCounter,
      difference: update.newCounter - machine.currentCounter,
      source: update.source,
      notes: update.notes,
      userId: update.userId || 'system'
    };
    
    // Update the machine counter
    const updatedMachine = {
      ...machine,
      currentCounter: update.newCounter,
      updatedAt: new Date().toISOString()
    };
    
    // Store both the updated machine and the history entry
    const tx = db.transaction(['machines', 'counterHistory'], 'readwrite');
    
    // Create the counterHistory store if it doesn't exist
    if (!tx.objectStoreNames.contains('counterHistory')) {
      db.createObjectStore('counterHistory', { keyPath: 'timestamp' });
    }
    
    await tx.objectStore('machines').put(updatedMachine);
    await tx.objectStore('counterHistory').add(historyEntry);
    await tx.done;
    
    console.log(`Counter updated for machine ${update.machineId}: ${machine.currentCounter} -> ${update.newCounter}`);
    return true;
  } catch (error) {
    console.error('Error updating machine counter:', error);
    return false;
  }
};

// Function to get counter history for a machine
export const getCounterHistory = async (machineId: string): Promise<CounterHistoryEntry[]> => {
  try {
    const db = await getDB();
    
    // Ensure the counterHistory store exists
    if (!db.objectStoreNames.contains('counterHistory')) {
      return [];
    }
    
    // Get all history entries for this machine
    const allHistory = await db.getAll('counterHistory');
    return allHistory.filter(entry => entry.machineId === machineId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (error) {
    console.error('Error getting counter history:', error);
    return [];
  }
};

// Function to get the latest counter for a machine
export const getLatestCounter = async (machineId: string): Promise<number | null> => {
  try {
    const db = await getDB();
    const machine = await db.get('machines', machineId);
    return machine ? machine.currentCounter : null;
  } catch (error) {
    console.error('Error getting latest counter:', error);
    return null;
  }
};

// Function to fetch all counters for all machines
export const fetchAllCounters = async (): Promise<Record<string, number>> => {
  try {
    const db = await getDB();
    const machines = await db.getAll('machines');
    
    const counters: Record<string, number> = {};
    machines.forEach(machine => {
      counters[machine.id] = machine.currentCounter;
    });
    
    return counters;
  } catch (error) {
    console.error('Error fetching all counters:', error);
    return {};
  }
};

// Function to sync counters with Supabase (if available)
export const syncCountersWithSupabase = async (): Promise<boolean> => {
  try {
    // Check if we have Supabase credentials
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.log('Supabase credentials not found, skipping sync');
      return false;
    }
    
    // Initialize Supabase client
    const supabase = createClient<Database>(supabaseUrl, supabaseKey);
    
    // Get all machines from IndexedDB
    const db = await getDB();
    const machines = await db.getAll('machines');
    
    // For each machine, update the counter in Supabase
    for (const machine of machines) {
      const { error } = await supabase
        .from('machines')
        .update({ current_counter: machine.currentCounter })
        .eq('id', machine.id);
      
      if (error) {
        console.error(`Error syncing counter for machine ${machine.id}:`, error);
      }
    }
    
    console.log('Counter sync with Supabase completed');
    return true;
  } catch (error) {
    console.error('Error syncing counters with Supabase:', error);
    return false;
  }
};
