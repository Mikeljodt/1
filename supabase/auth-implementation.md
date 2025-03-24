# Supabase Authentication Implementation Guide

This guide outlines the steps to implement authentication in your Rekreativ application using Supabase.

## 1. Setting up Authentication in Supabase Dashboard

### Enable Auth Providers

1. Go to your Supabase project dashboard
2. Navigate to Authentication > Providers
3. Enable the following providers:
   - Email (with secure password policies)
   - (Optional) Google
   - (Optional) Other social providers as needed

### Configure Email Templates

1. Go to Authentication > Email Templates
2. Customize the following templates:
   - Confirmation email
   - Invitation email
   - Magic link email
   - Password reset email

### Set Authentication Settings

1. Go to Authentication > Settings
2. Configure:
   - Site URL: Set to your production URL
   - Redirect URLs: Add all allowed redirect URLs
   - Enable email confirmations

## 2. Client-Side Authentication Implementation

### Install Supabase Client

```bash
npm install @supabase/supabase-js
```

### Create Supabase Client

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### Authentication Hooks

```typescript
// src/lib/auth.ts
import { supabase } from './supabase';
import { User } from '@supabase/supabase-js';

// Login with email and password
export async function loginWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) throw error;
  return data;
}

// Register new user
export async function registerUser(email: string, password: string, userData: any) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: userData, // Store additional user data in user metadata
    },
  });
  
  if (error) throw error;
  return data;
}

// Sign out
export async function logoutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Get current user with profile data
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;
  
  // Get the user profile data as well
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();
    
  if (error) throw error;
  
  return {
    ...user,
    profile
  };
}

// Check if user is authenticated
export async function isAuthenticated() {
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
}

// Password reset request
export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

// Update password
export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({
    password,
  });
  if (error) throw error;
}

// Check if user has admin role
export async function hasAdminRole() {
  const user = await getCurrentUser();
  return user?.profile?.role === 'admin';
}

// Auth state change listener
export function onAuthStateChange(callback: (user: User | null) => void) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null);
  });
}
```

### AuthProvider Component

```tsx
// src/components/AuthProvider.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { getCurrentUser, onAuthStateChange } from '../lib/auth';

interface AuthContextType {
  user: (User & { profile?: any }) | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<(User & { profile?: any }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial user fetch
    const fetchUser = async () => {
      try {
        const user = await getCurrentUser();
        setUser(user);
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUser();
    
    // Subscribe to auth changes
    const { data: authListener } = onAuthStateChange(async (authUser) => {
      if (authUser) {
        const fullUser = await getCurrentUser();
        setUser(fullUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    
    // Cleanup
    return () => {
      authListener?.unsubscribe();
    };
  }, []);
  
  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
```

### Redux Integration (Optional)

```typescript
// src/store/slices/authSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { loginWithEmail, registerUser, logoutUser, getCurrentUser } from '../../lib/auth';

// Create async thunks for auth operations
export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }) => {
    const data = await loginWithEmail(email, password);
    return data.user;
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async ({ email, password, userData }: { email: string; password: string; userData: any }) => {
    const data = await registerUser(email, password, userData);
    return data.user;
  }
);

export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchCurrentUser',
  async () => {
    return await getCurrentUser();
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async () => {
    await logoutUser();
    return null;
  }
);

// Create the auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    loading: false,
    error: null as string | null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Login
    builder.addCase(login.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(login.fulfilled, (state, action) => {
      state.user = action.payload;
      state.loading = false;
    });
    builder.addCase(login.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Login failed';
    });
    
    // Register
    builder.addCase(register.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(register.fulfilled, (state, action) => {
      state.user = action.payload;
      state.loading = false;
    });
    builder.addCase(register.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Registration failed';
    });
    
    // Fetch current user
    builder.addCase(fetchCurrentUser.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(fetchCurrentUser.fulfilled, (state, action) => {
      state.user = action.payload;
      state.loading = false;
    });
    builder.addCase(fetchCurrentUser.rejected, (state) => {
      state.user = null;
      state.loading = false;
    });
    
    // Logout
    builder.addCase(logout.fulfilled, (state) => {
      state.user = null;
    });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
```

## 3. Protecting Routes

```tsx
// src/components/ProtectedRoute.tsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export function ProtectedRoute({ 
  children, 
  requiredRole 
}: { 
  children: React.ReactNode; 
  requiredRole?: 'admin' | 'technician' 
}) {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  if (requiredRole && user.profile?.role !== requiredRole && user.profile?.role !== 'admin') {
    return <Navigate to="/unauthorized" replace />;
  }
  
  return <>{children}</>;
}
```

## 4. Login and Register Pages

### Login Page

```tsx
// src/pages/LoginPage.tsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginWithEmail } from '../lib/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      await loginWithEmail(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <h1>Login</h1>
      {error && <div className="error">{error}</div>}
      
      <form onSubmit={handleLogin}>
        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        
        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        
        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
        
        <div>
          <Link to="/reset-password">Forgot password?</Link>
        </div>
        
        <div>
          Don't have an account? <Link to="/register">Register</Link>
        </div>
      </form>
    </div>
  );
}
```

### Register Page

```tsx
// src/pages/RegisterPage.tsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerUser } from '../lib/auth';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      await registerUser(email, password, { name });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <h1>Register</h1>
      {error && <div className="error">{error}</div>}
      
      <form onSubmit={handleRegister}>
        <div>
          <label htmlFor="name">Full Name</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        
        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        
        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>
        
        <button type="submit" disabled={loading}>
          {loading ? 'Registering...' : 'Register'}
        </button>
        
        <div>
          Already have an account? <Link to="/login">Login</Link>
        </div>
      </form>
    </div>
  );
}
```

### Password Reset Request

```tsx
// src/pages/PasswordResetPage.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '../lib/auth';

export default function PasswordResetPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      await requestPasswordReset(email);
      setSuccessMessage('If an account exists with this email, you will receive a password reset link shortly.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <h1>Reset Password</h1>
      {error && <div className="error">{error}</div>}
      {successMessage && <div className="success">{successMessage}</div>}
      
      <form onSubmit={handleResetRequest}>
        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        
        <button type="submit" disabled={loading}>
          {loading ? 'Sending...' : 'Reset Password'}
        </button>
        
        <div>
          <Link to="/login">Back to Login</Link>
        </div>
      </form>
    </div>
  );
}
```

## 5. Handling Auth State in Your Application

Wrap your main application component with the AuthProvider:

```tsx
// src/App.tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './components/AuthProvider';
import { ProtectedRoute } from './components/ProtectedRoute';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PasswordResetPage from './pages/PasswordResetPage';
// ... other imports

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/reset-password" element={<PasswordResetPage />} />
          
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } />
          
          <Route path="/admin" element={
            <ProtectedRoute requiredRole="admin">
              <AdminPage />
            </ProtectedRoute>
          } />
          
          {/* Other routes */}
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
```
