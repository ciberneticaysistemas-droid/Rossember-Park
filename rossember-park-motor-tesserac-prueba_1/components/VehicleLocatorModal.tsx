import React, { useState } from 'react';
import { X, Search, MapPin, User, Car, AlertCircle } from 'lucide-react';
import { ParkingRecord } from '../types';
import { VirtualKeyboard } from './VirtualKeyboard';

interface VehicleLocatorModalProps {
  records: ParkingRecord[];
  onClose: () => void;
}

export const VehicleLocatorModal: React.FC<VehicleLocatorModalProps> = ({ records, onClose }) => {
  const [searchId, setSearchId] = useState('');
  const [result, setResult] = useState<ParkingRecord | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchId.trim()) return;

    // Search for ACTIVE vehicles with matching Owner ID
    const found = records.find(
      r => r.status === 'ACTIVE' && r.ownerId === searchId.trim()
    );

    setResult(found || null);
    setHasSearched(true);
    setShowKeyboard(false); // Hide keyboard on search
  };

  const handleVirtualKeyPress = (key: string) => {
    setSearchId(prev => prev + key);
    setHasSearched(false);
  };

  const handleVirtualBackspace = () => {
    setSearchId(prev => prev.slice(0, -1));
    setHasSearched(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
        
        {/* Header */}
        <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold">Localizar Vehículo</h3>
          </div>
          <button onClick={onClose} className="hover:bg-slate-700 p-1 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <p className="text-gray-500 text-sm mb-4">
            Ingresa tu número de documento (C.C.) para encontrar tu puesto de estacionamiento.
          </p>

          <form onSubmit={handleSearch} className="flex gap-2 mb-6">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User size={18} className="text-gray-400" />
              </div>
              <input
                type="text"
                value={searchId}
                onChange={(e) => {
                  setSearchId(e.target.value);
                  setHasSearched(false);
                }}
                onFocus={() => setShowKeyboard(true)}
                placeholder="Número de Cédula"
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 font-bold"
                autoFocus
              />
            </div>
            <button 
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl transition-colors shadow-lg shadow-blue-200"
            >
              <Search size={20} />
            </button>
          </form>

          {hasSearched && (
            <div className="animate-fade-in">
              {result ? (
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-center shadow-sm">
                  <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-emerald-600">
                    <Car size={32} />
                  </div>
                  <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Tu vehículo está en</h4>
                  
                  <div className="text-4xl font-black text-gray-900 mb-2">
                    {result.spotNumber || "Sin Asignar"}
                  </div>
                  
                  <div className="inline-block bg-white px-3 py-1 rounded-full text-xs font-bold text-emerald-700 border border-emerald-200">
                    Placa: {result.plate}
                  </div>
                  
                  <p className="text-xs text-gray-400 mt-4">
                    Ingresó: {new Date(result.entryTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center">
                  <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
                  <p className="text-red-800 font-bold">No encontrado</p>
                  <p className="text-red-600 text-sm mt-1">
                    No hay vehículos activos asociados a la cédula <span className="font-mono font-bold">{searchId}</span>.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Keyboard for Modal */}
      <VirtualKeyboard 
        isVisible={showKeyboard}
        onKeyPress={handleVirtualKeyPress}
        onBackspace={handleVirtualBackspace}
        onClose={() => setShowKeyboard(false)}
        zIndex="z-[80]" // Higher than modal z-[70]
      />
    </div>
  );
};