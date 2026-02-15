import React from 'react';
import { ParkingRecord, VehicleType } from '../types';
import { Car, Bike, LogOut, Clock, Accessibility, MapPin } from 'lucide-react';

interface VehicleCardProps {
  record: ParkingRecord;
  onExit: (id: string) => void;
}

export const VehicleCard: React.FC<VehicleCardProps> = ({ record, onExit }) => {
  const isCar = record.vehicleType === VehicleType.CAR;
  
  const calculateDuration = () => {
    const now = new Date().getTime();
    const diff = now - record.entryTime;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) return `${hours}h ${remainingMinutes}m`;
    return `${minutes} min`;
  };

  const startTime = new Date(record.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg relative ${isCar ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
          {isCar ? <Car size={24} /> : <Bike size={24} />}
          {record.isDisabled && (
             <div className="absolute -top-1 -right-1 bg-blue-600 text-white rounded-full p-0.5 border-2 border-white shadow-sm" title="Accesibilidad / Prioridad">
               <Accessibility size={12} />
             </div>
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
             <h3 className="text-lg font-bold text-gray-800 tracking-wide">{record.plate}</h3>
             {record.isDisabled && (
                <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                   <Accessibility size={8} /> PRI
                </span>
             )}
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center text-xs text-gray-500 gap-1 sm:gap-2 mt-1">
            <span className="flex items-center gap-1">
              <Clock size={12} /> {startTime}
            </span>
            <span className="hidden sm:inline text-gray-300">|</span>
            <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-medium">
              {calculateDuration()}
            </span>
            {record.spotNumber && (
              <>
                <span className="hidden sm:inline text-gray-300">|</span>
                <span className={`px-1.5 py-0.5 rounded font-bold border flex items-center gap-1 ${
                  record.spotNumber.startsWith('P') ? 'bg-blue-50 text-blue-700 border-blue-200' :
                  record.spotNumber.startsWith('M') ? 'bg-orange-50 text-orange-700 border-orange-200' :
                  'bg-gray-50 text-gray-700 border-gray-200'
                }`}>
                  <MapPin size={10} /> {record.spotNumber}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
      
      <button
        onClick={() => onExit(record.id)}
        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
        title="Registrar Salida"
      >
        <LogOut size={20} />
      </button>
    </div>
  );
};