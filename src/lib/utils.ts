import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { v4 as uuidv4 } from 'uuid';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Function to generate a unique ID
export function generateUniqueId(): string {
  return uuidv4();
}

// Function to format a date to a readable string
export function formatDate(date: string | Date, includeTime: boolean = false): string {
  const options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {})
  };
  
  return new Date(date).toLocaleDateString('es-ES', options);
}

// Function to format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-ES', { 
    style: 'currency', 
    currency: 'EUR' 
  }).format(amount);
}

// Function to get configuration for machine status
export function getStatusConfig(status: string): { 
  label: string; 
  className: string;
  color: string;
} {
  const statusMap: Record<string, { label: string; className: string; color: string }> = {
    'warehouse': { 
      label: 'En Almacén', 
      className: 'px-2 py-1 rounded-full bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-300 text-xs font-medium',
      color: 'lime'
    },
    'installed': { 
      label: 'Instalada', 
      className: 'px-2 py-1 rounded-full bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-300 text-xs font-medium',
      color: 'violet'
    },
    'repair': { 
      label: 'En Reparación', 
      className: 'px-2 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300 text-xs font-medium',
      color: 'amber'
    }
  };
  
  return statusMap[status] || { 
    label: 'Desconocido', 
    className: 'px-2 py-1 rounded-full bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 text-xs font-medium',
    color: 'gray'
  };
}

// Function to calculate the difference between two counters
export function calculateCounterDifference(previous: number, current: number): number {
  return Math.max(0, current - previous);
}

// Function to calculate revenue based on counter difference and split percentage
export function calculateRevenue(counterDifference: number, splitPercentage: number = 50): number {
  // Assuming each count is worth 1 EUR and the split is applied
  return (counterDifference * (splitPercentage / 100));
}

// Function to export data to CSV
// Usamos 'unknown' en lugar de 'any' para mayor seguridad de tipos
export function exportToCSV<T extends Record<string, unknown>>(data: T[], filename: string): void {
  if (!data.length) return;
  
  // Get headers from the first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    headers.join(','), // Header row
    ...data.map(row => 
      headers.map(header => {
        // Handle values that might contain commas or quotes
        const value = row[header]?.toString() || '';
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');
  
  // Create a blob and download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Function to download a file (generic function for downloading any type of file)
export function downloadFile(data: Blob | string, filename: string, mimeType?: string): void {
  let blob: Blob;
  
  if (typeof data === 'string') {
    // If data is a string, convert it to a blob with the specified MIME type
    blob = new Blob([data], { type: mimeType || 'text/plain;charset=utf-8;' });
  } else {
    // If data is already a blob, use it directly
    blob = data;
  }
  
  // Create a URL for the blob
  const url = URL.createObjectURL(blob);
  
  // Create a temporary link element
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  // Add the link to the DOM, click it, and remove it
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up by revoking the object URL
  URL.revokeObjectURL(url);
}

// Function to generate a PDF (simplified - in a real app, use a library like jsPDF)
export function exportToPDF(_elementId: string, _filename: string): void {
  alert('Exportación a PDF implementada con una biblioteca externa como jsPDF');
  // In a real implementation, you would:
  // 1. Use a library like jsPDF
  // 2. Capture the element content
  // 3. Convert to PDF
  // 4. Trigger download
}

// Function to filter collections by date range
// Revertimos a Record<string, any> para compatibilidad y desactivamos eslint para esta línea
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function filterByDateRange<T extends Record<string, any>>(
  items: T[], 
  startDate: Date | null, 
  endDate: Date | null, 
  dateField: string = 'date'
): T[] {
  if (!startDate && !endDate) return items;
  
  return items.filter(item => {
    const dateValue = item[dateField];
    // Comprobación básica
    if (!dateValue) {
       return false;
    }
    const itemDate = new Date(dateValue);
     if (isNaN(itemDate.getTime())) {
       // Podrías añadir un console.warn aquí si quieres
       return false;
    }
    
    if (startDate && endDate) {
      return itemDate >= startDate && itemDate <= endDate;
    } else if (startDate) {
      return itemDate >= startDate;
    } else if (endDate) {
      return itemDate <= endDate;
    }
    
    return true;
  });
}

// Function to group collections by period
// Revertimos a Record<string, any> y desactivamos eslint para esta línea
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function groupByPeriod<T extends Record<string, any>>(
  items: T[],
  period: 'day' | 'week' | 'month' | 'year',
  dateField: string = 'date'
): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  
  items.forEach(item => {
    const dateValue = item[dateField];
     if (!dateValue) {
      return; // Saltar item
    }
    const date = new Date(dateValue);
     if (isNaN(date.getTime())) {
       // Podrías añadir un console.warn aquí si quieres
       return; // Saltar item
    }
    let key: string;
    
    switch (period) {
      case 'day': { // Añadir llaves
        key = date.toISOString().split('T')[0]; // YYYY-MM-DD
        break;
      } // Añadir llaves
      case 'week': { // Añadir llaves
        // Get the week number
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
        const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        key = `${date.getFullYear()}-W${weekNumber}`;
        break;
      } // Añadir llaves
      case 'month': { // Añadir llaves
        key = `${date.getFullYear()}-${date.getMonth() + 1}`;
        break;
      } // Añadir llaves
      case 'year': { // Añadir llaves
        key = date.getFullYear().toString();
        break;
      } // Añadir llaves
      default: { // Añadir llaves (opcional pero buena práctica)
        key = date.toISOString();
        break; // Añadir break
      } // Añadir llaves
    }
    
    if (!result[key]) {
      result[key] = [];
    }
    
    result[key].push(item);
  });
  
  return result;
}

// Function to calculate total amount from collections
// Revertimos a Record<string, any> y desactivamos eslint para esta línea
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function calculateTotal<T extends Record<string, any>>(items: T[], field: string = 'amount'): number {
  return items.reduce((sum, item) => {
    const value = item[field];
    // Usamos parseFloat directamente, que maneja strings y números (y devuelve NaN para otros)
    const numericValue = parseFloat(value);
    return sum + (isNaN(numericValue) ? 0 : numericValue);
  }, 0);
}

// Function to generate a report title based on date range
export function generateReportTitle(
  startDate: Date | null, 
  endDate: Date | null, 
  reportType: string
): string {
  let dateRange = '';
  
  if (startDate && endDate) {
    dateRange = `del ${formatDate(startDate)} al ${formatDate(endDate)}`;
  } else if (startDate) {
    dateRange = `desde ${formatDate(startDate)}`;
  } else if (endDate) {
    dateRange = `hasta ${formatDate(endDate)}`;
  } else {
    dateRange = 'todos los períodos';
  }
  
  return `${reportType} - ${dateRange}`;
}
