import { getDB, exportDBToJSON } from './db';
import { generateUniqueId, downloadFile } from './utils';

// Función para crear un backup de la base de datos
export async function createBackup(): Promise<string> {
  try {
    const db = await getDB();
    const jsonData = await exportDBToJSON();
    const blob = new Blob([jsonData], { type: 'application/json' });
    
    const backupId = generateUniqueId();
    const timestamp = new Date().toISOString();
    
    // Guardar el backup en la base de datos
    await db.add('backups', {
      id: backupId,
      data: blob,
      metadata: {
        timestamp,
        size: blob.size,
        version: '1.0'
      },
      createdAt: timestamp
    });
    
    console.log(`Backup created with ID: ${backupId}`);
    return backupId;
  } catch (error) {
    console.error('Error creating backup:', error);
    throw error;
  }
}

// Función para listar todos los backups disponibles
export async function listBackups(): Promise<Array<{
  id: string;
  metadata: {
    timestamp: string;
    size: number;
    version: string;
  };
  createdAt: string;
}>> {
  try {
    const db = await getDB();
    const backups = await db.getAll('backups');
    
    // Devolver solo los metadatos, no los datos completos
    return backups.map(backup => ({
      id: backup.id,
      metadata: backup.metadata,
      createdAt: backup.createdAt
    }));
  } catch (error) {
    console.error('Error listing backups:', error);
    throw error;
  }
}

// Función para restaurar un backup específico
export async function restoreBackup(backupId: string): Promise<boolean> {
  try {
    const db = await getDB();
    const backup = await db.get('backups', backupId);
    
    if (!backup) {
      throw new Error(`Backup with ID ${backupId} not found`);
    }
    
    // Leer el blob como texto
    const jsonData = await backup.data.text();
    
    // Importar los datos
    await import('./db').then(module => {
      return module.importDBFromJSON(jsonData);
    });
    
    console.log(`Backup ${backupId} restored successfully`);
    return true;
  } catch (error) {
    console.error('Error restoring backup:', error);
    throw error;
  }
}

// Función para eliminar un backup
export async function deleteBackup(backupId: string): Promise<boolean> {
  try {
    const db = await getDB();
    await db.delete('backups', backupId);
    console.log(`Backup ${backupId} deleted successfully`);
    return true;
  } catch (error) {
    console.error('Error deleting backup:', error);
    throw error;
  }
}

// Función para iniciar el proceso de backup automático
export async function startAutoBackup(intervalHours = 24): Promise<void> {
  // Crear un backup inicial
  await createBackup();
  
  // Configurar backup periódico
  const intervalMs = intervalHours * 60 * 60 * 1000;
  setInterval(async () => {
    try {
      await createBackup();
      console.log('Automatic backup created');
      
      // Limpiar backups antiguos (mantener solo los últimos 7)
      await cleanupOldBackups(7);
    } catch (error) {
      console.error('Error in automatic backup:', error);
    }
  }, intervalMs);
  
  console.log(`Automatic backup scheduled every ${intervalHours} hours`);
}

// Función para limpiar backups antiguos
async function cleanupOldBackups(keepCount: number): Promise<void> {
  try {
    const backups = await listBackups();
    
    // Ordenar por fecha de creación (más reciente primero)
    backups.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    // Eliminar los backups más antiguos que exceden el número a mantener
    if (backups.length > keepCount) {
      const backupsToDelete = backups.slice(keepCount);
      
      for (const backup of backupsToDelete) {
        await deleteBackup(backup.id);
        console.log(`Old backup ${backup.id} deleted`);
      }
    }
  } catch (error) {
    console.error('Error cleaning up old backups:', error);
  }
}

// Función para exportar un backup como archivo
export async function exportBackupAsFile(backupId: string): Promise<Blob> {
  try {
    const db = await getDB();
    const backup = await db.get('backups', backupId);
    
    if (!backup) {
      throw new Error(`Backup with ID ${backupId} not found`);
    }
    
    return backup.data;
  } catch (error) {
    console.error('Error exporting backup as file:', error);
    throw error;
  }
}

// Función para importar un backup desde un archivo
export async function importBackupFromFile(file: File): Promise<string> {
  try {
    const jsonData = await file.text();
    
    // Verificar que el archivo contiene datos válidos
    try {
      JSON.parse(jsonData);
    } catch (e) {
      throw new Error('Invalid backup file format');
    }
    
    const backupId = generateUniqueId();
    const timestamp = new Date().toISOString();
    
    // Guardar el backup en la base de datos
    const db = await getDB();
    await db.add('backups', {
      id: backupId,
      data: file,
      metadata: {
        timestamp,
        size: file.size,
        version: '1.0'
      },
      createdAt: timestamp
    });
    
    console.log(`Backup imported with ID: ${backupId}`);
    return backupId;
  } catch (error) {
    console.error('Error importing backup from file:', error);
    throw error;
  }
}

// Función para descargar un backup como archivo
export async function downloadBackup(backupId: string): Promise<void> {
  try {
    const db = await getDB();
    const backup = await db.get('backups', backupId);
    
    if (!backup) {
      throw new Error(`Backup with ID ${backupId} not found`);
    }
    
    // Leer el blob como texto
    const jsonData = await backup.data.text();
    
    // Formatear la fecha para el nombre del archivo
    const date = new Date(backup.metadata.timestamp);
    const formattedDate = date.toISOString().split('T')[0];
    
    // Descargar el archivo
    downloadFile(
      jsonData,
      `backup_${formattedDate}_${backupId.substring(0, 8)}.json`,
      'application/json'
    );
    
    console.log(`Backup ${backupId} downloaded successfully`);
  } catch (error) {
    console.error('Error downloading backup:', error);
    throw error;
  }
}

// Función para restaurar desde un backup (alias para restoreBackup con mejor nombre)
export async function restoreFromBackup(backupId: string): Promise<boolean> {
  return restoreBackup(backupId);
}
