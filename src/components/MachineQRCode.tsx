import { QRCodeSVG } from 'qrcode.react';

interface MachineQRCodeProps {
  machine: {
    id: string;
    serialNumber: string;
    model: string;
    brand: string;
    type: string;
    status: string;
  };
}

export const MachineQRCode = ({ machine }: MachineQRCodeProps) => {
  // Crear un objeto con la información relevante de la máquina
  const machineData = {
    id: machine.id,
    serialNumber: machine.serialNumber,
    model: machine.model,
    brand: machine.brand,
    type: machine.type,
    status: machine.status
  };

  // Convertir a JSON y codificar para el QR
  const qrValue = JSON.stringify(machineData);

  return (
    <QRCodeSVG
      value={qrValue}
      size={250}
      level="H" // Alta corrección de errores
      includeMargin={true}
      bgColor={"#ffffff"}
      fgColor={"#000000"}
    />
  );
};
