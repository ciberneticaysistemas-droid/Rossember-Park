import React from 'react';
import { X, Delete } from 'lucide-react';

interface VirtualKeyboardProps {
  isVisible: boolean;
  onKeyPress: (key: string) => void;
  onClose: () => void;
  onBackspace: () => void;
  zIndex?: string; // Allow custom z-index for modals
}

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({ 
  isVisible, 
  onKeyPress, 
  onClose, 
  onBackspace,
  zIndex = 'z-50'
}) => {
  if (!isVisible) return null;

  const rows = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '@', '.', '-'] 
  ];

  return (
    <div className={`fixed bottom-4 right-4 flex flex-col items-end gap-2 ${zIndex} pointer-events-none`}>
      
      {/* Close Button - Floating */}
      <div className="pointer-events-auto pr-2">
        <button 
          onClick={onClose}
          className="bg-neutral-900/80 hover:bg-neutral-800 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 shadow-lg backdrop-blur-md border border-white/10 transition-all"
        >
          <X size={14} /> Ocultar
        </button>
      </div>
      
      {/* Keyboard Grid - No Background Container */}
      <div className="pointer-events-auto p-2 flex flex-col gap-1.5 select-none">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex justify-end gap-1.5">
            {row.map((key) => (
              <button
                key={key}
                onClick={(e) => {
                  e.preventDefault();
                  onKeyPress(key);
                }}
                className="w-8 h-10 sm:w-10 sm:h-12 md:w-12 md:h-14 bg-neutral-900/90 hover:bg-black text-white rounded-lg font-bold text-sm md:text-lg shadow-md border border-white/10 active:scale-95 active:bg-blue-600 transition-all flex items-center justify-center backdrop-blur-sm"
              >
                {key}
              </button>
            ))}
          </div>
        ))}
        
        {/* Space and Backspace Row */}
        <div className="flex justify-end gap-1.5 mt-0.5">
          <button
            onClick={(e) => {
              e.preventDefault();
              onKeyPress(' ');
            }}
            className="flex-grow max-w-[300px] h-10 sm:h-12 md:h-14 bg-neutral-900/90 hover:bg-black text-white rounded-lg font-bold text-xs md:text-sm shadow-md border border-white/10 active:scale-95 transition-all flex items-center justify-center backdrop-blur-sm"
          >
            ESPACIO
          </button>
          
          <button
            onClick={(e) => {
              e.preventDefault();
              onBackspace();
            }}
            className="w-16 sm:w-20 md:w-24 h-10 sm:h-12 md:h-14 bg-red-600/90 hover:bg-red-500 text-white rounded-lg font-bold shadow-md border border-white/10 active:scale-95 transition-all flex items-center justify-center backdrop-blur-sm"
          >
            <Delete size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};