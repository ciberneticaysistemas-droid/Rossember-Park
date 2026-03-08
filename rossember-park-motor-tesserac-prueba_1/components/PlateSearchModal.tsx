import React, { useState } from 'react';
import { X, Search, Car, Bike, Clock, MapPin, Calendar, DollarSign } from 'lucide-react';
import { ParkingRecord, VehicleType } from '../types';

interface PlateSearchModalProps {
    records: ParkingRecord[];
    onClose: () => void;
}

export const PlateSearchModal: React.FC<PlateSearchModalProps> = ({ records, onClose }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<ParkingRecord[]>([]);

    const handleSearch = () => {
        if (!searchTerm.trim()) {
            setResults([]);
            return;
        }

        const filtered = records.filter(r =>
            r.plate.toUpperCase().includes(searchTerm.toUpperCase())
        );
        setResults(filtered);
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleString('es-CO', {
            dateStyle: 'medium',
            timeStyle: 'short'
        });
    };

    const getStatusBadge = (status: string) => {
        if (status === 'ACTIVE') {
            return <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">ACTIVO</span>;
        }
        return <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-full">COMPLETADO</span>;
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-6 text-white flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold">Buscador de Placas</h2>
                        <p className="text-blue-100 text-sm mt-1">Busca en toda la base de datos</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-6 border-b border-gray-200">
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Ingresa placa (ej: ABC123)"
                            maxLength={7}
                            className="flex-1 text-xl font-mono font-bold uppercase py-3 px-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 outline-none transition-all"
                        />
                        <button
                            onClick={handleSearch}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg flex items-center gap-2"
                        >
                            <Search size={20} />
                            Buscar
                        </button>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                        Total de registros: {records.length} | Activos: {records.filter(r => r.status === 'ACTIVE').length}
                    </p>
                </div>

                {/* Results */}
                <div className="flex-1 overflow-y-auto p-6">
                    {results.length === 0 && searchTerm === '' && (
                        <div className="text-center py-12">
                            <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search size={40} className="text-blue-600" />
                            </div>
                            <p className="text-gray-500 text-lg">Ingresa una placa para buscar</p>
                        </div>
                    )}

                    {results.length === 0 && searchTerm !== '' && (
                        <div className="text-center py-12">
                            <div className="bg-red-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search size={40} className="text-red-600" />
                            </div>
                            <p className="text-gray-900 text-lg font-bold mb-2">No se encontraron resultados</p>
                            <p className="text-gray-500">No hay registros con la placa "{searchTerm}"</p>
                        </div>
                    )}

                    {results.length > 0 && (
                        <div className="space-y-4">
                            <p className="text-sm font-bold text-gray-600 mb-4">
                                {results.length} resultado{results.length !== 1 ? 's' : ''} encontrado{results.length !== 1 ? 's' : ''}
                            </p>
                            {results.map((record) => (
                                <div
                                    key={record.id}
                                    className="bg-white border-2 border-gray-200 rounded-2xl p-4 hover:border-blue-300 transition-colors"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-3 rounded-xl ${record.vehicleType === VehicleType.MOTORCYCLE ? 'bg-orange-100' : 'bg-blue-100'}`}>
                                                {record.vehicleType === VehicleType.MOTORCYCLE ? (
                                                    <Bike size={24} className="text-orange-600" />
                                                ) : (
                                                    <Car size={24} className="text-blue-600" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-2xl font-bold text-gray-900">{record.plate}</p>
                                                <p className="text-sm text-gray-500">{record.vehicleType}</p>
                                            </div>
                                        </div>
                                        {getStatusBadge(record.status)}
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <MapPin size={16} />
                                            <span>
                                                {record.vehicleType === VehicleType.MOTORCYCLE
                                                    ? 'Recinto Motos'
                                                    : `Puesto ${record.spotNumber}`}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 text-gray-600">
                                            <Calendar size={16} />
                                            <span>{formatDate(record.entryTime)}</span>
                                        </div>

                                        {record.exitTime && (
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <Clock size={16} />
                                                <span>{formatDate(record.exitTime)}</span>
                                            </div>
                                        )}

                                        {record.cost !== undefined && (
                                            <div className="flex items-center gap-2 text-emerald-600 font-bold">
                                                <DollarSign size={16} />
                                                <span>${record.cost.toLocaleString()}</span>
                                            </div>
                                        )}
                                    </div>

                                    {record.paymentMethod && (
                                        <div className="mt-3 pt-3 border-t border-gray-200">
                                            <p className="text-xs text-gray-500">
                                                Método de pago: <span className="font-semibold text-gray-700">{record.paymentMethod}</span>
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
