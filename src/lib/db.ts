import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Definición de tipos para las entidades principales
export interface Machine {
  id: string;
  serialNumber: string;
  type: string;
  model: string;
  brand: string;
  cost: number;
  purchaseDate: string;
  status: 'warehouse' | 'installed' | 'repair';
  clientId?: string;
  currentCounter: number;
  initialCounter: number;
  splitPercentage: number;
  createdAt: string;
  updatedAt: string;
  history: {
    date: string;
    action: string;
    details: string;
  }[];
  // Campos adicionales
  width?: number;
  height?: number;
  depth?: number;
  description?: string;
  warranty?: number;
  supplier?: string;
  initialStatus?: string;
  hasManual?: boolean;
  hasWarrantyDoc?: boolean;
  installationData?: {
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
  };
}

export interface Client {
  id: number;
  name: string;
  businessType?: string;
  owner?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  taxId?: string;
  morningOpenTime?: string;
  morningCloseTime?: string;
  eveningOpenTime?: string;
  eveningCloseTime?: string;
  closingDay?: string;
  machines: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

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
  createdAt: string;
}

export interface Expense {
  id: string;
  machineId?: string;
  clientId?: number;
  amount: number;
  date: string;
  type: string;
  description: string;
  receiptImage?: string;
  createdAt: string;
}

export interface CompanyProfile {
  id: string;
  name: string;
  address?: string;
  taxId?: string;
  phone?: string;
  email?: string;
  logo?: string;
  vatPercentage: number;
  createdAt: string;
  updatedAt: string;
}

// Definición del tipo User para autenticación
export interface User {
  id: string;
  username: string;
  password: string;
  name: string;
  role: 'admin' | 'technician';
  createdAt: string;
}

// Definición del esquema de la base de datos
interface RekreativDB extends DBSchema {
  machines: {
    key: string;
    value: Machine;
    indexes: {
      'by-serial-number': string;
      'by-client-id': string;
      'by-status': string;
    };
  };
  clients: {
    key: number;
    value: Client;
    indexes: {
      'by-name': string;
    };
  };
  collections: {
    key: string;
    value: Collection;
    indexes: {
      'by-machine-id': string;
      'by-client-id': number;
      'by-date': string;
    };
  };
  expenses: {
    key: string;
    value: Expense;
    indexes: {
      'by-machine-id': string;
      'by-client-id': number;
      'by-date': string;
    };
  };
  companyProfile: {
    key: string;
    value: CompanyProfile;
  };
  users: {
    key: string;
    value: User;
    indexes: {
      'by-username': string;
    };
  };
  backups: {
    key: string;
    value: {
      id: string;
      data: Blob;
      metadata: {
        timestamp: string;
        size: number;
        version: string;
      };
      createdAt: string;
    };
  };
}

// Singleton para la conexión a la base de datos
let dbPromise: Promise<IDBPDatabase<RekreativDB>> | null = null;

export const getDB = async () => {
  if (!dbPromise) {
    dbPromise = openDB<RekreativDB>('rekreativ-db', 1, {
      upgrade(db) {
        // Crear almacenes de objetos si no existen
        if (!db.objectStoreNames.contains('machines')) {
          const machinesStore = db.createObjectStore('machines', { keyPath: 'id' });
          machinesStore.createIndex('by-serial-number', 'serialNumber', { unique: true });
          machinesStore.createIndex('by-client-id', 'clientId');
          machinesStore.createIndex('by-status', 'status');
        }

        if (!db.objectStoreNames.contains('clients')) {
          const clientsStore = db.createObjectStore('clients', { keyPath: 'id' });
          clientsStore.createIndex('by-name', 'name');
        }

        if (!db.objectStoreNames.contains('collections')) {
          const collectionsStore = db.createObjectStore('collections', { keyPath: 'id' });
          collectionsStore.createIndex('by-machine-id', 'machineId');
          collectionsStore.createIndex('by-client-id', 'clientId');
          collectionsStore.createIndex('by-date', 'date');
        }

        if (!db.objectStoreNames.contains('expenses')) {
          const expensesStore = db.createObjectStore('expenses', { keyPath: 'id' });
          expensesStore.createIndex('by-machine-id', 'machineId');
          expensesStore.createIndex('by-client-id', 'clientId');
          expensesStore.createIndex('by-date', 'date');
        }

        if (!db.objectStoreNames.contains('companyProfile')) {
          db.createObjectStore('companyProfile', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('users')) {
          const usersStore = db.createObjectStore('users', { keyPath: 'id' });
          usersStore.createIndex('by-username', 'username', { unique: true });
        }

        if (!db.objectStoreNames.contains('backups')) {
          db.createObjectStore('backups', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
};

// Función para inicializar la base de datos
export const initDB = async (): Promise<void> => {
  try {
    const db = await getDB();
    console.log('Database initialized successfully');
    await initializeExampleData();
    return;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

// Función para exportar toda la base de datos a JSON
export const exportDBToJSON = async (): Promise<string> => {
  const db = await getDB();
  const exportData: Record<string, any> = {};
  
  // Exportar máquinas
  exportData.machines = await db.getAll('machines');
  
  // Exportar clientes
  exportData.clients = await db.getAll('clients');
  
  // Exportar colecciones
  exportData.collections = await db.getAll('collections');
  
  // Exportar gastos
  exportData.expenses = await db.getAll('expenses');
  
  // Exportar perfil de empresa
  exportData.companyProfile = await db.getAll('companyProfile');
  
  // Exportar usuarios (sin contraseñas)
  const users = await db.getAll('users');
  exportData.users = users.map(user => {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  });
  
  // Convertir a JSON
  return JSON.stringify(exportData, null, 2);
};

// Función para importar datos desde JSON
export const importDBFromJSON = async (jsonData: string): Promise<void> => {
  const db = await getDB();
  const importData = JSON.parse(jsonData);
  
  // Transacción para importar todos los datos
  const tx = db.transaction(
    ['machines', 'clients', 'collections', 'expenses', 'companyProfile', 'users'],
    'readwrite'
  );
  
  // Limpiar y reemplazar datos
  await tx.objectStore('machines').clear();
  await tx.objectStore('clients').clear();
  await tx.objectStore('collections').clear();
  await tx.objectStore('expenses').clear();
  await tx.objectStore('companyProfile').clear();
  await tx.objectStore('users').clear();
  
  // Importar máquinas
  if (importData.machines && Array.isArray(importData.machines)) {
    for (const machine of importData.machines) {
      await tx.objectStore('machines').add(machine);
    }
  }
  
  // Importar clientes
  if (importData.clients && Array.isArray(importData.clients)) {
    for (const client of importData.clients) {
      await tx.objectStore('clients').add(client);
    }
  }
  
  // Importar colecciones
  if (importData.collections && Array.isArray(importData.collections)) {
    for (const collection of importData.collections) {
      await tx.objectStore('collections').add(collection);
    }
  }
  
  // Importar gastos
  if (importData.expenses && Array.isArray(importData.expenses)) {
    for (const expense of importData.expenses) {
      await tx.objectStore('expenses').add(expense);
    }
  }
  
  // Importar perfil de empresa
  if (importData.companyProfile && Array.isArray(importData.companyProfile)) {
    for (const profile of importData.companyProfile) {
      await tx.objectStore('companyProfile').add(profile);
    }
  }
  
  // Importar usuarios (si hay datos de usuarios)
  if (importData.users && Array.isArray(importData.users)) {
    // Obtener usuarios actuales para preservar contraseñas si es posible
    const currentUsers = await db.getAll('users');
    const usernameToPasswordMap = new Map();
    
    currentUsers.forEach(user => {
      usernameToPasswordMap.set(user.username, user.password);
    });
    
    for (const user of importData.users) {
      // Si el usuario tiene contraseña, usarla; de lo contrario, intentar recuperar la existente
      const password = user.password || usernameToPasswordMap.get(user.username) || 'defaultPassword';
      
      await tx.objectStore('users').add({
        ...user,
        password
      });
    }
  }
  
  // Completar la transacción
  await tx.done;
};

// Función para inicializar datos de ejemplo
export const initializeExampleData = async () => {
  const db = await getDB();
  
  // Verificar si ya hay datos
  const machinesCount = await db.count('machines');
  const clientsCount = await db.count('clients');
  const usersCount = await db.count('users');
  
  if (machinesCount === 0) {
    // Crear máquinas de ejemplo
    const machines: Machine[] = [
      {
        id: 'M001',
        serialNumber: 'PIN001',
        type: 'pinball',
        model: 'Pinball Deluxe',
        brand: 'Stern',
        cost: 5000,
        purchaseDate: '2023-01-15',
        status: 'warehouse',
        currentCounter: 0,
        initialCounter: 0,
        splitPercentage: 50,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        history: [{
          date: new Date().toISOString(),
          action: 'created',
          details: 'Máquina creada como ejemplo'
        }]
      },
      {
        id: 'M002',
        serialNumber: 'ARC001',
        type: 'arcade',
        model: 'Arcade Classic',
        brand: 'Namco',
        cost: 3000,
        purchaseDate: '2023-02-20',
        status: 'warehouse',
        currentCounter: 0,
        initialCounter: 0,
        splitPercentage: 50,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        history: [{
          date: new Date().toISOString(),
          action: 'created',
          details: 'Máquina creada como ejemplo'
        }]
      }
    ];
    
    const tx = db.transaction('machines', 'readwrite');
    for (const machine of machines) {
      await tx.store.add(machine);
    }
    await tx.done;
  }
  
  if (clientsCount === 0) {
    // Crear clientes de ejemplo
    const clients: Client[] = [
      {
        id: 1,
        name: 'Bar El Rincón',
        businessType: 'Bar',
        owner: 'Juan Pérez',
        address: 'Calle Mayor 15',
        city: 'Madrid',
        province: 'Madrid',
        postalCode: '28001',
        phone: '912345678',
        email: 'info@barelrincon.com',
        machines: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 2,
        name: 'Cafetería Central',
        businessType: 'Cafetería',
        owner: 'María López',
        address: 'Plaza España 3',
        city: 'Barcelona',
        province: 'Barcelona',
        postalCode: '08001',
        phone: '932345678',
        email: 'info@cafeteriacentral.com',
        machines: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    
    const tx = db.transaction('clients', 'readwrite');
    for (const client of clients) {
      await tx.store.add(client);
    }
    await tx.done;
  }
  
  // Inicializar perfil de empresa si no existe
  const companyProfile = await db.get('companyProfile', 'default');
  if (!companyProfile) {
    await db.add('companyProfile', {
      id: 'default',
      name: 'Mi Empresa',
      vatPercentage: 21,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
  
  // Crear usuario administrador por defecto si no hay usuarios
  if (usersCount === 0) {
    await db.add('users', {
      id: 'admin-default',
      username: 'admin',
      password: 'admin',
      name: 'Administrador',
      role: 'admin',
      createdAt: new Date().toISOString()
    });
    console.log('Usuario administrador por defecto creado');
  }
};
