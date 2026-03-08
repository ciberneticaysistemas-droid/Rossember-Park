export enum VehicleType {
  CAR = 'Carro',
  MOTORCYCLE = 'Moto',
  UNKNOWN = 'Desconocido'
}

export interface VehicleDetails {
  make?: string;
  color?: string;
  notes?: string;
}

export interface ParkingRecord {
  id: string;
  plate: string;
  ownerId?: string; // Document ID (C.C.)
  vehicleType: VehicleType;
  entryTime: number; // Timestamp
  exitTime?: number; // Timestamp
  imageUrl?: string;
  status: 'ACTIVE' | 'COMPLETED';
  cost?: number;
  paymentStatus?: 'PENDING' | 'PAID';
  paymentMethod?: string; // e.g., 'PSE - Bancolombia'
  isDisabled?: boolean; // Flag for disability/priority parking
  spotNumber?: string; // e.g., 'C-001', 'P-001', 'M-001'
  details?: VehicleDetails; // AI Audit details
}

export interface RecognitionResult {
  detected: boolean;
  vehicleType: VehicleType;
  plate: string;
  confidence: number;
}