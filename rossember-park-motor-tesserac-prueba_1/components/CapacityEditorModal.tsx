import React, { useState } from 'react';
import { X, Save } from 'lucide-react';

interface CapacityEditorModalProps {
    capacities: { REGULAR_CAR: number; PRIORITY_CAR: number; MOTO: number; EV_CHARGING: number };
    onSave: (newCapacities: { REGULAR_CAR: number; PRIORITY_CAR: number; MOTO: number; EV_CHARGING: number }) => void;
    onClose: () => void;
}

export const CapacityEditorModal: React.FC<CapacityEditorModalProps> = ({ capacities, onSave, onClose }) => {
    const [values, setValues] = useState(capacities);

    const handleSave = () => {
        onSave(values);
        onClose();
    };

    const handleChange = (key: keyof typeof values, value: string) => {
        const numValue = parseInt(value) || 0;
        setValues(prev => ({ ...prev, [key]: numValue }));
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-purple-500 p-6 text-white flex items-center justify-between rounded-t-3xl">
                    <div>
                        <h2 className="text-2xl font-bold">Editar Capacidades</h2>
                        <p className="text-purple-100 text-sm mt-1">Ajusta la cantidad de espacios disponibles</p>
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
                    {/* Regular Car */}
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
                        <label className="block text-sm font-bold text-blue-900 mb-3">
                            Carros Regulares
                        </label>
                        <input
                            type="number"
                            min="0"
                            value={values.REGULAR_CAR}
                            onChange={(e) => handleChange('REGULAR_CAR', e.target.value)}
                            className="w-full text-3xl font-bold text-center py-4 px-6 bg-white border-2 border-blue-300 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 outline-none transition-all"
                        />
                    </div>

                    {/* Priority Car */}
                    <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-6">
                        <label className="block text-sm font-bold text-purple-900 mb-3">
                            Carros Prioritarios (Discapacitados)
                        </label>
                        <input
                            type="number"
                            min="0"
                            value={values.PRIORITY_CAR}
                            onChange={(e) => handleChange('PRIORITY_CAR', e.target.value)}
                            className="w-full text-3xl font-bold text-center py-4 px-6 bg-white border-2 border-purple-300 rounded-xl focus:ring-4 focus:ring-purple-200 focus:border-purple-500 outline-none transition-all"
                        />
                    </div>

                    {/* Motorcycles */}
                    <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-6">
                        <label className="block text-sm font-bold text-orange-900 mb-3">
                            Motos
                        </label>
                        <input
                            type="number"
                            min="0"
                            value={values.MOTO}
                            onChange={(e) => handleChange('MOTO', e.target.value)}
                            className="w-full text-3xl font-bold text-center py-4 px-6 bg-white border-2 border-orange-300 rounded-xl focus:ring-4 focus:ring-orange-200 focus:border-orange-500 outline-none transition-all"
                        />
                    </div>

                    {/* EV Charging */}
                    <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-6">
                        <label className="block text-sm font-bold text-emerald-900 mb-3">
                            Estaciones de Carga Eléctrica
                        </label>
                        <input
                            type="number"
                            min="0"
                            value={values.EV_CHARGING}
                            onChange={(e) => handleChange('EV_CHARGING', e.target.value)}
                            className="w-full text-3xl font-bold text-center py-4 px-6 bg-white border-2 border-emerald-300 rounded-xl focus:ring-4 focus:ring-emerald-200 focus:border-emerald-500 outline-none transition-all"
                        />
                    </div>

                    {/* Total */}
                    <div className="bg-gray-100 border-2 border-gray-300 rounded-2xl p-6">
                        <p className="text-sm font-bold text-gray-600 mb-2">Capacidad Total</p>
                        <p className="text-4xl font-bold text-gray-900">
                            {values.REGULAR_CAR + values.PRIORITY_CAR + values.MOTO + values.EV_CHARGING} espacios
                        </p>
                    </div>
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
                        className="flex-1 px-6 py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg"
                    >
                        <Save size={20} />
                        Guardar Cambios
                    </button>
                </div>
            </div>
        </div>
    );
};
