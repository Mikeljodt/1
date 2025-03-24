import { getDB, User } from './db';
import { generateUniqueId } from './utils';

// User authentication functions
export async function loginUser(username: string, password: string): Promise<User | null> {
  try {
    const db = await getDB();
    
    // Get all users for debugging
    const allUsers = await db.getAll('users');
    console.log('All users in database:', allUsers);
    
    const userIndex = db.transaction('users').store.index('by-username');
    const user = await userIndex.get(username);
    
    console.log('Found user:', user);
    console.log('Input credentials:', { username, password: '******' });
    
    if (user && user.password === password) {
      // Store user info in localStorage (excluding password)
      const { password: _, ...userInfo } = user;
      localStorage.setItem('currentUser', JSON.stringify(userInfo));
      return user;
    }
    
    return null;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

export async function registerUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
  try {
    const db = await getDB();
    
    // Check if username already exists
    const userIndex = db.transaction('users').store.index('by-username');
    const existingUser = await userIndex.get(userData.username);
    
    if (existingUser) {
      throw new Error('Username already exists');
    }
    
    const newUser: User = {
      ...userData,
      id: generateUniqueId(),
      createdAt: new Date().toISOString()
    };
    
    await db.add('users', newUser);
    console.log('User registered successfully:', { ...newUser, password: '******' });
    
    // Automatically log in the user after registration
    const { password: _, ...userInfo } = newUser;
    localStorage.setItem('currentUser', JSON.stringify(userInfo));
    
    return newUser;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
}

// Add a password reset function
export async function resetPassword(username: string, newPassword: string): Promise<boolean> {
  try {
    const db = await getDB();
    const userIndex = db.transaction('users').store.index('by-username');
    const user = await userIndex.get(username);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Update the user's password
    user.password = newPassword;
    
    // Save the updated user
    const tx = db.transaction('users', 'readwrite');
    await tx.store.put(user);
    await tx.done;
    
    return true;
  } catch (error) {
    console.error('Password reset error:', error);
    return false;
  }
}

// Función para crear un admin por defecto (usado por AuthDebugger)
export async function createDefaultAdmin(force: boolean = false): Promise<void> {
  try {
    const db = await getDB();
    const users = await db.getAll('users');
    
    if (users.length === 0 || force) {
      const defaultAdmin: User = {
        id: generateUniqueId(),
        username: 'admin',
        password: 'admin',
        name: 'Administrador',
        role: 'admin',
        createdAt: new Date().toISOString()
      };
      
      // Si forzamos, intentar eliminar usuario admin existente
      if (force) {
        const userIndex = db.transaction('users').store.index('by-username');
        const existingAdmin = await userIndex.get('admin');
        
        if (existingAdmin) {
          const tx = db.transaction('users', 'readwrite');
          await tx.store.delete(existingAdmin.id);
          await tx.done;
        }
      }
      
      await db.add('users', defaultAdmin);
      console.log('Default admin user created');
    }
  } catch (error) {
    console.error('Error creating default admin:', error);
    throw error;
  }
}

// Add a function to create a default admin user if none exists
export async function ensureDefaultAdmin(): Promise<void> {
  try {
    const db = await getDB();
    const users = await db.getAll('users');
    
    if (users.length === 0) {
      const defaultAdmin: User = {
        id: generateUniqueId(),
        username: 'admin',
        password: 'admin',
        name: 'Administrador',
        role: 'admin',
        createdAt: new Date().toISOString()
      };
      
      await db.add('users', defaultAdmin);
      console.log('Default admin user created');
    }
  } catch (error) {
    console.error('Error creating default admin:', error);
  }
}

// Función para validar credenciales de usuario (utilizada por AuthDebugger)
export async function validateUser(username: string, password: string): Promise<User | null> {
  try {
    const db = await getDB();
    const userIndex = db.transaction('users').store.index('by-username');
    const user = await userIndex.get(username);
    
    if (user && user.password === password) {
      return user;
    }
    
    return null;
  } catch (error) {
    console.error('Validation error:', error);
    throw error;
  }
}

// Función para eliminar todos los usuarios (utilizada por AuthDebugger)
export async function deleteAllUsers(): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction('users', 'readwrite');
    await tx.store.clear();
    await tx.done;
    console.log('All users deleted');
  } catch (error) {
    console.error('Error deleting users:', error);
    throw error;
  }
}

export function getCurrentUser(): Omit<User, 'password'> | null {
  const userJson = localStorage.getItem('currentUser');
  if (!userJson) return null;
  
  return JSON.parse(userJson);
}

export function logoutUser(): void {
  localStorage.removeItem('currentUser');
}

export function isAuthenticated(): boolean {
  return !!getCurrentUser();
}

export function hasRole(role: 'admin' | 'technician'): boolean {
  const user = getCurrentUser();
  return user ? user.role === role : false;
}

// Function to clear all auth data
export function clearAuthData(): void {
  localStorage.removeItem('currentUser');
  console.log('Auth data cleared');
}
