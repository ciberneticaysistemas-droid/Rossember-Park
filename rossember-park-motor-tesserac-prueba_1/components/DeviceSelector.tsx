import React from 'react';
import { LogIn, LogOut, LayoutDashboard, Search, ArrowRight } from 'lucide-react';

export type DeviceType = 'ENTRY' | 'EXIT' | 'ADMIN' | 'SEARCH';

interface DeviceSelectorProps {
    onSelectDevice: (device: DeviceType) => void;
}

export const DeviceSelector: React.FC<DeviceSelectorProps> = ({ onSelectDevice }) => {
    const devices = [
        {
            type: 'ENTRY' as DeviceType,
            title: 'Estación de Entrada',
            description: 'Registrar vehículos que ingresan al parqueadero',
            icon: LogIn,
            gradient: 'from-blue-500 to-blue-600',
            bgGradient: 'bg-gradient-to-br from-blue-500 to-blue-600',
            iconBg: 'bg-blue-100',
            iconColor: 'text-blue-600',
        },
        {
            type: 'EXIT' as DeviceType,
            title: 'Estación de Salida',
            description: 'Procesar pagos y salidas de vehículos',
            icon: LogOut,
            gradient: 'from-orange-500 to-orange-600',
            bgGradient: 'bg-gradient-to-br from-orange-500 to-orange-600',
            iconBg: 'bg-orange-100',
            iconColor: 'text-orange-600',
        },
        {
            type: 'SEARCH' as DeviceType,
            title: 'Buscador de Parqueo',
            description: 'Ubicar vehículos en el parqueadero',
            icon: Search,
            gradient: 'from-emerald-500 to-emerald-600',
            bgGradient: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
            iconBg: 'bg-emerald-100',
            iconColor: 'text-emerald-600',
        },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 md:p-8">
            <div className="w-full max-w-6xl">
                {/* Header */}
                <div className="text-center mb-12 animate-fade-in-up">
                    <div className="inline-flex items-center gap-3 mb-4">
                        <div className="bg-blue-600 p-3 rounded-xl shadow-lg shadow-blue-900/50">
                            <LayoutDashboard className="text-white w-8 h-8" />
                        </div>
                        <div className="text-left">
                            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                                Rossember Parking
                            </h1>
                            <p className="text-sm text-slate-400 font-mono">SISTEMA DE PARQUEADERO</p>
                        </div>
                    </div>
                    <p className="text-slate-300 text-lg max-w-2xl mx-auto">
                        Selecciona el tipo de dispositivo para comenzar
                    </p>
                </div>

                {/* Device Cards Grid */}
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                    {devices.map((device, index) => {
                        const Icon = device.icon;
                        return (
                            <button
                                key={device.type}
                                onClick={() => onSelectDevice(device.type)}
                                className="device-card group relative overflow-hidden rounded-2xl shadow-premium-lg transition-all duration-300 hover:shadow-2xl"
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                {/* Gradient Background */}
                                <div className={`${device.bgGradient} p-8 md:p-10 text-left h-full`}>
                                    {/* Icon */}
                                    <div className={`${device.iconBg} w-16 h-16 rounded-xl flex items-center justify-center mb-6 shadow-lg transform group-hover:scale-110 transition-transform duration-300`}>
                                        <Icon className={`${device.iconColor} w-8 h-8`} />
                                    </div>

                                    {/* Content */}
                                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                                        {device.title}
                                    </h2>
                                    <p className="text-white/80 text-sm md:text-base mb-6">
                                        {device.description}
                                    </p>

                                    {/* Arrow Icon */}
                                    <div className="flex items-center gap-2 text-white/90 font-semibold text-sm group-hover:gap-4 transition-all duration-300">
                                        <span>Seleccionar</span>
                                        <ArrowRight className="w-5 h-5 transform group-hover:translate-x-2 transition-transform duration-300" />
                                    </div>

                                    {/* Decorative Gradient Overlay */}
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl transform translate-x-16 -translate-y-16 group-hover:scale-150 transition-transform duration-500"></div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="text-center text-slate-500 text-sm animate-fade-in">
                    <p className="mb-2">
                        Fundación Universidad de América - Semillero IA 2025
                    </p>
                    <p className="text-xs text-slate-600">
                        Juan Andrés Rincón • Cristopher Ramirez • Alejandro Melo
                    </p>
                </div>
            </div>
        </div>
    );
};
