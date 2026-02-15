import React, { useState } from 'react';
import { X, Plus, Trash2, Image, Link, CheckCircle, AlertCircle, Upload, Film, FileText } from 'lucide-react';

interface AdManagementModalProps {
    advertisements: string[];
    onAdd: (url: string) => void;
    onRemove: (index: number) => void;
    onClose: () => void;
}

export const AdManagementModal: React.FC<AdManagementModalProps> = ({ advertisements, onAdd, onRemove, onClose }) => {
    const [newUrl, setNewUrl] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleAdd = () => {
        setError(null);
        if (!newUrl.trim()) {
            setError("Por favor ingresa una URL válida");
            return;
        }

        try {
            new URL(newUrl); // Simple validation
            onAdd(newUrl);
            setNewUrl('');
        } catch (e) {
            setError("La URL ingresada no es válida");
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError(null);

        // Limit file size to 1.5MB to avoid localStorage issues (QuotaExceededError)
        if (file.size > 1.5 * 1024 * 1024) {
            setError("El archivo es demasiado pesado (máx 1.5MB). Para videos, por favor usa una URL (YouTube, Vimeo, etc.) o comprímelo.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            if (dataUrl) {
                onAdd(dataUrl);
            }
        };
        reader.onerror = () => {
            setError("Error al leer el archivo");
        };
        reader.readAsDataURL(file);
    };

    const isVideo = (url: string) => url.startsWith('data:video/') || /\.(mp4|webm|ogg)$/i.test(url);
    const isPDF = (url: string) => url.startsWith('data:application/pdf') || url.match(/\.pdf$/i);


    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in-up">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 flex items-center justify-between text-white">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-lg">
                            <Image className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Gestión de Publicidad</h2>
                            <p className="text-purple-100 text-sm">Administra los anuncios rotativos</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-full transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6">
                    {/* Add New Ad */}
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 mb-6">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Agregar Nuevo Anuncio</label>
                        <div className="flex flex-col gap-4">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Link className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        value={newUrl}
                                        onChange={(e) => setNewUrl(e.target.value)}
                                        placeholder="https://ejemplo.com/imagen.jpg"
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-200 focus:border-purple-500 outline-none transition-all"
                                    />
                                </div>
                                <button
                                    onClick={handleAdd}
                                    className="bg-gray-800 hover:bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md active:scale-95"
                                >
                                    <Plus size={20} />
                                    URL
                                </button>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="h-[1px] flex-1 bg-gray-200"></div>
                                <span className="text-xs text-gray-400 font-bold uppercase">o también</span>
                                <div className="h-[1px] flex-1 bg-gray-200"></div>
                            </div>

                            <label className="cursor-pointer bg-purple-600 hover:bg-purple-700 text-white w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95">
                                <Upload size={20} />
                                Subir Archivo (Imagen, Video, PDF)
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*,video/*,application/pdf"
                                    onChange={handleFileUpload}
                                />
                            </label>
                        </div>
                        {error && (
                            <div className="flex items-center gap-2 mt-3 text-red-600 text-sm animate-pulse bg-red-50 p-2 rounded-lg border border-red-100">
                                <AlertCircle size={14} />
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Current Ads List */}
                    <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar p-1">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            Anuncios Activos
                            <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs">
                                {advertisements.length}
                            </span>
                        </h3>

                        {advertisements.length === 0 ? (
                            <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                                <Image size={32} className="mx-auto mb-2 opacity-50" />
                                <p>No hay anuncios configurados</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {advertisements.map((url, index) => (
                                    <div key={index} className="group relative aspect-video bg-gray-100 rounded-xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-all">
                                        {isVideo(url) ? (
                                            <div className="w-full h-full flex items-center justify-center bg-slate-900">
                                                <Film size={48} className="text-white/30" />
                                                <video src={url} className="absolute inset-0 w-full h-full object-cover opacity-60" muted />
                                            </div>
                                        ) : isPDF(url) ? (
                                            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50">
                                                <FileText size={48} className="text-red-500 mb-2" />
                                                <span className="text-[10px] font-bold text-gray-500 uppercase">Documento PDF</span>
                                            </div>
                                        ) : (
                                            <img
                                                src={url}
                                                alt={`Ad ${index + 1}`}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300?text=Error+Cargando+Imagen';
                                                }}
                                            />
                                        )}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                            <button
                                                onClick={() => onRemove(index)}
                                                className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-full transform scale-90 group-hover:scale-110 transition-all shadow-lg"
                                                title="Eliminar Anuncio"
                                            >
                                                <Trash2 size={24} />
                                            </button>
                                        </div>
                                        <div className="absolute bottom-2 left-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded truncate backdrop-blur-sm">
                                            {url}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};
