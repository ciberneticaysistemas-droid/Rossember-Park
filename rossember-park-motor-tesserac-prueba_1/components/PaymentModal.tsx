import React, { useState } from 'react';
import { X, CreditCard, ShieldCheck, Loader2, Smartphone, Building2, Accessibility, MapPin } from 'lucide-react';
import { ParkingLayoutMap } from './ParkingLayoutMap';
import { ParkingRecord, VehicleType } from '../types';


interface PaymentModalProps {
  plate: string;
  vehicleType: VehicleType;
  duration: string;
  cost: number;
  originalCost?: number;
  isDisabled?: boolean;
  records?: ParkingRecord[];
  onConfirm: (bank: string, email: string) => void;
  onCancel: () => void;
}

const BANKS = [
  "Nequi",
  "Bancolombia",
  "Davivienda",
  "Banco de Bogotá",
  "BBVA Colombia",
  "Daviplata",
  "Scotiabank Colpatria"
];

export const PaymentModal: React.FC<PaymentModalProps> = ({
  plate,
  vehicleType,
  duration,
  cost,
  originalCost,
  isDisabled,
  records,
  onConfirm,
  onCancel
}) => {
  const [step, setStep] = useState<'FORM' | 'PROCESSING' | 'SUCCESS'>('FORM');
  const [selectedBank, setSelectedBank] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  // Keyboard State


  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBank || !email) {
      setError('Por favor completa todos los campos');
      return;
    }

    setStep('PROCESSING');

    // Simulate API delay
    setTimeout(() => {
      setStep('SUCCESS');
      setTimeout(() => {
        onConfirm(selectedBank, email);
      }, 1500);
    }, 2000);
  };



  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden transform transition-all">

        {/* Header with PSE Style */}
        <div className="bg-[#0033A0] p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <ShieldCheck size={100} />
          </div>
          <button onClick={onCancel} className="absolute top-4 right-4 hover:bg-white/20 p-1 rounded-full transition-colors">
            <X size={20} />
          </button>

          <div className="flex items-center gap-2 mb-1">
            <div className="bg-white text-[#0033A0] font-bold px-2 py-0.5 rounded-sm text-xs tracking-widest border-2 border-white">PSE</div>
            <span className="text-xs font-light opacity-80">Pagos Seguros en Línea</span>
          </div>
          <h2 className="text-2xl font-bold">Pasarela de Pagos</h2>
          <div className="flex items-center gap-2 mt-1 text-blue-200 text-sm">
            <span>Ref: {plate} - {vehicleType}</span>
            {isDisabled && (
              <span className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full text-xs text-white">
                <Accessibility size={10} /> Prioridad
              </span>
            )}
          </div>
        </div>

        {step === 'FORM' && (
          <form onSubmit={handlePay} className="p-6 space-y-5">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex justify-between items-center relative overflow-hidden">
              {isDisabled && (
                <div className="absolute top-2 right-2 text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">
                  50% DCTO
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold">Total a Pagar</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-gray-900">${cost.toLocaleString()}</p>
                  {originalCost && originalCost > cost && (
                    <p className="text-sm text-gray-400 line-through">${originalCost.toLocaleString()}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Tiempo</p>
                <p className="font-medium text-gray-700">{duration}</p>
              </div>
            </div>

            {/* Map Visualization */}
            <div className="space-y-3 p-4 bg-slate-950 rounded-2xl border border-slate-800 shadow-xl overflow-hidden relative">
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                  <MapPin size={12} /> Ubicación Exacta
                </label>
                <div className="text-[8px] text-slate-500 font-mono">MAP_REF: {plate}</div>
              </div>
              <ParkingLayoutMap highlightedSpot={plate} records={records} showOnlyHighlighted={true} />
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-900 placeholder-gray-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Banco / Billetera</label>
                <div className="relative">
                  <select
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none bg-white transition-all text-gray-900"
                  >
                    <option value="">Selecciona tu banco...</option>
                    {BANKS.map(bank => (
                      <option key={bank} value={bank}>{bank}</option>
                    ))}
                  </select>
                  <Building2 className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" size={18} />
                </div>
              </div>

              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full bg-[#FF004E] hover:bg-[#D90042] text-white font-bold py-3 rounded-xl shadow-lg shadow-pink-500/30 transition-all transform active:scale-95 flex items-center justify-center gap-2"
              >
                <CreditCard size={20} />
                Pagar Ahora
              </button>
              <div className="text-center mt-4">
                <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
                  <ShieldCheck size={12} /> Pagos procesados de forma segura
                </p>
              </div>
            </div>
          </form>
        )}

        {step === 'PROCESSING' && (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-20"></div>
              <div className="bg-blue-50 p-4 rounded-full relative z-10">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Contactando al Banco</h3>
            <p className="text-gray-500 text-sm">Validando credenciales y saldo disponible...</p>
          </div>
        )}

        {step === 'SUCCESS' && (
          <div className="p-12 flex flex-col items-center justify-center text-center bg-emerald-50 h-full">
            <div className="bg-white p-4 rounded-full shadow-lg mb-6 animate-bounce">
              <ShieldCheck className="w-12 h-12 text-emerald-500" />
            </div>
            <h3 className="text-2xl font-bold text-emerald-800 mb-2">¡Pago Exitoso!</h3>
            <p className="text-emerald-600 text-sm">La transacción ha sido aprobada.</p>
            <p className="text-xs text-gray-400 mt-4">Redirigiendo...</p>
          </div>
        )}
      </div>

      {/* Keyboard for Modal */}

    </div>
  );
};