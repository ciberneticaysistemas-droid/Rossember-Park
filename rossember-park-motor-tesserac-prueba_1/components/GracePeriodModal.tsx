    import React, { useState } from 'react';
import { X, Clock, Save } from 'lucide-react';

interface GracePeriodModalProps {
    currentGracePeriod: number; // in minutes
    onSave: (minutes: number) => void;
    onClose: () => void;
}

export const GracePeriodModal: React.FC<GracePeriodModalProps> = ({ currentGracePeriod, onSave, onClose }) => {
    const [minutes, setMinutes] = useState(currentGracePeriod);

    const handleSave = () => {
        onSave(Math.max(0, minutes));
        onClose();
    };

    const presetOptions = [5, 10, 15, 20, 30, 60];

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 p-6 text-white flex items-center justify-between rounded-t-3xl">
                    <div>
                        <h2 className="text-2xl font-bold">Tiempo de Gracia</h2>
                        <p className="text-indigo-100 text-sm mt-1">Tiempo permitido para salir tras el pago</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Info */}
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4">
                        <div className="flex items-start gap-3">
                            <Clock size={20} className="text-blue-600 mt-0.5" />
                            <div className="text-sm text-blue-900">
                                <p className="font-bold mb-1">¿Qué es el tiempo de gracia?</p>
                                <p>Es el tiempo que tiene un vehículo para salir del parqueadero después de realizar el pago. Si excede este tiempo, deberá pagar nuevamente.</p>
                            </div>
                        </div>
                    </div>

                    {/* Manual Input */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-3">
                            Tiempo en minutos
                        </label>
                        <input
                            type="number"
                            min="0"
                            max="120"
                            value={minutes}
                            onChange={(e) => setMinutes(parseInt(e.target.value) || 0)}
                            className="w-full text-4xl font-bold text-center py-6 px-6 bg-indigo-50 border-2 border-indigo-300 rounded-2xl focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 outline-none transition-all text-indigo-900"
                        />
                        <p className="text-center text-sm text-gray-500 mt-2">
                            {minutes === 0 ? 'Sin tiempo de gracia' : `${minutes} minuto${minutes !== 1 ? 's' : ''}`}
                        </p>
                    </div>

                    {/* Preset Buttons */}
                    <div>
                        <p className="text-sm font-bold text-gray-700 mb-3">Opciones rápidas</p>
                        <div className="grid grid-cols-3 gap-3">
                            {presetOptions.map((preset) => (
                                <button
                                    key={preset}
                                    onClick={() => setMinutes(preset)}
                                    className={`py-3 px-4 rounded-xl font-bold transition-all ${minutes === preset
                                        ? 'bg-indigo-600 text-white shadow-lg'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    {preset} min
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Warning */}
                    {minutes > 30 && (
                        <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-4">
                            <p className="text-sm text-orange-900">
                                ⚠️ <strong>Advertencia:</strong> Un tiempo de gracia muy largo puede afectar la rotación de vehículos.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 bg-gray-50 rounded-b-3xl flex gap-4">
                    <button
                        onClick={onClose}
                        className="flex-1 px-6 py-4 bg-white border-2 border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-1 px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg"
                    >
                        <Save size={20} />
                        Guardar
                    </button>
                </div>
            </div>
        </div>
    );
};
