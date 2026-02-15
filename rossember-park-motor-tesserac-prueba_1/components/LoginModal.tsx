import React, { useState } from 'react';
import { X, Lock, KeyRound } from 'lucide-react';

interface LoginModalProps {
    onLogin: () => void;
    onCancel: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLogin, onCancel }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Hardcoded simple password for demo purposes
        if (password === '1234' || password === 'admin') {
            onLogin();
        } else {
            setError(true);
            setPassword('');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
                <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-slate-800 p-2 rounded-lg border border-slate-700">
                            <Lock className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <h3 className="font-bold text-xl">Acceso Restringido</h3>
                            <p className="text-slate-400 text-sm">Panel de Administrador</p>
                        </div>
                    </div>
                    <button
                        onClick={onCancel}
                        className="p-2 hover:bg-slate-800 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8">
                    <div className="mb-6">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Contraseña de Acceso</label>
                        <div className="relative">
                            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    setError(false);
                                }}
                                className={`w-full pl-12 pr-4 py-4 bg-gray-50 border-2 rounded-xl text-lg outline-none transition-all ${error
                                        ? 'border-red-300 focus:border-red-500 text-red-900 placeholder-red-300'
                                        : 'border-gray-200 focus:border-blue-500 text-gray-900'
                                    }`}
                                placeholder="Ingrese PIN o Contraseña"
                                autoFocus
                            />
                        </div>
                        {error && (
                            <p className="text-red-500 text-sm mt-2 font-medium flex items-center gap-1 animate-shake">
                                Contraseña incorrecta. Intente nuevamente.
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        <Lock size={20} />
                        Ingresar al Panel
                    </button>

                    <p className="text-center text-gray-400 text-xs mt-6">
                        Para propósitos de prueba: use "1234" o "admin"
                    </p>
                </form>
            </div>
        </div>
    );
};
