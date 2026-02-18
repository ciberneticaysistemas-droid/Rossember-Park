import React, { useState } from 'react';
import { X, Plus, Trash2, Calendar, CreditCard, AlertTriangle, User } from 'lucide-react';
import { SpecialRate, SpecialRateType } from '../types';

interface SpecialRatesModalProps {
    specialRates: SpecialRate[];
    onUpdate: (newRates: SpecialRate[]) => void;
    onClose: () => void;
}

export const SpecialRatesModal: React.FC<SpecialRatesModalProps> = ({
    specialRates,
    onUpdate,
    onClose
}) => {
    const [newPlate, setNewPlate] = useState('');
    const [newOwnerId, setNewOwnerId] = useState('');
    const [newType, setNewType] = useState<SpecialRateType>(SpecialRateType.MONTHLY);
    const [newValue, setNewValue] = useState(0);
    const [newDescription, setNewDescription] = useState('');
    const [newExpiration, setNewExpiration] = useState('');

    const handleAdd = () => {
        if (!newPlate) return;

        const newRate: SpecialRate = {
            id: crypto.randomUUID(),
            plate: newPlate.toUpperCase(),
            ownerId: newOwnerId,
            type: newType,
            value: newValue,
            description: newDescription,
            expirationDate: newExpiration ? new Date(newExpiration).getTime() : undefined,
            isActive: true
        };

        onUpdate([...specialRates, newRate]);
        setNewPlate('');
        setNewOwnerId('');
        setNewDescription('');
        setNewExpiration('');
        setNewValue(0);
    };

    const handleRemove = (id: string) => {
        onUpdate(specialRates.filter(r => r.id !== id));
    };

    const activeRates = specialRates.filter(r => r.isActive);

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[85vh]">
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
                    <div>
                        <h2 className="text-2xl font-black text-white flex items-center gap-3">
                            <CreditCard className="text-yellow-400" /> Tarifas Especiales
                        </h2>
                        <p className="text-slate-400 text-sm">Gestionar mensualidades y convenios</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-400">
                        <X size={24} />
                    </button>
                </div>

                {/* Add Section */}
                <div className="p-6 bg-slate-800/30 border-b border-slate-800">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Placa</label>
                                    <input
                                        type="text"
                                        value={newPlate}
                                        onChange={(e) => setNewPlate(e.target.value)}
                                        placeholder="ABC123"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white font-bold tracking-widest focus:border-yellow-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Cédula / ID</label>
                                    <input
                                        type="text"
                                        value={newOwnerId}
                                        onChange={(e) => setNewOwnerId(e.target.value)}
                                        placeholder="12345678"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white font-bold focus:border-yellow-500 outline-none"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Tipo</label>
                                    <select
                                        value={newType}
                                        onChange={(e) => setNewType(e.target.value as SpecialRateType)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-sm focus:border-yellow-500 outline-none cursor-pointer"
                                    >
                                        {Object.values(SpecialRateType).map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">
                                        {newType === SpecialRateType.MONTHLY ? 'Valor Pagado ($)' : 'Valor (% Desc)'}
                                    </label>
                                    <input
                                        type="number"
                                        value={newValue}
                                        onChange={(e) => setNewValue(Number(e.target.value))}
                                        placeholder="0"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white font-bold focus:border-yellow-500 outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Vence (Opcional)</label>
                                    <input
                                        type="date"
                                        value={newExpiration}
                                        onChange={(e) => setNewExpiration(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-sm focus:border-yellow-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Descripción</label>
                                    <input
                                        type="text"
                                        value={newDescription}
                                        onChange={(e) => setNewDescription(e.target.value)}
                                        placeholder="Ej: Empleado Admin"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-sm focus:border-yellow-500 outline-none"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={handleAdd}
                                className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                            >
                                <Plus size={20} /> Guardar Tarifa Especial
                            </button>
                        </div>
                    </div>
                </div>

                {/* List Section */}
                <div className="flex-1 overflow-y-auto p-6">
                    <h3 className="text-sm font-bold text-slate-500 mb-4 uppercase tracking-widest">Placas en Convenio ({activeRates.length})</h3>

                    {activeRates.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-600 opacity-50">
                            <AlertTriangle size={48} className="mb-4" />
                            <p>No hay tarifas especiales registradas</p>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {activeRates.map((rate) => (
                                <div key={rate.id} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 flex justify-between items-center group hover:border-slate-500 transition-colors">
                                    <div className="flex items-center gap-6">
                                        <div className="bg-slate-900 p-3 rounded-xl border border-slate-700 min-w-[120px] text-center">
                                            <span className="text-xl font-black text-white tracking-widest">{rate.plate}</span>
                                            <div className="flex items-center justify-center gap-1 text-[10px] text-slate-500 mt-1">
                                                <User size={10} /> {rate.ownerId || 'N/A'}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${rate.type === SpecialRateType.MONTHLY ? 'bg-purple-900/50 text-purple-400' :
                                                    rate.type === SpecialRateType.EMPLOYEE ? 'bg-blue-900/50 text-blue-400' : 'bg-emerald-900/50 text-emerald-400'
                                                    }`}>
                                                    {rate.type}
                                                </span>
                                                <span className={`text-[10px] font-bold ${rate.type === SpecialRateType.MONTHLY ? 'text-purple-400' : 'text-emerald-400'}`}>
                                                    {rate.type === SpecialRateType.MONTHLY
                                                        ? `$${rate.value.toLocaleString()}`
                                                        : `-${rate.value}%`}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-300 mt-1 font-medium">{rate.description || 'Sin descripción'}</p>
                                            {rate.expirationDate && (
                                                <div className="flex items-center gap-1 text-slate-500 text-[9px] mt-1">
                                                    <Calendar size={10} /> Vence: {new Date(rate.expirationDate).toLocaleDateString()}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <button onClick={() => handleRemove(rate.id)} className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
