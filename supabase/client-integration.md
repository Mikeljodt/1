# Supabase Client Integration Guidelines

This document provides guidelines for integrating Supabase with your client-side application, focusing on best practices for data fetching, caching, and real-time updates.

## 1. Project Setup

### Environment Variables

Create a `.env` file for your Supabase credentials:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Make sure to add a `.env.example` file without real credentials for version control.

### Supabase Client Initialization

Create a centralized supabase client instance:

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types'; // Generated types (see below)

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey, 
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);
```

### TypeScript Type Generation

For TypeScript type safety with your Supabase database:

1. Install the Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Generate types:
   ```bash
   supabase gen types typescript --project-id your-project-id > src/lib/database.types.ts
   ```

3. Use these types in your application

## 2. Data Fetching Best Practices

### Query Functions

Create query functions for each entity, following these principles:

- Use the builder pattern for readability
- Include proper error handling
- Add TypeScript types
- Keep query reusable and composable

```typescript
// src/lib/queries/clients.ts
import { supabase } from '../supabase';
import type { Client } from '../database.types';

// Get all clients
export async function getClients() {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('name');
    
  if (error) throw error;
  return data;
}

// Get a single client with its related machines
export async function getClientWithMachines(id: number) {
  const { data, error } = await supabase
    .from('clients')
    .select(`
      *,
      machines (*)
    `)
    .eq('id', id)
    .single();
    
  if (error) throw error;
  return data;
}

// Add a client
export async function addClient(client: Omit<Client, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('clients')
    .insert(client)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

// Update a client
export async function updateClient(id: number, updates: Partial<Client>) {
  const { data, error } = await supabase
    .from('clients')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

// Delete a client
export async function deleteClient(id: number) {
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id);
    
  if (error) throw error;
  return true;
}
```

### Error Handling

Implement consistent error handling throughout your application:

```typescript
// src/lib/errors.ts
import { PostgrestError } from '@supabase/supabase-js';

export class DatabaseError extends Error {
  code: string | null;
  details: string | null;
  hint: string | null;
  
  constructor(error: PostgrestError) {
    super(error.message);
    this.name = 'DatabaseError';
    this.code = error.code;
    this.details = error.details;
    this.hint = error.hint;
  }
  
  get isUniqueViolation() {
    return this.code === '23505';
  }
  
  get isForeignKeyViolation() {
    return this.code === '23503';
  }
  
  get isCheckViolation() {
    return this.code === '23514';
  }
}

// Helper to convert Supabase errors to user-friendly messages
export function getErrorMessage(error: unknown): string {
  if (error instanceof DatabaseError) {
    if (error.isUniqueViolation) {
      return 'This record already exists.';
    }
    if (error.isForeignKeyViolation) {
      return 'This record is referenced by another record and cannot be modified.';
    }
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unknown error occurred.';
}
```

## 3. Caching Strategies

### Redux Data Caching

When using Redux, implement a caching strategy:

```typescript
// src/store/slices/clientsSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getClients, addClient, updateClient, deleteClient } from '../../lib/queries/clients';

// Redux toolkit createAsyncThunk with caching
export const fetchClients = createAsyncThunk(
  'clients/fetchClients',
  async (_, { getState }) => {
    const { clients } = getState();
    
    // Skip fetch if we already have data and it's recent enough (< 5 minutes old)
    const now = Date.now();
    if (
      clients.status === 'succeeded' && 
      clients.lastFetched && 
      now - clients.lastFetched < 5 * 60 * 1000
    ) {
      return clients.data;
    }
    
    // Otherwise fetch fresh data
    return await getClients();
  }
);

// Other thunks for CRUD operations...

const clientsSlice = createSlice({
  name: 'clients',
  initialState: {
    data: [],
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
    lastFetched: null,
  },
  reducers: {
    invalidateCache: (state) => {
      state.lastFetched = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchClients.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchClients.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
        state.lastFetched = Date.now();
      })
      .addCase(fetchClients.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      // Handle other actions...
  },
});

export const { invalidateCache } = clientsSlice.actions;
export default clientsSlice.reducer;
```

### React Query (Optional Alternative)

If you prefer React Query over Redux for data fetching:

```typescript
// src/hooks/useClients.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getClients, addClient, updateClient, deleteClient } from '../lib/queries/clients';

export function useClients() {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ['clients'],
    queryFn: getClients,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  const addMutation = useMutation({
    mutationFn: addClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
  
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateClient(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
  
  const deleteMutation = useMutation({
    mutationFn: deleteClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
  
  return {
    clients: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    addClient: addMutation.mutate,
    updateClient: updateMutation.mutate,
    deleteClient: deleteMutation.mutate,
    isAdding: addMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
```

## 4. Real-Time Updates Integration

### Redux Integration for Real-Time

```typescript
// src/lib/realtime.ts
import { supabase } from './supabase';
import { store } from '../store';
import { addClient, updateClient, removeClient } from '../store/slices/clientsSlice';
import { addMachine, updateMachine, removeMachine } from '../store/slices/machinesSlice';

export function setupRealtimeSubscriptions() {
  // Clients subscription
  const clientsChannel = supabase
    .channel('schema-db-changes')
    .on('postgres_changes', { 
      event: 'INSERT', 
      schema: 'public', 
      table: 'clients' 
    }, (payload) => {
      store.dispatch(addClient(payload.new));
    })
    .on('postgres_changes', { 
      event: 'UPDATE', 
      schema: 'public', 
      table: 'clients' 
    }, (payload) => {
      store.dispatch(updateClient(payload.new));
    })
    .on('postgres_changes', { 
      event: 'DELETE', 
      schema: 'public', 
      table: 'clients' 
    }, (payload) => {
      store.dispatch(removeClient(payload.old.id));
    });

  // Machines subscription
  const machinesChannel = supabase
    .channel('machines-changes')
    .on('postgres_changes', { 
      event: 'INSERT', 
      schema: 'public', 
      table: 'machines' 
    }, (payload) => {
      store.dispatch(addMachine(payload.new));
    })
    .on('postgres_changes', { 
      event: 'UPDATE', 
      schema: 'public', 
      table: 'machines' 
    }, (payload) => {
      store.dispatch(updateMachine(payload.new));
    })
    .on('postgres_changes', { 
      event: 'DELETE', 
      schema: 'public', 
      table: 'machines' 
    }, (payload) => {
      store.dispatch(removeMachine(payload.old.id));
    });
  
  // Subscribe to the channels
  clientsChannel.subscribe();
  machinesChannel.subscribe();
  
  // Return unsubscribe function
  return () => {
    supabase.removeChannel(clientsChannel);
    supabase.removeChannel(machinesChannel);
  };
}
```

Call this setup function in your main application file:

```typescript
// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import App from './App';
import { store } from './store';
import { setupRealtimeSubscriptions } from './lib/realtime';

// Set up realtime subscriptions
const unsubscribeRealtime = setupRealtimeSubscriptions();

// Cleanup on hot module replacement
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    unsubscribeRealtime();
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);
```

### Component-Level Real-Time Subscriptions

For more granular control, create hooks for component-level subscriptions:

```typescript
// src/hooks/useRealtimeSubscription.ts
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useRealtimeSubscription({
  table,
  schema = 'public',
  onInsert,
  onUpdate,
  onDelete,
  filter,
}) {
  useEffect(() => {
    let channel = supabase.channel(`${schema}-${table}-changes`);
    
    if (onInsert) {
      channel = channel.on('postgres_changes', { 
        event: 'INSERT', 
        schema, 
        table,
        filter,
      }, (payload) => {
        onInsert(payload.new);
      });
    }
    
    if (onUpdate) {
      channel = channel.on('postgres_changes', { 
        event: 'UPDATE', 
        schema, 
        table,
        filter,
      }, (payload) => {
        onUpdate(payload.new, payload.old);
      });
    }
    
    if (onDelete) {
      channel = channel.on('postgres_changes', { 
        event: 'DELETE', 
        schema, 
        table,
        filter,
      }, (payload) => {
        onDelete(payload.old);
      });
    }
    
    channel.subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, schema, onInsert, onUpdate, onDelete, filter]);
}
```

Usage example:

```tsx
// Example component with real-time updates
function MachineDetail({ machineId }) {
  const [machine, setMachine] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Fetch initial data
  useEffect(() => {
    async function loadMachine() {
      try {
        const data = await getMachine(machineId);
        setMachine(data);
      } catch (error) {
        console.error('Error loading machine:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadMachine();
  }, [machineId]);
  
  // Subscribe to real-time updates
  useRealtimeSubscription({
    table: 'machines',
    filter: `id=eq.${machineId}`,
    onUpdate: (newData) => {
      setMachine(newData);
    },
    onDelete: () => {
      // Handle deletion (e.g., show message, redirect)
      alert('This machine has been deleted');
    },
  });
  
  if (loading) return <div>Loading...</div>;
  if (!machine) return <div>Machine not found</div>;
  
  return (
    <div>
      <h1>{machine.brand} {machine.model}</h1>
      {/* Display machine details */}
    </div>
  );
}
```

## 5. Optimistic Updates Strategy

Improve user experience with optimistic updates:

```typescript
// src/hooks/useOptimisticMutation.ts
import { useState } from 'react';

export function useOptimisticMutation(mutationFn, options = {}) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState(null);
  
  const execute = async (data, optimisticHandler) => {
    setIsPending(true);
    setError(null);
    
    // Call optimistic handler immediately
    if (optimisticHandler) {
      optimisticHandler(data);
    }
    
    try {
      const result = await mutationFn(data);
      if (options.onSuccess) {
        options.onSuccess(result);
      }
      return result;
    } catch (err) {
      setError(err);
      if (options.onError) {
        options.onError(err);
      }
      // If optimistic update was applied, we should roll it back
      if (optimisticHandler && options.onRollback) {
        options.onRollback(data);
      }
      throw err;
    } finally {
      setIsPending(false);
    }
  };
  
  return {
    execute,
    isPending,
    error,
  };
}
```

Usage example:

```tsx
// Example component with optimistic updates
function CollectionsList({ machineId }) {
  const [collections, setCollections] = useState([]);
  const queryClient = useQueryClient();
  
  // Load initial data
  useEffect(() => {
    loadCollections();
  }, [machineId]);
  
  async function loadCollections() {
    const data = await getCollectionsByMachine(machineId);
    setCollections(data);
  }
  
  // Set up optimistic mutation
  const { execute, isPending } = useOptimisticMutation(
    addCollection,
    {
      onSuccess: (result) => {
        // Refresh data to ensure consistency
        queryClient.invalidateQueries(['collections', machineId]);
      },
      onRollback: (tempCollection) => {
        // Remove the temp item if the mutation fails
        setCollections(collections.filter(c => c.id !== tempCollection.id));
      }
    }
  );
  
  const handleAddCollection = async (collectionData) => {
    // Create temporary ID for optimistic update
    const tempId = `temp-${Date.now()}`;
    
    // Execute with optimistic update
    await execute(
      { ...collectionData, machineId },
      (data) => {
        // Apply optimistic update
        setCollections([
          ...collections,
          { ...data, id: tempId, created_at: new Date().toISOString() }
        ]);
      }
    );
  };
  
  return (
    <div>
      <h2>Collections</h2>
      <ul>
        {collections.map(collection => (
          <li key={collection.id}>
            {collection.date}: ${collection.amount}
            {collection.id.startsWith('temp-') && ' (Saving...)'}
          </li>
        ))}
      </ul>
      <CollectionForm onSubmit={handleAddCollection} isSubmitting={isPending} />
    </div>
  );
}
```

## 6. Offline Support

Implement basic offline capabilities:

```typescript
// src/lib/offlineQueue.ts
import { supabase } from './supabase';

// Simple queue for offline operations
export class OfflineQueue {
  queue: Array<{
    id: string;
    operation: 'insert' | 'update' | 'delete';
    table: string;
    data: any;
    timestamp: number;
  }> = [];
  
  constructor() {
    // Load queue from localStorage
    this.loadQueue();
    
    // Listen for online/offline events
    window.addEventListener('online', this.processQueue.bind(this));
    window.addEventListener('offline', this.saveQueue.bind(this));
  }
  
  enqueue(operation: 'insert' | 'update' | 'delete', table: string, data: any) {
    const item = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
      operation,
      table,
      data,
      timestamp: Date.now(),
    };
    
    this.queue.push(item);
    this.saveQueue();
    
    // If online, try to process immediately
    if (navigator.onLine) {
      this.processQueue();
    }
    
    return item.id;
  }
  
  async processQueue() {
    if (!navigator.onLine || this.queue.length === 0) return;
    
    // Process items in order
    const processingQueue = [...this.queue];
    this.queue = [];
    
    for (const item of processingQueue) {
      try {
        if (item.operation === 'insert') {
          await supabase.from(item.table).insert(item.data);
        } else if (item.operation === 'update') {
          const { id, ...data } = item.data;
          await supabase.from(item.table).update(data).eq('id', id);
        } else if (item.operation === 'delete') {
          await supabase.from(item.table).delete().eq('id', item.data.id);
        }
      } catch (error) {
        console.error(`Failed to process offline item:`, error, item);
        // Put back in queue for retry
        this.queue.push(item);
      }
    }
    
    this.saveQueue();
  }
  
  private loadQueue() {
    try {
      const savedQueue = localStorage.getItem('offlineQueue');
      if (savedQueue) {
        this.queue = JSON.parse(savedQueue);
      }
    } catch (error) {
      console.error('Failed to load offline queue', error);
    }
  }
  
  private saveQueue() {
    try {
      localStorage.setItem('offlineQueue', JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save offline queue', error);
    }
  }
}

// Create a singleton instance
export const offlineQueue = new OfflineQueue();
```

Usage:

```typescript
// src/lib/queries/safeQueries.ts
import { supabase } from '../supabase';
import { offlineQueue } from '../offlineQueue';

// Safe queries that work offline
export async function safeAddCollection(collectionData) {
  if (!navigator.onLine) {
    // Store in offline queue
    offlineQueue.enqueue('insert', 'collections', collectionData);
    return { 
      ...collectionData, 
      id: `offline-${Date.now()}`,
      offline: true
    };
  }
  
  // Normal online operation
  const { data, error } = await supabase
    .from('collections')
    .insert(collectionData)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}
```

## 7. File Storage Best Practices

For handling files with Supabase Storage:

```typescript
// src/lib/storage.ts
import { supabase } from './supabase';
import { v4 as uuidv4 } from 'uuid';

// Upload a file to a specific bucket
export async function uploadFile(
  bucket: string,
  file: File,
  folder: string = ''
): Promise<string> {
  // Create a unique file name to avoid collisions
  const fileExt = file.name.split('.').pop();
  const fileName = `${uuidv4()}.${fileExt}`;
  const filePath = folder ? `${folder}/${fileName}` : fileName;
  
  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });
    
  if (error) throw error;
  
  // Get the public URL
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);
    
  return data.publicUrl;
}

// Download a file by its path
export async function downloadFile(bucket: string, filePath: string) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .download(filePath);
    
  if (error) throw error;
  return data;
}

// Delete a file by its path
export async function deleteFile(bucket: string, filePath: string) {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([filePath]);
    
  if (error) throw error;
  return true;
}
```

Usage example:

```tsx
// Example component for receipt image upload
function ReceiptUploader({ expenseId, onUploadComplete }) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setIsUploading(true);
    setProgress(0);
    
    try {
      // Upload the file and get public URL
      const publicUrl = await uploadFile('receipts', file, `expenses/${expenseId}`);
      
      // Update the expense with the receipt image URL
      await supabase
        .from('expenses')
        .update({ receipt_image: publicUrl })
        .eq('id', expenseId);
      
      onUploadComplete(publicUrl);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };
  
  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={isUploading}
      />
      {isUploading && <progress value={progress} max="100" />}
    </div>
  );
}
```

## 8. Error Logging and Monitoring

Set up error logging for production:

```typescript
// src/lib/errorLogging.ts
import { supabase } from './supabase';

// Log errors to a Supabase table
export async function logError(error: Error, context: Record<string, any> = {}) {
  try {
    // Extract useful information from the error
    const errorData = {
      message: error.message,
      stack: error.stack,
      type: error.name,
      browser: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      context: JSON.stringify(context),
    };
    
    // Log to Supabase (assuming you created an error_logs table)
    await supabase.from('error_logs').insert(errorData);
  } catch (logError) {
    // Fallback to console if logging fails
    console.error('Failed to log error:', logError);
    console.error('Original error:', error);
  }
}

// Set up global error handler
export function setupGlobalErrorHandling() {
  const originalOnError = window.onerror;
  
  window.onerror = function (message, source, lineno, colno, error) {
    if (error) {
      logError(error, { source, lineno, colno });
    } else {
      logError(new Error(message as string), { source, lineno, colno });
    }
    
    // Call original handler if it exists
    if (originalOnError) {
      return originalOnError.apply(this, arguments as any);
    }
    
    return false;
  };
  
  // Also handle unhandled promise rejections
  window.addEventListener('unhandledrejection', function (event) {
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason));
    
    logError(error, { type: 'unhandledrejection' });
  });
}
```

## 9. Application Migration Strategy

Steps to migrate your existing IndexedDB application to Supabase:

1. Implement parallel data storage during migration
2. Add data synchronization to keep both systems in sync
3. Set up data migration utilities
4. Provide user-initiated migration

```typescript
// src/lib/migration.ts
import { getDB, exportDBToJSON } from './db'; // Your existing IndexedDB functions
import { supabase } from './supabase';

export async function migrateToSupabase() {
  // Get all data from IndexedDB
  const jsonData = await exportDBToJSON();
  const data = JSON.parse(jsonData);
  
  // Start a migration transaction (ideally would use a batching approach for large datasets)
  for (const [tableName, items] of Object.entries(data)) {
    if (!items.length) continue;
    
    // Map table names from IndexedDB to Supabase format
    const supabaseTable = tableName.replace(/_/g, '_');
    
    // Map data to Supabase format (adjust field names if necessary)
    const mappedItems = items.map(item => {
      // Handle ID conversions as needed
      return {
        ...item,
        // Map any field name differences here
      };
    });
    
    // Insert the data in batches
    const BATCH_SIZE = 100;
    for (let i = 0; i < mappedItems.length; i += BATCH_SIZE) {
      const batch = mappedItems.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from(supabaseTable).insert(batch);
      
      if (error) {
        console.error(`Error migrating ${supabaseTable}:`, error);
        throw error;
      }
    }
  }
  
  // Mark migration as complete
  localStorage.setItem('migrationComplete', 'true');
  
  return true;
}
```

## 10. Security Considerations

Implement secure practices for production:

```typescript
// src/lib/security.ts
import { supabase } from './supabase';

// Function to sanitize data before sending to Supabase
export function sanitizeInput(data: Record<string, any>): Record<string, any> {
  const sanitized = { ...data };
  
  // Iterate through object properties
  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === 'string') {
      // Basic XSS prevention for string values
      sanitized[key] = value
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeInput(value);
    }
  }
  
  return sanitized;
}

// Check user permissions for a specific action
export async function hasPermission(resource: string, action: 'create' | 'read' | 'update' | 'delete'): Promise<boolean> {
  const { data: session } = await supabase.auth.getSession();
  
  if (!session) return false;
  
  // Get user role from profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', session.session?.user.id)
    .single();
  
  // Simple role-based check
  if (profile?.role === 'admin') return true;
  
  // For technicians, implement more granular permission checks
  if (profile?.role === 'technician') {
    // Example: technicians can read all data but only create/update certain resources
    if (action === 'read') return true;
    if (action === 'create' && ['collections', 'maintenance'].includes(resource)) return true;
    if (action === 'update' && ['maintenance'].includes(resource)) return true;
    return false;
  }
  
  return false;
}
```

## 11. Performance Optimization

Tips for optimizing your Supabase queries:

1. Use specific column selection instead of `*` for large tables:

```typescript
// Instead of this
const { data } = await supabase.from('clients').select('*');

// Do this
const { data } = await supabase.from('clients').select('id, name, email, phone');
```

2. Limit and paginate results:

```typescript
// Using pagination
export async function getPaginatedClients(page = 1, pageSize = 20) {
  const startRow = (page - 1) * pageSize;
  const endRow = startRow + pageSize - 1;
  
  const { data, count, error } = await supabase
    .from('clients')
    .select('*', { count: 'exact' })
    .order('name')
    .range(startRow, endRow);
    
  if (error) throw error;
  
  return {
    data,
    totalCount: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}
```

3. Implement query caching:

```typescript
// src/lib/queryCache.ts
class QueryCache {
  private cache: Map<string, { data: any, timestamp: number }> = new Map();
  private ttl: number = 5 * 60 * 1000; // 5 minutes default
  
  constructor(ttlMs?: number) {
    if (ttlMs) {
      this.ttl = ttlMs;
    }
    
    // Load cache from sessionStorage if available
    this.loadCache();
    
    // Save cache to sessionStorage before page unload
    window.addEventListener('beforeunload', () => {
      this.saveCache();
    });
  }
  
  get(key: string) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    // Check if cached data is still valid
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  set(key: string, data: any) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }
  
  invalidate(keyPattern: string) {
    // Delete all keys that match the pattern
    for (const key of this.cache.keys()) {
      if (key.includes(keyPattern)) {
        this.cache.delete(key);
      }
    }
  }
  
  private loadCache() {
    try {
      const cachedData = sessionStorage.getItem('queryCache');
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        this.cache = new Map(parsed);
      }
    } catch (error) {
      console.error('Failed to load query cache', error);
    }
  }
  
  private saveCache() {
    try {
      const cacheData = Array.from(this.cache.entries());
      sessionStorage.setItem('queryCache', JSON.stringify(cacheData));
    } catch (error) {
      console.error('Failed to save query cache', error);
    }
  }
}

// Export singleton instance
export const queryCache = new QueryCache();
```

Usage:

```typescript
// Cached query function
export async function getCachedClients() {
  const cacheKey = 'clients:all';
  
  // Check cache first
  const cached = queryCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  // If not in cache, fetch from Supabase
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('name');
    
  if (error) throw error;
  
  // Cache the result
  queryCache.set(cacheKey, data);
  
  return data;
}
```
