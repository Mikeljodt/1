import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { formatDate } from '@/lib/utils';
import { Collection } from '@/store/slices/collectionsSlice';

export const CollectionAuditTrail = () => {
  const { collections } = useSelector((state: RootState) => state.collections);
  const { machines } = useSelector((state: RootState) => state.machines);
  const { clients } = useSelector((state: RootState) => state.clients);
  
  // Sort collections by creation date (newest first)
  const sortedCollections = [...collections].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  
  // Get client name
  const getClientName = (id: number) => {
    const client = clients.find(c => c.id === id);
    return client ? client.name : 'Cliente desconocido';
  };
  
  // Get machine serial
  const getMachineSerial = (id: string) => {
    const machine = machines.find(m => m.id === id);
    return machine ? machine.serialNumber : 'Máquina desconocida';
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted">
            <tr className="border-b">
              <th className="px-4 py-2 text-left text-xs font-medium">Fecha</th>
              <th className="px-4 py-2 text-left text-xs font-medium">Acción</th>
              <th className="px-4 py-2 text-left text-xs font-medium">Detalles</th>
              <th className="px-4 py-2 text-left text-xs font-medium">Usuario</th>
            </tr>
          </thead>
          <tbody>
            {sortedCollections.map(collection => (
              <tr key={collection.id} className="border-b">
                <td className="px-4 py-2 text-sm">{formatDate(collection.createdAt, true)}</td>
                <td className="px-4 py-2 text-sm">Recaudación registrada</td>
                <td className="px-4 py-2 text-sm">
                  <div className="text-sm">
                    <span className="font-medium">{getClientName(collection.clientId)}</span> - 
                    <span className="ml-1">{getMachineSerial(collection.machineId)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Contador: {collection.previousCounter} → {collection.currentCounter} | 
                    Distribución: {collection.distributionPercentage || 50}%
                  </div>
                </td>
                <td className="px-4 py-2 text-sm">{collection.staffMember}</td>
              </tr>
            ))}
            {sortedCollections.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  No hay registros de auditoría disponibles.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
