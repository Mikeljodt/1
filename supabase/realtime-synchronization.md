# Real-Time Data Synchronization with Supabase

This guide outlines how to implement real-time data synchronization in your Rekreativ application using Supabase's real-time features.

## 1. Enable Real-Time for Your Tables

First, enable real-time for the tables you want to subscribe to:

1. Go to your Supabase project dashboard
2. Navigate to Database > Replication
3. Enable replication for the tables you want to subscribe to:
   - `clients`
   - `machines`
   - `collections`
   - `expenses`
   - `maintenance`
   - `spare_parts`
   - `payments`

## 2. Set Up Real-Time Client

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});
```

## 3. Real-Time Hooks

Create reusable hooks for real-time subscriptions:

```typescript
// src/hooks/useRealtimeSubscription.ts
import { useEffect, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type SubscriptionCallback = (payload: {
  new: any;
  old: any;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
}) => void;

export function useRealtimeSubscription(
  table: string,
  callback: SubscriptionCallback,
  schema = 'public'
) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    // Create a channel for the table
    const channel = supabase
      .channel(`${schema}:${table}`)
      .on('postgres_changes', { 
        event: '*', 
        schema, 
        table 
      }, (payload) => {
        callback({
          new: payload.new,
          old: payload.old,
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE'
        });
      })
      .subscribe();

    setChannel(channel);

    // Cleanup function
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [table, schema, callback]);

  return channel;
}
```

## 4. Table-Specific Real-Time Hooks

Create hooks for specific tables to make them easier to use:

```typescript
// src/hooks/useRealtimeClients.ts
import { useCallback } from 'react';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { useDispatch } from 'react-redux';
import { addClient, updateClient, deleteClient } from '../store/slices/clientsSlice';

export function useRealtimeClients() {
  const dispatch = useDispatch();
  
  const handleClientChange = useCallback((payload) => {
    if (payload.eventType === 'INSERT') {
      dispatch(addClient(payload.new));
    } else if (payload.eventType === 'UPDATE') {
      dispatch(updateClient(payload.new));
    } else if (payload.eventType === 'DELETE') {
      dispatch(deleteClient(payload.old.id));
    }
  }, [dispatch]);
  
  return useRealtimeSubscription('clients', handleClientChange);
}
```

Repeat this pattern for other tables (`collections`, `machines`, etc.).

## 5. Redux Integration

Update your Redux thunks to work with Supabase:

```typescript
// src/store/slices/clientsSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '../../lib/supabase';

// Fetch all clients
export const fetchClients = createAsyncThunk(
  'clients/fetchClients',
  async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name');
      
    if (error) throw error;
    return data;
  }
);

// Add a client
export const addClient = createAsyncThunk(
  'clients/addClient',
  async (clientData) => {
    const { data, error } = await supabase
      .from('clients')
      .insert(clientData)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }
);

// Update a client
export const updateClient = createAsyncThunk(
  'clients/updateClient',
  async ({ id, ...updates }) => {
    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }
);

// Delete a client
export const deleteClient = createAsyncThunk(
  'clients/deleteClient',
  async (id) => {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
    return id;
  }
);

// Create the clients slice
const clientsSlice = createSlice({
  name: 'clients',
  initialState: {
    clients: [],
    status: 'idle',
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    // Add reducers for thunks
    builder
      .addCase(fetchClients.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchClients.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.clients = action.payload;
      })
      .addCase(fetchClients.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      .addCase(addClient.fulfilled, (state, action) => {
        state.clients.push(action.payload);
      })
      .addCase(updateClient.fulfilled, (state, action) => {
        const index = state.clients.findIndex(client => client.id === action.payload.id);
        if (index !== -1) {
          state.clients[index] = action.payload;
        }
      })
      .addCase(deleteClient.fulfilled, (state, action) => {
        state.clients = state.clients.filter(client => client.id !== action.payload);
      });
  },
});

export default clientsSlice.reducer;
```

## 6. Using Real-Time in Components

Use the real-time hooks in your components:

```tsx
// src/pages/ClientsPage.tsx
import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchClients } from '../store/slices/clientsSlice';
import { useRealtimeClients } from '../hooks/useRealtimeClients';

export default function ClientsPage() {
  const dispatch = useDispatch();
  const { clients, status, error } = useSelector((state) => state.clients);
  
  // Set up real-time subscription
  useRealtimeClients();
  
  // Initial data fetch
  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchClients());
    }
  }, [status, dispatch]);
  
  if (status === 'loading') {
    return <div>Loading...</div>;
  }
  
  if (status === 'failed') {
    return <div>Error: {error}</div>;
  }
  
  return (
    <div>
      <h1>Clients</h1>
      {/* Render client list */}
      <ul>
        {clients.map((client) => (
          <li key={client.id}>{client.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

## 7. Presence for User Status

If you need to track online users (e.g., for a collaborative feature):

```typescript
// src/hooks/usePresence.ts
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthProvider';

export function usePresence(room = 'online-users') {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState([]);
  
  useEffect(() => {
    if (!user) return;
    
    const channel = supabase.channel(room, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });
    
    // Handle presence updates
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const users = Object.keys(state).map((key) => state[key][0]);
      setOnlineUsers(users);
    });
    
    // Subscribe to the channel and announce presence
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          id: user.id,
          name: user.profile?.name || user.email,
          role: user.profile?.role,
          online_at: new Date().toISOString(),
        });
      }
    });
    
    // Cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, room]);
  
  return onlineUsers;
}
```

## 8. Custom Broadcast Channels

For custom messages that don't relate to database changes:

```typescript
// src/hooks/useBroadcast.ts
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useBroadcast(channelName, eventName) {
  const [messages, setMessages] = useState([]);
  
  useEffect(() => {
    const channel = supabase.channel(channelName);
    
    channel.on('broadcast', { event: eventName }, (payload) => {
      setMessages((msgs) => [...msgs, payload]);
    });
    
    channel.subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelName, eventName]);
  
  const broadcast = (payload) => {
    supabase.channel(channelName).send({
      type: 'broadcast',
      event: eventName,
      payload,
    });
  };
  
  return { messages, broadcast };
}
```

## 9. Real-Time Data Caching Strategy

To efficiently handle real-time updates:

1. Initial load from Supabase via Redux thunks
2. Update Redux store on real-time events
3. Optimistic updates for better UX
4. Background data validation to ensure consistency

Example for optimistic updates:

```tsx
// Example component with optimistic updates
function CollectionForm({ machineId, clientId }) {
  const dispatch = useDispatch();
  const [amount, setAmount] = useState(0);
  const [counter, setCounter] = useState(0);
  
  const handleAddCollection = async () => {
    // Create data object
    const newCollection = {
      machineId,
      clientId,
      amount,
      currentCounter: counter,
      previousCounter: /* get previous counter */,
      date: new Date().toISOString(),
    };
    
    // Generate a temporary ID
    const tempId = 'temp-' + Date.now();
    
    // Optimistically add to Redux
    dispatch({
      type: 'collections/collectionAdded',
      payload: {
        ...newCollection,
        id: tempId,
      },
    });
    
    try {
      // Actually save to Supabase
      const result = await dispatch(addCollection(newCollection)).unwrap();
      
      // Replace temp record with real one
      dispatch({
        type: 'collections/collectionUpdated',
        payload: {
          id: tempId,
          changes: { id: result.id },
        },
      });
    } catch (error) {
      // Remove the temp record if failed
      dispatch({
        type: 'collections/collectionRemoved',
        payload: tempId,
      });
      
      // Show error
      console.error('Failed to add collection:', error);
    }
  };
  
  return (
    <form onSubmit={handleAddCollection}>
      {/* Form fields */}
    </form>
  );
}
```

## 10. Real-Time Error Handling and Reconnection

Create a utility to handle real-time connection issues:

```typescript
// src/lib/realtimeManager.ts
import { supabase } from './supabase';

export function setupRealtimeErrorHandling() {
  supabase.realtime.onDisconnect(() => {
    console.log("Realtime disconnected");
    // Update UI to show offline status
  });
  
  supabase.realtime.onReconnect(() => {
    console.log("Realtime reconnected");
    // Refresh data to ensure it's up to date
    // Update UI to show online status
  });
}

export function isRealtimeConnected() {
  return supabase.realtime.listenerStatus === 'CONNECTED';
}
```

Initialize this in your main app component:

```tsx
// src/App.tsx
import { useEffect } from 'react';
import { setupRealtimeErrorHandling } from './lib/realtimeManager';

function App() {
  useEffect(() => {
    setupRealtimeErrorHandling();
  }, []);
  
  // Rest of your app
}
```
