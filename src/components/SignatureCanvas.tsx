import { useRef, useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Trash2, Check } from 'lucide-react';

interface SignaturePadProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  height?: number;
  width?: number;
  className?: string;
}

export const SignaturePad = ({
  value,
  onChange,
  label = "Firma Digital",
  height = 200,
  width = 500,
  className = ""
}: SignaturePadProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Initialize canvas when component mounts
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    // Set canvas dimensions
    canvas.width = width;
    canvas.height = height;

    // Set canvas styles
    context.lineWidth = 2;
    context.lineCap = 'round';
    context.strokeStyle = '#000';

    // If we have a value, draw it
    if (value) {
      const img = new Image();
      img.onload = () => {
        context.drawImage(img, 0, 0);
        setHasSignature(true);
      };
      img.src = value;
    }
  }, [height, width]);

  // Handle mouse/touch events
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    setIsDrawing(true);
    setHasSignature(true);

    // Get coordinates
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    context.beginPath();
    context.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    // Get coordinates
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
      e.preventDefault(); // Prevent scrolling on touch devices
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    context.lineTo(clientX - rect.left, clientY - rect.top);
    context.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    context.closePath();
    setIsDrawing(false);

    // Save the signature as a data URL
    const dataUrl = canvas.toDataURL('image/png');
    onChange(dataUrl);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onChange('');
  };

  return (
    <div className={`grid w-full gap-1.5 ${className}`}>
      <div className="flex justify-between items-center">
        <Label>{label}</Label>
        <div className="flex space-x-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearSignature}
            disabled={!hasSignature}
          >
            <Trash2 className="h-4 w-4 mr-1" /> Borrar
          </Button>
        </div>
      </div>
      <div className="border border-input rounded-md p-1 bg-white">
        <canvas
          ref={canvasRef}
          className="w-full touch-none cursor-crosshair"
          style={{ height: `${height}px` }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
      {!hasSignature && (
        <p className="text-xs text-muted-foreground mt-1">
          Dibuja tu firma en el recuadro superior
        </p>
      )}
      {hasSignature && (
        <div className="flex items-center text-xs text-green-600 mt-1">
          <Check className="h-3 w-3 mr-1" /> Firma registrada
        </div>
      )}
    </div>
  );
};
