import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getDB } from '@/lib/db';
import { downloadBackup, restoreFromBackup } from '@/lib/backup';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Download, RotateCcw, AlertCircle } from 'lucide-react';

interface Backup {
  id: string;
  metadata: {
    timestamp: string;
    size: number;
    version: string;
  };
  createdAt: string;
}

export const BackupManager = () => {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    try {
      const db = await getDB();
      const allBackups = await db.getAll('backups');
      setBackups(allBackups);
    } catch (err) {
      setError('Error al cargar los backups');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (backupId: string) => {
    try {
      await downloadBackup(backupId);
    } catch (err) {
      setError('Error al descargar el backup');
      console.error(err);
    }
  };

  const handleRestore = async (backupId: string) => {
    if (!window.confirm('¿Estás seguro de que deseas restaurar este backup? Se sobrescribirán todos los datos actuales.')) {
      return;
    }

    try {
      await restoreFromBackup(backupId);
      window.location.reload(); // Recargar la página para reflejar los cambios
    } catch (err) {
      setError('Error al restaurar el backup');
      console.error(err);
    }
  };

  if (loading) {
    return <div>Cargando backups...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestión de Backups</CardTitle>
        <CardDescription>
          Realiza copias de seguridad y restaura datos de backups anteriores
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-500 rounded-md flex items-center">
            <AlertCircle className="mr-2 h-4 w-4" />
            {error}
          </div>
        )}

        <div className="space-y-4">
          {backups.length === 0 ? (
            <p className="text-muted-foreground">No hay backups disponibles</p>
          ) : (
            backups.map((backup) => (
              <div
                key={backup.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div>
                  <p className="font-medium">
                    Backup del {format(new Date(backup.metadata.timestamp), 'PPpp', { locale: es })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Tamaño: {(backup.metadata.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <div className="space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(backup.id)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Descargar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRestore(backup.id)}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Restaurar
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
