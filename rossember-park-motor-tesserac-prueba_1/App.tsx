import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { DeviceSelector } from './components/DeviceSelector';
import { EntryView } from './views/EntryView';
import { ExitView } from './views/ExitView';
import { AdminView } from './views/AdminView';
import { AdminLogin } from './views/AdminLogin';
import { SearchView } from './views/SearchView';
import { ProtectedRoute } from './components/ProtectedRoute';
import { inspectVehicle } from './services/geminiService';
import { ParkingRecord, VehicleType, Floor, SpecialRate, SpecialRateType } from './types';

// Default Capacity Configuration
const DEFAULT_CAPACITIES = {
  REGULAR_CAR: 10,
  PRIORITY_CAR: 5,
  MOTO: 5,
  EV_CHARGING: 5
};

const DEFAULT_PREFIXES = {
  REGULAR_CAR: 'C',
  PRIORITY_CAR: 'P',
  MOTO: 'M',
  EV_CHARGING: 'E'
};

const DEFAULT_FLOORS: Floor[] = [
  {
    id: 'floor-1',
    name: 'Piso 1',
    capacities: DEFAULT_CAPACITIES,
    prefixes: DEFAULT_PREFIXES
  }
];

const DEFAULT_RATES = {
  [VehicleType.CAR]: 85,
  [VehicleType.MOTORCYCLE]: 55,
  [VehicleType.ELECTRIC]: 100,
  [VehicleType.UNKNOWN]: 85,
  'CAR_FULL': 35000,
  'MOTO_FULL': 18000,
  'EV_CHARGING_RATE': 120,
  'DISABILITY_DISCOUNT_PERCENT': 50,
  'GRACE_PERIOD_MINUTES': 15
};

// Admin credentials - leídas desde variables de entorno (.env)
// En GitHub Pages, configura estos valores como GitHub Secrets en el workflow de Actions
const ADMIN_CREDENTIALS = {
  username: import.meta.env.VITE_ADMIN_USERNAME || 'admin',
  password: import.meta.env.VITE_ADMIN_PASSWORD || 'admin123'
};

const AppContent: React.FC = () => {
  const navigate = useNavigate();

  // Authentication State
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    return sessionStorage.getItem('adminAuth') === 'true';
  });

  // Core State
  const [records, setRecords] = useState<ParkingRecord[]>(() => {
    const saved = localStorage.getItem('parkingRecords');
    return saved ? JSON.parse(saved) : [];
  });

  const [rates, setRates] = useState<Record<string, number>>(() => {
    const savedRates = localStorage.getItem('parkingRates');
    return savedRates ? JSON.parse(savedRates) : DEFAULT_RATES;
  });

  const [floors, setFloors] = useState<Floor[]>(() => {
    const savedFloors = localStorage.getItem('parkingFloors');
    if (savedFloors) return JSON.parse(savedFloors);

    const savedCapacities = localStorage.getItem('parkingCapacities');
    if (savedCapacities) {
      return [{
        id: 'floor-1',
        name: 'Piso 1',
        capacities: { ...DEFAULT_CAPACITIES, ...JSON.parse(savedCapacities) },
        prefixes: DEFAULT_PREFIXES
      }];
    }

    return DEFAULT_FLOORS;
  });

  const [advertisements, setAdvertisements] = useState<string[]>(() => {
    const savedAds = localStorage.getItem('parkingAdvertisements');
    return savedAds ? JSON.parse(savedAds) : [];
  });

  const [specialRates, setSpecialRates] = useState<SpecialRate[]>(() => {
    const saved = localStorage.getItem('specialRates');
    return saved ? JSON.parse(saved) : [];
  });

  const [adTrigger, setAdTrigger] = useState(0);

  // Client Customization State
  const [clientLogo, setClientLogo] = useState<string | null>(() => {
    return localStorage.getItem('clientLogo');
  });

  // Derived Total Capacities
  const totalCapacities = floors.reduce((acc, floor) => ({
    REGULAR_CAR: acc.REGULAR_CAR + floor.capacities.REGULAR_CAR,
    PRIORITY_CAR: acc.PRIORITY_CAR + floor.capacities.PRIORITY_CAR,
    MOTO: acc.MOTO + floor.capacities.MOTO,
    EV_CHARGING: acc.EV_CHARGING + floor.capacities.EV_CHARGING
  }), { REGULAR_CAR: 0, PRIORITY_CAR: 0, MOTO: 0, EV_CHARGING: 0 });

  // Persist data
  useEffect(() => {
    localStorage.setItem('parkingRecords', JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    localStorage.setItem('parkingRates', JSON.stringify(rates));
  }, [rates]);

  useEffect(() => {
    localStorage.setItem('parkingFloors', JSON.stringify(floors));
  }, [floors]);

  useEffect(() => {
    try {
      localStorage.setItem('parkingAdvertisements', JSON.stringify(advertisements));
    } catch (e) {
      console.error("Failed to save advertisements to localStorage:", e);
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        alert("⚠️ Memoria llena: No se pudo guardar el anuncio.");
      }
    }
  }, [advertisements]);

  useEffect(() => {
    localStorage.setItem('specialRates', JSON.stringify(specialRates));
  }, [specialRates]);

  useEffect(() => {
    if (clientLogo) {
      localStorage.setItem('clientLogo', clientLogo);
    } else {
      localStorage.removeItem('clientLogo');
    }
  }, [clientLogo]);

  // Helper Functions
  const getAvailableSpot = (type: VehicleType, isPriority: boolean, requiresCharging: boolean = false): { spot: string, floorId: string } | null => {
    const activeRecords = records.filter(r => r.status === 'ACTIVE');
    const usedSpots = new Set(activeRecords.map(r => r.spotNumber));

    console.log(`[getAvailableSpot] Buscando para: ${type}, Prioridad: ${isPriority}, Carga: ${requiresCharging}`);
    console.log(`[getAvailableSpot] Puestos ocupados actualmente:`, Array.from(usedSpots));

    for (const floor of floors) {
      const isLegacyFloor = floor.id === 'floor-1';
      const prefixSuffix = isLegacyFloor ? '' : `${floor.name.replace(/\s/g, '')}-`;
      const floorPrefixes = floor.prefixes || DEFAULT_PREFIXES;
      const floorCaps = floor.capacities || DEFAULT_CAPACITIES;

      console.log(`[getAvailableSpot] Revisando ${floor.name} (${floor.id}). Prefijo: ${prefixSuffix}. Caps:`, floorCaps);

      if (requiresCharging) {
        for (let i = 1; i <= floorCaps.EV_CHARGING; i++) {
          const spot = `${prefixSuffix}${floorPrefixes.EV_CHARGING}-${i.toString().padStart(3, '0')}`;
          if (!usedSpots.has(spot)) return { spot, floorId: floor.id };
        }
      } else if (type === VehicleType.MOTORCYCLE) {
        for (let i = 1; i <= floorCaps.MOTO; i++) {
          const spot = `${prefixSuffix}${floorPrefixes.MOTO}-${i.toString().padStart(3, '0')}`;
          if (!usedSpots.has(spot)) return { spot, floorId: floor.id };
        }
      } else {
        if (isPriority) {
          // Check Priority Spots
          for (let i = 1; i <= floorCaps.PRIORITY_CAR; i++) {
            const spot = `${prefixSuffix}${floorPrefixes.PRIORITY_CAR}-${i.toString().padStart(3, '0')}`;
            if (!usedSpots.has(spot)) return { spot, floorId: floor.id };
          }
          // Fallback to Regular if Priority is full (Optional, but useful for user experience)
          // Actually let's keep it strict or the user might be confused why they were given C-001
        }

        // Check Regular Spots
        for (let i = 1; i <= floorCaps.REGULAR_CAR; i++) {
          const spot = `${prefixSuffix}${floorPrefixes.REGULAR_CAR}-${i.toString().padStart(3, '0')}`;
          if (!usedSpots.has(spot)) return { spot, floorId: floor.id };
        }
      }
    }
    console.warn(`[getAvailableSpot] NO SE ENCONTRÓ PUESTO DISPONIBLE`);
    return null;
  };

  const calculateCost = (entryTime: number, type: VehicleType, isDisabled?: boolean, requiresCharging?: boolean, plate?: string) => {
    const exitTime = Date.now();
    const minutes = Math.ceil((exitTime - entryTime) / 60000);

    let minuteRate = requiresCharging ? rates['EV_CHARGING_RATE'] : (rates[type] || rates[VehicleType.CAR]);
    const fullRateKey = type === VehicleType.MOTORCYCLE ? 'MOTO_FULL' : 'CAR_FULL';
    const fullRateCap = rates[fullRateKey] || 999999;

    let calculatedCost = Math.max(minutes * minuteRate, minuteRate);

    if (calculatedCost > fullRateCap) {
      calculatedCost = fullRateCap;
    }

    let totalCost = calculatedCost;
    const originalCost = totalCost;

    if (isDisabled) {
      const discountPercent = rates['DISABILITY_DISCOUNT_PERCENT'] || 50;
      totalCost = Math.ceil(totalCost * (1 - discountPercent / 100));
    }

    // Apply special rates (overrides/stacks with disability)
    let specialRateLabel: string | undefined;
    const specialRate = plate ? specialRates.find(r => r.plate === plate && r.isActive) : null;

    if (specialRate) {
      const isExpired = specialRate.expirationDate && specialRate.expirationDate < Date.now();

      if (!isExpired) {
        if (specialRate.type === SpecialRateType.MONTHLY) {
          totalCost = 0;
          specialRateLabel = 'Mensualidad Activa';
        } else {
          const discountPercent = specialRate.value;
          totalCost = Math.ceil(totalCost * (1 - discountPercent / 100));
          specialRateLabel = `${specialRate.type}: ${discountPercent}%`;
        }
      } else {
        // Expired - record the label but don't apply the cost benefit? 
        // User said: "informar en el panel de entrada que no la tiene y que tiene que renovar, dado el caso de que la mensualidad expire se le cobrara normal"
        // So here we should probably NOT set specialRateLabel to 'Active' but maybe just return undefined for the label so it functions as normal.
        // Actually, returning it as undefined is safer for cost calculation.
      }
    }

    return {
      cost: totalCost,
      originalCost: (isDisabled || specialRate) ? originalCost : undefined,
      minutes,
      exitTime,
      specialRateLabel,
      specialRate: specialRate || undefined
    };
  };

  // Handlers
  const handleProcessEntry = (
    plate: string,
    vehicleType: VehicleType,
    ownerId: string,
    imageData: string | null,
    isAccessibility: boolean,
    requiresCharging: boolean = false
  ): { record: ParkingRecord | null, error?: string } => {
    const existing = records.find(r => r.plate === plate && r.status === 'ACTIVE');
    if (existing) {
      return { record: null, error: `El vehículo con placa ${plate} ya se encuentra activo en el parqueadero.` };
    }

    const assignment = getAvailableSpot(vehicleType, isAccessibility, requiresCharging);
    if (!assignment) {
      return { record: null, error: `No hay plazas disponibles para ${vehicleType}${requiresCharging ? ' con carga' : ''}.` };
    }

    const newRecord: ParkingRecord = {
      id: crypto.randomUUID(),
      plate: plate,
      ownerId: ownerId,
      vehicleType: vehicleType,
      floorId: assignment.floorId,
      entryTime: Date.now(),
      status: 'ACTIVE',
      imageUrl: imageData || undefined,
      isDisabled: isAccessibility,
      spotNumber: assignment.spot,
      requiresCharging: requiresCharging
    };

    setRecords(prev => [newRecord, ...prev]);
    setAdTrigger(prev => prev + 1);
    return { record: newRecord };
  };

  const handleCancelEntry = (recordId: string) => {
    setRecords(prev => prev.filter(r => r.id !== recordId));
  };

  const handleProcessPayment = (recordId: string, paymentMethod: string, email: string) => {
    setRecords(prev => prev.map(r => {
      if (r.id === recordId) {
        const { cost } = calculateCost(r.entryTime, r.vehicleType, r.isDisabled, r.requiresCharging);
        return {
          ...r,
          paymentStatus: 'PAID',
          paymentMethod: paymentMethod,
          cost: cost,
          exitTime: Date.now()
        };
      }
      return r;
    }));
  };

  const handleRevertPayment = (recordId: string) => {
    setRecords(prev => prev.map(r => {
      if (r.id === recordId) {
        return {
          ...r,
          paymentStatus: 'PENDING',
          paymentMethod: undefined,
          exitTime: undefined
        };
      }
      return r;
    }));
  };

  const handleProcessExit = (plate: string) => {
    setRecords(prev => prev.map(r => {
      if (r.plate === plate && r.status === 'ACTIVE') {
        return {
          ...r,
          exitTime: Date.now(),
          status: 'COMPLETED'
        };
      }
      return r;
    }));
  };

  const handleRateUpdate = (newRates: Record<string, number>) => {
    setRates(newRates);
  };

  const handleFloorsUpdate = (newFloors: Floor[]) => {
    setFloors(newFloors);
  };

  const handleAddAdvertisement = (ad: string) => {
    setAdvertisements(prev => [...prev, ad]);
  };

  const handleRemoveAdvertisement = (index: number) => {
    setAdvertisements(prev => prev.filter((_, i) => i !== index));
  };

  const handleClientLogoUpdate = (logo: string | null) => {
    setClientLogo(logo);
  };

  const handleSpecialRatesUpdate = (newRates: SpecialRate[]) => {
    setSpecialRates(newRates);
  };

  const handleManualExit = (id: string) => {
    const record = records.find(r => r.id === id);
    if (record && record.status === 'ACTIVE') {
      const { cost, exitTime } = calculateCost(record.entryTime, record.vehicleType, record.isDisabled);
      setRecords(prev => prev.map(r => {
        if (r.id === id) {
          return {
            ...r,
            exitTime: exitTime,
            status: 'COMPLETED',
            cost: cost,
            paymentStatus: 'PAID',
            paymentMethod: 'Manual - Admin'
          };
        }
        return r;
      }));
      setAdTrigger(prev => prev + 1);
    }
  };

  const handleInspection = async (id: string) => {
    const record = records.find(r => r.id === id);
    if (record && record.imageUrl) {
      const details = await inspectVehicle(record.imageUrl);
      setRecords(prev => prev.map(r => {
        if (r.id === id) {
          return { ...r, details };
        }
        return r;
      }));
    }
  };

  const handleAdminLogin = (username: string, password: string): boolean => {
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
      setIsAdminAuthenticated(true);
      sessionStorage.setItem('adminAuth', 'true');
      return true;
    }
    return false;
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    sessionStorage.removeItem('adminAuth');
    navigate('/');
  };

  return (
    <Routes>
      {/* Main Route - Search/Payment Gateway for Users */}
      <Route path="/" element={
        <SearchView
          records={records}
          capacities={totalCapacities}
          rates={rates}
          onProcessPayment={handleProcessPayment}
          calculateCost={calculateCost}
          onBackToSelector={() => navigate('/')}
          floors={floors}
          clientLogo={clientLogo}
        />
      } />

      {/* Entry Route */}
      <Route path="/entrada" element={
        <EntryView
          records={records}
          capacities={totalCapacities}
          onProcessEntry={handleProcessEntry}
          onBackToSelector={() => navigate('/')}
          advertisements={advertisements}
          adTrigger={adTrigger}
          onCancelEntry={handleCancelEntry}
          clientLogo={clientLogo}
          specialRates={specialRates}
          floors={floors}
        />
      } />

      {/* Exit Route */}
      <Route path="/salida" element={
        <ExitView
          records={records}
          onProcessExit={handleProcessExit}
          calculateCost={calculateCost}
          onBackToSelector={() => navigate('/')}
          advertisements={advertisements}
          adTrigger={adTrigger}
          gracePeriod={rates['GRACE_PERIOD_MINUTES'] || 15}
          onRevertPayment={handleRevertPayment}
          clientLogo={clientLogo}
        />
      } />

      {/* Search Route */}
      <Route path="/buscar" element={
        <SearchView
          records={records}
          capacities={totalCapacities}
          rates={rates}
          onProcessPayment={handleProcessPayment}
          calculateCost={calculateCost}
          onBackToSelector={() => navigate('/')}
          floors={floors}
          clientLogo={clientLogo}
        />
      } />

      {/* Admin Login Route */}
      <Route path="/admin" element={
        isAdminAuthenticated ? (
          <Navigate to="/admin/dashboard" replace />
        ) : (
          <AdminLogin onLogin={handleAdminLogin} />
        )
      } />

      {/* Protected Admin Dashboard Route */}
      <Route path="/admin/dashboard" element={
        <ProtectedRoute isAuthenticated={isAdminAuthenticated}>
          <AdminView
            records={records}
            rates={rates}
            capacities={totalCapacities}
            floors={floors}
            advertisements={advertisements}
            onRateUpdate={handleRateUpdate}
            onFloorsUpdate={handleFloorsUpdate}
            onAddAdvertisement={handleAddAdvertisement}
            onRemoveAdvertisement={handleRemoveAdvertisement}
            onManualExit={handleManualExit}
            onInspection={handleInspection}
            onBackToSelector={handleAdminLogout}
            clientLogo={clientLogo}
            onUpdateClientLogo={handleClientLogoUpdate}
            specialRates={specialRates}
            onSpecialRatesUpdate={handleSpecialRatesUpdate}
          />
        </ProtectedRoute>
      } />

      {/* Hidden Device Selector Route (for internal use) */}
      <Route path="/selector" element={
        <DeviceSelector
          onSelectDevice={(device) => {
            if (device === 'ENTRY') navigate('/entrada');
            else if (device === 'EXIT') navigate('/salida');
            else if (device === 'SEARCH') navigate('/buscar');
          }}
        />
      } />

      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    // HashRouter es necesario para GitHub Pages (rutas como /#/admin funcionan sin servidor)
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
};

export default App;