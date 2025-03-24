import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getLatestCounter } from '@/lib/counterSync';

interface CounterSelectorProps {
  machineId: string | null;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  readOnly?: boolean;
  className?: string;
}

export const CounterSelector = ({
  machineId,
  value,
  onChange,
  label = "Contador",
  required = false,
  readOnly = false,
  className = ""
}: CounterSelectorProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [latestCounter, setLatestCounter] = useState<number | null>(null);
  
  // Get the counter from Redux store if available
  const counterState = useSelector((state: RootState) => state.counter);
  
  useEffect(() => {
    const fetchLatestCounter = async () => {
      if (!machineId) return;
      
      setIsLoading(true);
      
      // First check if we have the counter in the Redux store
      if (counterState && counterState.counters) {
        const machineCounters = counterState.counters.filter(c => c.machineId === machineId);
        if (machineCounters.length > 0) {
          // Get the latest counter by date
          const latestCounter = machineCounters.sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          )[0];
          
          setLatestCounter(latestCounter.value);
          setIsLoading(false);
          return;
        }
      }
      
      // Otherwise fetch from the database
      try {
        const counter = await getLatestCounter(machineId);
        setLatestCounter(counter);
      } catch (error) {
        console.error('Error fetching latest counter:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchLatestCounter();
  }, [machineId, counterState]);
  
  // If the value is empty and we have a latest counter, set it as the default
  useEffect(() => {
    if (value === '' && latestCounter !== null && !readOnly) {
      onChange(latestCounter.toString());
    }
  }, [latestCounter, value, onChange, readOnly]);
  
  return (
    <div className={`grid w-full gap-1.5 ${className}`}>
      <Label htmlFor="counter">{label}</Label>
      <div className="relative">
        <Input
          id="counter"
          type="number"
          min="0"
          placeholder={isLoading ? "Cargando..." : "0"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          readOnly={readOnly}
          className={isLoading ? "opacity-70" : ""}
        />
        {latestCounter !== null && !readOnly && (
          <div className="absolute right-0 top-0 h-full flex items-center pr-3">
            <span className="text-xs text-muted-foreground">
              Último: {latestCounter}
            </span>
          </div>
        )}
      </div>
      {latestCounter !== null && value && parseInt(value) < latestCounter && (
        <p className="text-xs text-red-500 mt-1">
          ¡Advertencia! El contador es menor que el último valor registrado ({latestCounter})
        </p>
      )}
    </div>
  );
};
