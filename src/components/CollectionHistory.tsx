import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { formatDate, formatCurrency } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Collection } from '@/store/slices/collectionsSlice';

interface CollectionHistoryProps {
  clientId: number | null;
  machineId: string | null;
}

export const CollectionHistory = ({ clientId, machineId }: CollectionHistoryProps) => {
  const { collections } = useSelector((state: RootState) => state.collections);
  const { machines } = useSelector((state: RootState) => state.machines);
  const { clients } = useSelector((state: RootState) => state.clients);
  
  const [filteredCollections, setFilteredCollections] = useState<Collection[]>([]);
  const [groupedByMonth, setGroupedByMonth] = useState<Record<string, Collection[]>>({});
  
  // Filter collections based on client and machine
  useEffect(() => {
    let filtered = [...collections];
    
    if (clientId) {
      filtered = filtered.filter(c => c.clientId === clientId);
    }
    
    if (machineId) {
      filtered = filtered.filter(c => c.machineId === machineId);
    }
    
    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    setFilteredCollections(filtered);
    
    // Group by month
    const grouped: Record<string, Collection[]> = {};
    filtered.forEach(collection => {
      const date = new Date(collection.date);
      const monthYear = `${date.getFullYear()}-${date.getMonth() + 1}`;
      
      if (!grouped[monthYear]) {
        grouped[monthYear] = [];
      }
      
      grouped[monthYear].push(collection);
    });
    
    setGroupedByMonth(grouped);
  }, [collections, clientId, machineId]);
  
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
  
  // Format month name
  const formatMonthYear = (monthYear: string) => {
    const [year, month] = monthYear.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  };
  
  // Calculate monthly totals
  const calculateMonthlyTotal = (collections: Collection[]) => {
    return collections.reduce((sum, c) => sum + c.amount, 0);
  };

  return (
    <div className="space-y-6">
      {Object.keys(groupedByMonth).length > 0 ? (
        Object.entries(groupedByMonth).map(([monthYear, monthCollections]) => (
          <div key={monthYear} className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">{formatMonthYear(monthYear)}</h3>
              <span className="font-bold">{formatCurrency(calculateMonthlyTotal(monthCollections))}</span>
            </div>
            
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr className="border-b">
                        <th className="px-4 py-2 text-left text-xs font-medium">Fecha</th>
                        {!clientId && <th className="px-4 py-2 text-left text-xs font-medium">Cliente</th>}
                        {!machineId && <th className="px-4 py-2 text-left text-xs font-medium">Máquina</th>}
                        <th className="px-4 py-2 text-left text-xs font-medium">Contador</th>
                        <th className="px-4 py-2 text-right text-xs font-medium">Importe</th>
                        <th className="px-4 py-2 text-left text-xs font-medium">Técnico</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthCollections.map(collection => (
                        <tr key={collection.id} className="border-b">
                          <td className="px-4 py-2 text-sm">{formatDate(collection.date)}</td>
                          {!clientId && (
                            <td className="px-4 py-2 text-sm">{getClientName(collection.clientId)}</td>
                          )}
                          {!machineId && (
                            <td className="px-4 py-2 text-sm">{getMachineSerial(collection.machineId)}</td>
                          )}
                          <td className="px-4 py-2 text-sm">
                            {collection.previousCounter} → {collection.currentCounter}
                            <span className="text-xs text-muted-foreground ml-2">
                              (+{collection.currentCounter - collection.previousCounter})
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm text-right font-medium">
                            {formatCurrency(collection.amount)}
                            {collection.distributionPercentage && (
                              <span className="text-xs text-muted-foreground ml-1">
                                ({collection.distributionPercentage}%)
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-sm">{collection.staffMember}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        ))
      ) : (
        <div className="py-8 text-center text-muted-foreground">
          No hay recaudaciones para mostrar con los filtros seleccionados.
        </div>
      )}
    </div>
  );
};
