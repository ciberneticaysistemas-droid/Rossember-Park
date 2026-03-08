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
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '@', '.', '-'] // Added email chars
  ];

  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-slate-900 p-2 pb-6 shadow-[0_-4px_20px_rgba(0,0,0,0.3)] transition-transform duration-300 ${zIndex}`}>
      <div className="flex justify-end mb-2 px-2">
        <button 
          onClick={onClose}
          className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-1 rounded-lg text-sm font-bold flex items-center gap-2"
        >
          <X size={16} /> Ocultar Teclado
        </button>
      </div>
      
      <div className="max-w-4xl mx-auto flex flex-col gap-2 select-none">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex justify-center gap-1.5">
            {row.map((key) => (
              <button
                key={key}
                onClick={(e) => {
                  e.preventDefault();
                  onKeyPress(key);
                }}
                className="flex-1 max-w-[45px] h-12 bg-slate-100 hover:bg-white active:bg-blue-100 rounded-lg text-slate-900 font-bold text-lg shadow-sm border-b-2 border-slate-300 active:border-b-0 active:translate-y-[2px] transition-all flex items-center justify-center"
              >
                {key}
              </button>
            ))}
          </div>
        ))}
        
        {/* Space and Backspace Row */}
        <div className="flex justify-center gap-1.5 mt-1">
          <button
            onClick={(e) => {
              e.preventDefault();
              onKeyPress(' ');
            }}
            className="flex-[4] max-w-[300px] h-12 bg-slate-100 hover:bg-white active:bg-blue-100 rounded-lg text-slate-900 font-bold text-sm shadow-sm border-b-2 border-slate-300 active:border-b-0 active:translate-y-[2px] transition-all flex items-center justify-center"
          >
            ESPACIO
          </button>
          
          <button
            onClick={(e) => {
              e.preventDefault();
              onBackspace();
            }}
            className="flex-[1] max-w-[80px] h-12 bg-red-100 hover:bg-red-50 active:bg-red-200 rounded-lg text-red-600 font-bold shadow-sm border-b-2 border-red-200 active:border-b-0 active:translate-y-[2px] transition-all flex items-center justify-center"
          >
            <Delete size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};