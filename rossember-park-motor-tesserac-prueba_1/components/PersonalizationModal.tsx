import React, { useState } from 'react';
import { X, Upload, Image as ImageIcon, Check } from 'lucide-react';

interface PersonalizationModalProps {
    currentLogo: string | null;
    onSave: (logo: string | null) => void;
    onClose: () => void;
}

export const PersonalizationModal: React.FC<PersonalizationModalProps> = ({ currentLogo, onSave, onClose }) => {
    const [logoPreview, setLogoPreview] = useState<string | null>(currentLogo);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { // 2MB limit
                setError("El archivo es demasiado grande. Máximo 2MB.");
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                setLogoPreview(result);
                setError(null);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = () => {
        onSave(logoPreview);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden transform transition-all">
                <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-6 text-white flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <ImageIcon size={24} />
                        <h2 className="text-xl font-bold">Personalización</h2>
                    </div>
                    <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="space-y-4">
                        <label className="block text-sm font-bold text-gray-700">Logo de su Empresa</label>
                        <p className="text-xs text-gray-500">Este logo aparecerá en la cabecera de las vistas principales (Entrada, Salida, Pagos).</p>

                        <div className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors ${logoPreview ? 'border-blue-300 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}`}>
                            {logoPreview ? (
                                <div className="relative group">
                                    <img src={logoPreview} alt="Logo Preview" className="max-h-32 object-contain mb-4" />
                                    <button
                                        onClick={() => setLogoPreview(null)}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ) : (
                                <div className="text-gray-400 mb-2">
                                    <Upload size={48} className="mx-auto mb-2 opacity-50" />
                                    <p className="text-sm font-medium">Arrastra o selecciona una imagen</p>
                                    <p className="text-xs opacity-70">PNG, JPG (Max 2MB)</p>
                                </div>
                            )}

                            {!logoPreview && (
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                            )}
                        </div>

                        {error && <p className="text-red-500 text-sm font-medium text-center">{error}</p>}
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                        >
                            <Check size={20} />
                            Guardar Cambios
                        </button>
                    </div>
                </div>

                <div className="bg-gray-50 p-4 text-center border-t border-gray-200">
                    <p className="text-xs text-gray-400">Software desarrollado por <strong>CSM Cibernetica</strong></p>
                </div>
            </div>
        </div>
    );
};
