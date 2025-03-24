import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { formatDate, formatCurrency, groupByPeriod, calculateTotal } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collection } from '@/store/slices/collectionsSlice';

interface CollectionReportProps {
  startDate?: string;
  endDate?: string;
  clientId?: number;
  machineId?: string;
  period?: 'day' | 'week' | 'month' | 'year';
  type?: 'client' | 'machine' | 'period' | 'comparative';
}

export const CollectionReport = ({
  startDate,
  endDate,
  clientId,
  machineId,
  period = 'month',
  type = 'period'
}: CollectionReportProps) => {
  const { collections } = useSelector((state: RootState) => state.collections);
  const { machines } = useSelector((state: RootState) => state.machines);
  const { clients } = useSelector((state: RootState) => state.clients);
  
  const [filteredCollections, setFilteredCollections] = useState<Collection[]>([]);
  const [reportData, setReportData] = useState<any>({});
  const [totalAmount, setTotalAmount] = useState(0);
  
  // Filter and process collections
  useEffect(() => {
    let filtered = [...collections];
    
    // Apply date filters
    if (startDate) {
      filtered = filtered.filter(c => new Date(c.date) >= new Date(startDate));
    }
    
    if (endDate) {
      filtered = filtered.filter(c => new Date(c.date) <= new Date(endDate));
    }
    
    // Apply client filter
    if (clientId) {
      filtered = filtered.filter(c => c.clientId === clientId);
    }
    
    // Apply machine filter
    if (machineId) {
      filtered = filtered.filter(c => c.machineId === machineId);
    }
    
    setFilteredCollections(filtered);
    setTotalAmount(calculateTotal(filtered));
    
    // Process data based on report type
    if (type === 'period') {
      setReportData(groupByPeriod(filtered, period));
    } else if (type === 'client') {
      // Group by client
      const byClient: Record<string, Collection[]> = {};
      filtered.forEach(collection => {
        const clientKey = collection.clientId.toString();
        if (!byClient[clientKey]) {
          byClient[clientKey] = [];
        }
        byClient[clientKey].push(collection);
      });
      setReportData(byClient);
    } else if (type === 'machine') {
      // Group by machine
      const byMachine: Record<string, Collection[]> = {};
      filtered.forEach(collection => {
        const machineKey = collection.machineId;
        if (!byMachine[machineKey]) {
          byMachine[machineKey] = [];
        }
        byMachine[machineKey].push(collection);
      });
      setReportData(byMachine);
    }
  }, [collections, startDate, endDate, clientId, machineId, period, type]);
  
  // Format period label
  const formatPeriodLabel = (periodKey: string) => {
    if (period === 'day') {
      return formatDate(periodKey);
    } else if (period === 'week') {
      const [year, week] = periodKey.split('-W');
      return `Semana ${week}, ${year}`;
    } else if (period === 'month') {
      const [year, month] = periodKey.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    } else if (period === 'year') {
      return `Año ${periodKey}`;
    }
    return periodKey;
  };
  
  // Get client name
  const getClientName = (id: number) => {
    const client = clients.find(c => c.id === id);
    return client ? client.name : 'Cliente desconocido';
  };
  
  // Get machine info
  const getMachineInfo = (id: string) => {
    const machine = machines.find(m => m.id === id);
    return machine ? `${machine.serialNumber} (${machine.brand} ${machine.model})` : 'Máquina desconocida';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">
          {type === 'period' && 'Informe por Período'}
          {type === 'client' && 'Informe por Cliente'}
          {type === 'machine' && 'Informe por Máquina'}
          {type === 'comparative' && 'Informe Comparativo'}
        </h2>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">
            {startDate && endDate ? (
              `Del ${formatDate(startDate)} al ${formatDate(endDate)}`
            ) : startDate ? (
              `Desde ${formatDate(startDate)}`
            ) : endDate ? (
              `Hasta ${formatDate(endDate)}`
            ) : (
              'Todos los períodos'
            )}
          </div>
          <div className="text-lg font-bold">{formatCurrency(totalAmount)}</div>
        </div>
      </div>
      
      {Object.keys(reportData).length > 0 ? (
        <div className="space-y-4">
          {type === 'period' && (
            Object.entries(reportData).map(([periodKey, periodCollections]: [string, Collection[]]) => (
              <Card key={periodKey}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base">{formatPeriodLabel(periodKey)}</CardTitle>
                    <span className="font-bold">{formatCurrency(calculateTotal(periodCollections as Collection[]))}</span>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr className="border-b">
                        <th className="px-4 py-2 text-left text-xs font-medium">Fecha</th>
                        <th className="px-4 py-2 text-left text-xs font-medium">Cliente</th>
                        <th className="px-4 py-2 text-left text-xs font-medium">Máquina</th>
                        <th className="px-4 py-2 text-right text-xs font-medium">Importe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(periodCollections as Collection[]).map(collection => (
                        <tr key={collection.id} className="border-b">
                          <td className="px-4 py-2 text-sm">{formatDate(collection.date)}</td>
                          <td className="px-4 py-2 text-sm">{getClientName(collection.clientId)}</td>
                          <td className="px-4 py-2 text-sm">{getMachineInfo(collection.machineId)}</td>
                          <td className="px-4 py-2 text-sm text-right font-medium">{formatCurrency(collection.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            ))
          )}
          
          {type === 'client' && (
            Object.entries(reportData).map(([clientKey, clientCollections]: [string, Collection[]]) => (
              <Card key={clientKey}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base">{getClientName(parseInt(clientKey))}</CardTitle>
                    <span className="font-bold">{formatCurrency(calculateTotal(clientCollections as Collection[]))}</span>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr className="border-b">
                        <th className="px-4 py-2 text-left text-xs font-medium">Fecha</th>
                        <th className="px-4 py-2 text-left text-xs font-medium">Máquina</th>
                        <th className="px-4 py-2 text-right text-xs font-medium">Importe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(clientCollections as Collection[]).map(collection => (
                        <tr key={collection.id} className="border-b">
                          <td className="px-4 py-2 text-sm">{formatDate(collection.date)}</td>
                          <td className="px-4 py-2 text-sm">{getMachineInfo(collection.machineId)}</td>
                          <td className="px-4 py-2 text-sm text-right font-medium">{formatCurrency(collection.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card><boltAction type="file" filePath="src/components/CollectionReport.tsx">            ))
          )}
          
          {type === 'machine' && (
            Object.entries(reportData).map(([machineKey, machineCollections]: [string, Collection[]]) => (
              <Card key={machineKey}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base">{getMachineInfo(machineKey)}</CardTitle>
                    <span className="font-bold">{formatCurrency(calculateTotal(machineCollections as Collection[]))}</span>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr className="border-b">
                        <th className="px-4 py-2 text-left text-xs font-medium">Fecha</th>
                        <th className="px-4 py-2 text-left text-xs font-medium">Cliente</th>
                        <th className="px-4 py-2 text-right text-xs font-medium">Importe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(machineCollections as Collection[]).map(collection => (
                        <tr key={collection.id} className="border-b">
                          <td className="px-4 py-2 text-sm">{formatDate(collection.date)}</td>
                          <td className="px-4 py-2 text-sm">{getClientName(collection.clientId)}</td>
                          <td className="px-4 py-2 text-sm text-right font-medium">{formatCurrency(collection.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        <div className="py-8 text-center text-muted-foreground">
          No hay datos disponibles para el informe con los filtros seleccionados.
        </div>
      )}
    </div>
  );
};
