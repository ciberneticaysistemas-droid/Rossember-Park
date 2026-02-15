export enum VehicleType {
  CAR = 'Carro',
  MOTORCYCLE = 'Moto',
  ELECTRIC = 'Eléctrico',
  UNKNOWN = 'Desconocido'
}

export interface VehicleDetails {
  make?: string;
  color?: string;
  notes?: string;
}

export interface Floor {
  id: string;
  name: string;
  capacities: {
    REGULAR_CAR: number;
    PRIORITY_CAR: number;
    MOTO: number;
    EV_CHARGING: number;
  };
  prefixes: {
    REGULAR_CAR: string;
    PRIORITY_CAR: string;
    MOTO: string;
    EV_CHARGING: string;
  };
}

export interface ParkingRecord {
  id: string;
  plate: string;
  ownerId?: string; // Document ID (C.C.)
  vehicleType: VehicleType;
  floorId?: string; // Optional for backward compatibility, required for new records
  entryTime: number; // Timestamp
  exitTime?: number; // Timestamp
  imageUrl?: string;
  status: 'ACTIVE' | 'COMPLETED';
  cost?: number;
  paymentStatus?: 'PENDING' | 'PAID' | 'MANUAL_OVERRIDE';
  paymentMethod?: string; // e.g., 'PSE - Bancolombia'
  isDisabled?: boolean; // Flag for disability/priority parking
  spotNumber?: string; // e.g., 'C-001', 'P-001', 'M-001', 'E-001'
  details?: VehicleDetails; // AI Audit details
  requiresCharging?: boolean; // Flag for EV charging station requirement
}

export interface RecognitionResult {
  detected: boolean;
  vehicleType: VehicleType;
  plate: string;
  confidence: number;
}