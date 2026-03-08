import React, { useState, useEffect } from 'react';
import { CameraFeed } from './components/CameraFeed';
import { VehicleCard } from './components/VehicleCard';
import { DatabaseView } from './components/DatabaseView';
import { PaymentModal } from './components/PaymentModal';
import { VirtualKeyboard } from './components/VirtualKeyboard';
import { analyzeImage, inspectVehicle } from './services/geminiService';
import { generateInvoice } from './services/pdfService';
import { ParkingRecord, VehicleType } from './types';
import { Car, Bike, DollarSign, Activity, AlertCircle, Database, LogIn, LogOut, Accessibility, MapPin, FileText, User, Keyboard, Camera as CameraIcon } from 'lucide-react';

const RATES = {
  [VehicleType.CAR]: 85, // COP per minute
  [VehicleType.MOTORCYCLE]: 55, // COP per minute
  [VehicleType.UNKNOWN]: 85
};

// Capacity Configuration
const CAPACITIES = {
  REGULAR_CAR: 240, // C-001 to C-240
  PRIORITY_CAR: 10, // P-001 to P-010
  MOTO: 100         // M-001 to M-100 (Internal tracking)
};

const App: React.FC = () => {
  const [records, setRecords] = useState<ParkingRecord[]>(() => {
    // Load from local storage
    const saved = localStorage.getItem('parkingRecords');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDatabase, setShowDatabase] = useState(false);
  const [scanMode, setScanMode] = useState<'ENTRY' | 'EXIT'>('ENTRY');
  const [isAccessibilityMode, setIsAccessibilityMode] = useState(false);
  const [ownerIdInput, setOwnerIdInput] = useState('');
  
  // Manual Input State
  const [isManualInput, setIsManualInput] = useState(false);
  const [manualPlate, setManualPlate] = useState('');
  const [manualType, setManualType] = useState<VehicleType>(VehicleType.CAR);

  // Virtual Keyboard State
  const [activeInput, setActiveInput] = useState<'ownerId' | 'manualPlate' | null>(null);
  
  // Pending payment state
  const [pendingPayment, setPendingPayment] = useState<{
    recordId: string;
    plate: string;
    ownerId?: string;
    vehicleType: VehicleType;
    cost: number;
    minutes: number;
    entryTime: number;
    exitTime: number;
    durationStr: string;
    img?: string; 
    isDisabled?: boolean;
    originalCost?: number; 
    spotNumber?: string;
  } | null>(null);

  const [lastProcessed, setLastProcessed] = useState<{
    plate: string;
    ownerId?: string;
    vehicleType: VehicleType;
    img: string;
    mode: 'ENTRY' | 'EXIT';
    cost?: number;
    duration?: string;
    timestamp: number;
    entryTime?: number; 
    isDisabled?: boolean;
    spotNumber?: string;
    paymentMethod?: string;
    id?: string;
  } | null>(null);
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('parkingRecords', JSON.stringify(records));
  }, [records]);

  // --- Virtual Keyboard Logic ---
  const handleVirtualKeyPress = (key: string) => {
    if (activeInput === 'ownerId') {
      setOwnerIdInput(prev => prev + key);
    } else if (activeInput === 'manualPlate') {
      setManualPlate(prev => (prev + key).toUpperCase());
    }
  };

  const handleVirtualBackspace = () => {
    if (activeInput === 'ownerId') {
      setOwnerIdInput(prev => prev.slice(0, -1));
    } else if (activeInput === 'manualPlate') {
      setManualPlate(prev => prev.slice(0, -1));
    }
  };

  // --- Logic for Spot Assignment ---
  const getAvailableSpot = (type: VehicleType, isPriority: boolean): string | null => {
    const activeRecords = records.filter(r => r.status === 'ACTIVE');
    const usedSpots = new Set(activeRecords.map(r => r.spotNumber));

    if (type === VehicleType.MOTORCYCLE) {
      for (let i = 1; i <= CAPACITIES.MOTO; i++) {
        const spot = `M-${i.toString().padStart(3, '0')}`;
        if (!usedSpots.has(spot)) return spot;
      }
      return null; 
    } else {
      if (isPriority) {
        for (let i = 1; i <= CAPACITIES.PRIORITY_CAR; i++) {
          const spot = `P-${i.toString().padStart(3, '0')}`;
          if (!usedSpots.has(spot)) return spot;
        }
        return null; 
      } else {
        for (let i = 1; i <= CAPACITIES.REGULAR_CAR; i++) {
          const spot = `C-${i.toString().padStart(3, '0')}`;
          if (!usedSpots.has(spot)) return spot;
        }
        return null;
      }
    }
  };

  const calculateCost = (entryTime: number, type: VehicleType, isDisabled?: boolean) => {
    const exitTime = Date.now();
    const minutes = Math.ceil((exitTime - entryTime) / 60000);
    const rate = RATES[type] || RATES[VehicleType.CAR];
    
    let totalCost = Math.max(minutes * rate, rate);
    const originalCost = totalCost;

    if (isDisabled) {
      totalCost = Math.ceil(totalCost * 0.5);
    }

    return {
      cost: totalCost,
      originalCost: isDisabled ? originalCost : undefined,
      minutes,
      exitTime
    };
  };

  // --- Unified Transaction Processor ---
  const processTransaction = (
    plate: string, 
    vehicleType: VehicleType, 
    ownerId: string, 
    imgData: string | null // null for manual
  ) => {
    if (plate.length < 4) {
      setErrorMsg("La placa es demasiado corta.");
      setIsProcessing(false);
      return;
    }

    const existing = records.find(r => r.plate === plate && r.status === 'ACTIVE');

    if (scanMode === 'ENTRY') {
      // --- ENTRY MODE ---
      if (existing) {
        setErrorMsg(`⚠️ El vehículo ${plate} ya se encuentra dentro del parqueadero.`);
        setIsProcessing(false);
        return;
      }

      const priority = isAccessibilityMode;
      const assignedSpot = getAvailableSpot(vehicleType, priority);

      if (!assignedSpot) {
        setErrorMsg(`⛔ No hay cupos disponibles para ${vehicleType === VehicleType.CAR ? (priority ? 'Prioridad' : 'Automóvil') : 'Moto'}.`);
        setIsProcessing(false);
        return;
      }

      const newRecord: ParkingRecord = {
        id: crypto.randomUUID(),
        plate: plate,
        ownerId: ownerId, 
        vehicleType: vehicleType,
        entryTime: Date.now(),
        status: 'ACTIVE',
        imageUrl: imgData || undefined,
        isDisabled: priority,
        spotNumber: assignedSpot
      };
      
      setRecords(prev => [newRecord, ...prev]);
      
      setLastProcessed({
        plate: plate,
        ownerId: newRecord.ownerId,
        vehicleType: newRecord.vehicleType,
        img: imgData || '', // Empty string if manual
        mode: 'ENTRY',
        timestamp: Date.now(),
        entryTime: newRecord.entryTime,
        isDisabled: newRecord.isDisabled,
        spotNumber: newRecord.spotNumber
      });
      
      // Reset fields
      setIsAccessibilityMode(false);
      setOwnerIdInput('');
      setManualPlate(''); 
      setActiveInput(null); // Close keyboard

    } else {
      // --- EXIT MODE ---
      if (!existing) {
        setErrorMsg(`⚠️ El vehículo ${plate} no tiene un ingreso activo registrado.`);
        setIsProcessing(false);
        return;
      }
      
      initiateExitSequence(existing, imgData || undefined);
    }
    
    setIsProcessing(false);
  };

  const handleCapture = async (imageData: string) => {
    setErrorMsg(null);
    setLastProcessed(null);

    if (scanMode === 'ENTRY' && !ownerIdInput.trim()) {
      setErrorMsg("⚠️ Por favor ingresa el número de Cédula o Documento antes de escanear.");
      return;
    }

    setIsProcessing(true);

    try {
      const result = await analyzeImage(imageData);

      if (result.detected && result.plate.length >= 4) {
        const vType = result.vehicleType === VehicleType.UNKNOWN ? VehicleType.CAR : result.vehicleType;
        processTransaction(result.plate, vType, ownerIdInput.trim(), imageData);
      } else {
        setErrorMsg("No se detectó una placa clara (OCR Local). Intenta acercarte más o usar el modo manual.");
        setIsProcessing(false);
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("Error procesando la imagen. Inténtalo de nuevo.");
      setIsProcessing(false);
    }
  };

  const handleManualSubmit = () => {
    setErrorMsg(null);
    setLastProcessed(null);

    if (!manualPlate.trim()) {
      setErrorMsg("⚠️ Por favor escribe la placa.");
      return;
    }

    if (scanMode === 'ENTRY' && !ownerIdInput.trim()) {
      setErrorMsg("⚠️ Por favor ingresa el número de Cédula o Documento.");
      return;
    }

    setIsProcessing(true);
    // Simulate a short delay for UX
    setTimeout(() => {
      processTransaction(manualPlate.toUpperCase(), manualType, ownerIdInput.trim(), null);
    }, 500);
  };

  const initiateExitSequence = (record: ParkingRecord, currentImage?: string) => {
    const { cost, originalCost, minutes, exitTime } = calculateCost(record.entryTime, record.vehicleType, record.isDisabled);
            
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;

    setPendingPayment({
      recordId: record.id,
      plate: record.plate,
      ownerId: record.ownerId,
      vehicleType: record.vehicleType,
      cost,
      originalCost,
      minutes,
      entryTime: record.entryTime,
      exitTime,
      durationStr,
      img: currentImage || record.imageUrl,
      isDisabled: record.isDisabled,
      spotNumber: record.spotNumber
    });
  };

  // Callback from Payment Modal
  const handlePaymentConfirm = (bank: string, email: string) => {
    if (!pendingPayment) return;

    // Simulate Email
    console.log(`
      📧 SIMULACIÓN DE CORREO ENVIADO
      Para: ${email}
      Asunto: Recibo de pago Rossember Park - ${pendingPayment.plate}
      ----------------------------------------
      Gracias por usar Rossember Park - Fundación Universidad de América.
      Vehículo: ${pendingPayment.plate} (${pendingPayment.vehicleType})
      Propietario CC: ${pendingPayment.ownerId || 'N/A'}
      Duración: ${pendingPayment.durationStr}
      Total Pagado: $${pendingPayment.cost}
      ${pendingPayment.originalCost ? `(Descuento aplicado: -$${pendingPayment.originalCost - pendingPayment.cost})` : ''}
      Método: PSE (${bank})
      ----------------------------------------
    `);

    // Update Record to COMPLETED
    setRecords(prev => prev.map(r => {
      if (r.id === pendingPayment.recordId) {
        return {
          ...r,
          exitTime: pendingPayment.exitTime,
          status: 'COMPLETED',
          cost: pendingPayment.cost,
          paymentStatus: 'PAID',
          paymentMethod: `PSE - ${bank}`
        };
      }
      return r;
    }));

    // Show Success Card
    setLastProcessed({
      id: pendingPayment.recordId,
      plate: pendingPayment.plate,
      ownerId: pendingPayment.ownerId,
      vehicleType: pendingPayment.vehicleType,
      img: pendingPayment.img || '', 
      mode: 'EXIT',
      cost: pendingPayment.cost,
      duration: pendingPayment.durationStr,
      timestamp: Date.now(),
      entryTime: pendingPayment.entryTime, 
      isDisabled: pendingPayment.isDisabled,
      spotNumber: pendingPayment.spotNumber,
      paymentMethod: `PSE - ${bank}`
    });

    setPendingPayment(null);
  };

  const handleDownloadInvoice = () => {
    if (!lastProcessed || lastProcessed.mode !== 'EXIT' || !lastProcessed.entryTime || !lastProcessed.cost) return;
    
    generateInvoice({
      id: lastProcessed.id || 'TEMP',
      plate: lastProcessed.plate,
      ownerId: lastProcessed.ownerId,
      vehicleType: lastProcessed.vehicleType,
      entryTime: lastProcessed.entryTime,
      exitTime: lastProcessed.timestamp,
      durationStr: lastProcessed.duration || '0 min',
      cost: lastProcessed.cost,
      paymentMethod: lastProcessed.paymentMethod || 'Efectivo',
      spotNumber: lastProcessed.spotNumber,
      isDisabled: lastProcessed.isDisabled
    });
  };

  const handleManualExitRequest = (id: string) => {
    const record = records.find(r => r.id === id);
    if (record) {
      initiateExitSequence(record);
    }
  };
  
  // Inspection / Audit Handler (Updated for Local)
  const handleInspection = async (id: string) => {
    const record = records.find(r => r.id === id);
    if (record && record.imageUrl) {
      const details = await inspectVehicle(record.imageUrl);
      // Update record with details
      setRecords(prev => prev.map(r => {
        if (r.id === id) {
          return { ...r, details };
        }
        return r;
      }));
    }
  };

  const activeRecords = records.filter(r => r.status === 'ACTIVE');
  const totalRevenue = records
    .filter(r => r.status === 'COMPLETED' && r.cost)
    .reduce((acc, curr) => acc + (curr.cost || 0), 0);
  const occupancy = activeRecords.length;

  return (
    <div className="min-h-screen pb-20 md:pb-0 md:flex md:flex-row bg-gray-50 font-sans">
      
      {/* Mobile/Sidebar Header */}
      <div className="md:w-64 md:h-screen md:fixed md:left-0 md:top-0 bg-slate-900 border-r border-slate-800 p-6 flex flex-col shadow-xl z-20 text-white">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-900/50">
            <Car className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Rossember</h1>
            <p className="text-xs text-slate-400 font-mono">PARK</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-blue-400 mb-2">
              <Activity size={18} />
              <span className="font-semibold text-sm">Ocupación</span>
            </div>
            <p className="text-3xl font-bold text-white">{occupancy} <span className="text-sm font-normal text-slate-400">vehículos</span></p>
          </div>

          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-emerald-400 mb-2">
              <DollarSign size={18} />
              <span className="font-semibold text-sm">Ingresos Hoy</span>
            </div>
            <p className="text-3xl font-bold text-white">${totalRevenue.toLocaleString()}</p>
          </div>

          <button 
            onClick={() => setShowDatabase(true)}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-700 hover:bg-slate-800 transition-all text-slate-300 mt-4 group"
          >
            <div className="bg-slate-800 p-2 rounded-lg group-hover:bg-slate-700 transition-colors">
              <Database size={18} className="text-slate-400 group-hover:text-white" />
            </div>
            <div className="text-left">
              <span className="block font-semibold text-sm">Ver SQL</span>
              <span className="text-xs text-slate-500">Base de Datos</span>
            </div>
          </button>
        </div>

        <div className="mt-auto pt-6 border-t border-slate-800">
          <p className="text-xs text-slate-500 text-center">
            Motor: TensorFlow + Tesseract
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 max-w-7xl mx-auto w-full">
        
        <div className="grid lg:grid-cols-12 gap-8">
          
          {/* Left Column: Scanner (5 cols) */}
          <section className="lg:col-span-5 space-y-6">
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex flex-col gap-4 mb-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Operación</h2>
                  
                  {/* Mode Toggle */}
                  <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                      onClick={() => setScanMode('ENTRY')}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                        scanMode === 'ENTRY' 
                          ? 'bg-white text-blue-600 shadow-sm' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <LogIn size={14} /> ENTRADA
                    </button>
                    <button
                      onClick={() => setScanMode('EXIT')}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                        scanMode === 'EXIT' 
                          ? 'bg-white text-orange-600 shadow-sm' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <LogOut size={14} /> SALIDA
                    </button>
                  </div>
                </div>

                {/* -- ID INPUT FIELD -- */}
                {scanMode === 'ENTRY' && (
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User size={16} className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={ownerIdInput}
                      onFocus={() => setActiveInput('ownerId')}
                      onChange={(e) => setOwnerIdInput(e.target.value)}
                      placeholder="Ingrese Documento / Cédula (Obligatorio)"
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all text-gray-900 placeholder-gray-500 cursor-pointer"
                    />
                  </div>
                )}

                {/* Accessibility Toggle */}
                {scanMode === 'ENTRY' && (
                   <button
                   onClick={() => setIsAccessibilityMode(!isAccessibilityMode)}
                   className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                     isAccessibilityMode
                       ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200'
                       : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                   }`}
                 >
                   <Accessibility size={18} />
                   {isAccessibilityMode ? 'Prioridad / Discapacidad ACTIVA' : 'Habilitar Modo Prioridad'}
                 </button>
                )}
               
              </div>

              {/* CAMERA vs MANUAL Toggle Area */}
              <div className="space-y-4">
                  
                  {isManualInput ? (
                    // --- MANUAL INPUT FORM ---
                    <div className="bg-gray-50 rounded-2xl p-6 border-2 border-dashed border-gray-300 min-h-[300px] flex flex-col justify-center gap-4">
                        <div className="text-center mb-2">
                           <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 text-blue-600">
                             <Keyboard size={24} />
                           </div>
                           <h3 className="font-bold text-gray-800">Ingreso Manual</h3>
                           <p className="text-xs text-gray-400">Si la cámara no reconoce la placa</p>
                        </div>

                        {/* Vehicle Type Selector (Only needed for Manual Entry) */}
                        {scanMode === 'ENTRY' && (
                           <div className="grid grid-cols-2 gap-3">
                              <button 
                                type="button"
                                onClick={() => setManualType(VehicleType.CAR)}
                                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                                  manualType === VehicleType.CAR 
                                  ? 'bg-blue-50 border-blue-500 text-blue-700' 
                                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                                }`}
                              >
                                <Car size={24} className="mb-1" />
                                <span className="text-xs font-bold">Carro</span>
                              </button>
                              <button 
                                type="button"
                                onClick={() => setManualType(VehicleType.MOTORCYCLE)}
                                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                                  manualType === VehicleType.MOTORCYCLE 
                                  ? 'bg-orange-50 border-orange-500 text-orange-700' 
                                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                                }`}
                              >
                                <Bike size={24} className="mb-1" />
                                <span className="text-xs font-bold">Moto</span>
                              </button>
                           </div>
                        )}

                        <div>
                           <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Número de Placa</label>
                           <input
                            type="text"
                            value={manualPlate}
                            onFocus={() => setActiveInput('manualPlate')}
                            onChange={(e) => setManualPlate(e.target.value.toUpperCase())}
                            placeholder="AAA123"
                            maxLength={7}
                            className="w-full text-center text-3xl font-mono font-bold uppercase py-4 bg-white border border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-gray-900 placeholder-gray-300 cursor-pointer"
                           />
                        </div>

                        <button
                          onClick={handleManualSubmit}
                          disabled={isProcessing}
                          className={`w-full py-3 rounded-xl font-bold text-white transition-all shadow-md active:scale-95 ${
                            scanMode === 'ENTRY' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-600 hover:bg-orange-700'
                          }`}
                        >
                          {isProcessing ? 'Procesando...' : (scanMode === 'ENTRY' ? 'Registrar Ingreso' : 'Registrar Salida')}
                        </button>
                    </div>
                  ) : (
                    // --- CAMERA COMPONENT ---
                    <div className={`transition-all duration-300 rounded-2xl p-1 relative ${
                        scanMode === 'ENTRY' ? 'bg-gradient-to-b from-blue-500 to-blue-200' : 'bg-gradient-to-b from-orange-500 to-orange-200'
                    }`}>
                        {isAccessibilityMode && scanMode === 'ENTRY' && (
                        <div className="absolute top-0 right-0 left-0 bg-blue-600 text-white text-xs font-bold text-center py-1 rounded-t-lg z-10 flex items-center justify-center gap-1">
                            <Accessibility size={12} /> REGISTRO PRIORITARIO
                        </div>
                        )}
                        <CameraFeed onCapture={handleCapture} isProcessing={isProcessing} mode={scanMode} />
                    </div>
                  )}

                  {/* Toggle Button */}
                  <div className="flex justify-center">
                    <button 
                        onClick={() => setIsManualInput(!isManualInput)}
                        className="text-sm font-medium text-gray-500 hover:text-blue-600 underline flex items-center gap-2 transition-colors"
                    >
                        {isManualInput ? (
                            <><CameraIcon size={16} /> Usar Cámara / Escáner</>
                        ) : (
                            <><Keyboard size={16} /> Escribir placa manualmente</>
                        )}
                    </button>
                  </div>

              </div>
            </div>

            {/* Recognition Feedback */}
            {lastProcessed && !errorMsg && (
              <div className={`rounded-xl p-5 border shadow-sm animate-fade-in-up ${
                lastProcessed.mode === 'ENTRY' 
                  ? 'bg-blue-50 border-blue-100' 
                  : 'bg-emerald-50 border-emerald-100'
              }`}>
                <div className="flex gap-4">
                  <div className="w-20 h-20 rounded-lg bg-gray-200 overflow-hidden shrink-0 border border-black/10 shadow-inner flex items-center justify-center">
                    {lastProcessed.img ? (
                      <img src={lastProcessed.img} alt="Capture" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-gray-400">
                        {lastProcessed.vehicleType === VehicleType.CAR ? <Car size={32} /> : <Bike size={32} />}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${
                          lastProcessed.mode === 'ENTRY' ? 'text-blue-600' : 'text-emerald-600'
                        }`}>
                          {lastProcessed.mode === 'ENTRY' ? '✅ Entrada Exitosa' : '🏁 Salida Pagada'}
                        </p>
                        <h3 className="text-3xl font-bold text-gray-900 tracking-tight">{lastProcessed.plate}</h3>
                      </div>
                      {lastProcessed.mode === 'EXIT' && (
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Cobrado</p>
                          <p className="text-2xl font-bold text-emerald-600">${lastProcessed.cost?.toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                      <span className="bg-white/80 px-2 py-1 rounded border border-gray-200/50">
                        {lastProcessed.vehicleType}
                      </span>
                      {lastProcessed.ownerId && (
                        <span className="bg-white/80 px-2 py-1 rounded border border-gray-200/50 flex items-center gap-1">
                          <User size={10} /> {lastProcessed.ownerId}
                        </span>
                      )}
                      {lastProcessed.isDisabled && (
                         <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded border border-blue-200 flex items-center gap-1 font-bold">
                            <Accessibility size={14} /> Prioridad
                         </span>
                      )}
                      
                      {/* --- SPOT ASSIGNMENT DISPLAY --- */}
                      {lastProcessed.mode === 'ENTRY' && (
                        <div className={`w-full mt-2 p-3 rounded-lg flex items-center gap-3 ${
                           lastProcessed.vehicleType === VehicleType.MOTORCYCLE 
                           ? 'bg-orange-100 text-orange-800 border border-orange-200'
                           : 'bg-blue-600 text-white shadow-md'
                        }`}>
                            <MapPin size={20} className="shrink-0" />
                            <div className="leading-tight">
                              <p className="text-[10px] opacity-80 uppercase tracking-widest font-semibold">Asignación</p>
                              <p className="font-bold text-lg">
                                {lastProcessed.vehicleType === VehicleType.MOTORCYCLE 
                                  ? "Parquear en el recinto de motos" 
                                  : `Puesto ${lastProcessed.spotNumber}`
                                }
                              </p>
                            </div>
                        </div>
                      )}

                      {lastProcessed.duration && (
                        <span className="flex items-center gap-1">
                          <Activity size={14} /> {lastProcessed.duration}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* --- PDF INVOICE BUTTON --- */}
                {lastProcessed.mode === 'EXIT' && (
                  <button 
                    onClick={handleDownloadInvoice}
                    className="w-full mt-4 flex items-center justify-center gap-2 py-2 border-2 border-dashed border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-50 hover:border-emerald-300 transition-all text-sm font-semibold"
                  >
                    <FileText size={16} />
                    Descargar Factura PDF
                  </button>
                )}
              </div>
            )}

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-red-700 animate-pulse shadow-sm">
                <AlertCircle size={20} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold text-sm">Error de Proceso</p>
                  <p className="text-sm opacity-90">{errorMsg}</p>
                </div>
              </div>
            )}
          </section>

          {/* Right Column: List (7 cols) */}
          <section className="lg:col-span-7">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-full flex flex-col">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Vehículos en Parqueadero</h2>
                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
                  {activeRecords.length} Activos
                </span>
              </div>

              <div className="flex-1 p-6 overflow-y-auto max-h-[600px] space-y-3 bg-gray-50/50">
                {activeRecords.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <div className="bg-gray-100 p-4 rounded-full mb-4">
                      <Car className="w-8 h-8 opacity-40" />
                    </div>
                    <p className="font-medium">Parqueadero vacío</p>
                    <p className="text-sm opacity-60">Registra una entrada para comenzar</p>
                  </div>
                ) : (
                  activeRecords.map(record => (
                    <VehicleCard 
                      key={record.id} 
                      record={record} 
                      onExit={handleManualExitRequest}
                    />
                  ))
                )}
              </div>
              
              {/* Recent History (Footer of right column) */}
              {records.some(r => r.status === 'COMPLETED') && (
                <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
                   <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Últimas Salidas</h3>
                   <div className="space-y-2">
                      {records.filter(r => r.status === 'COMPLETED').slice(0, 3).map(r => (
                        <div key={r.id} className="bg-white p-3 rounded-lg border border-gray-100 flex justify-between items-center text-sm shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${r.vehicleType === VehicleType.CAR ? 'bg-blue-500' : 'bg-orange-500'}`}></div>
                            <div>
                                <span className="font-bold text-gray-800 flex items-center gap-2">
                                  {r.plate}
                                  {r.isDisabled && <Accessibility size={12} className="text-blue-600" />}
                                </span>
                                <span className="text-xs text-gray-400">{r.paymentMethod || 'Efectivo'}</span>
                            </div>
                            <span className="text-gray-400 text-xs hidden sm:inline">
                               {new Date(r.exitTime!).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          </div>
                          <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-xs border border-emerald-100">
                            +${r.cost?.toLocaleString()}
                          </span>
                        </div>
                      ))}
                   </div>
                </div>
              )}
            </div>
          </section>

        </div>
      </main>

      {/* Database View Modal */}
      {showDatabase && (
        <DatabaseView records={records} onClose={() => setShowDatabase(false)} />
      )}

      {/* PSE Payment Modal */}
      {pendingPayment && (
        <PaymentModal 
          plate={pendingPayment.plate}
          vehicleType={pendingPayment.vehicleType}
          duration={pendingPayment.durationStr}
          cost={pendingPayment.cost}
          originalCost={pendingPayment.originalCost}
          isDisabled={pendingPayment.isDisabled}
          onConfirm={handlePaymentConfirm}
          onCancel={() => setPendingPayment(null)}
        />
      )}

      {/* Virtual Keyboard */}
      <VirtualKeyboard 
        isVisible={activeInput !== null}
        onKeyPress={handleVirtualKeyPress}
        onBackspace={handleVirtualBackspace}
        onClose={() => setActiveInput(null)}
      />
    </div>
  );
};

export default App;