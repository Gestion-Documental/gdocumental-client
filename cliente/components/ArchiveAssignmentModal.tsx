
import React, { useState } from 'react';
import { MOCK_ARCHIVE_LOCATIONS, getArchivePath } from '../services/mockData';
import { ArchiveType, ArchiveLocation } from '../types';

interface ArchiveAssignmentModalProps {
  onClose: () => void;
  onConfirm: (locationId: string) => void;
}

const ArchiveAssignmentModal: React.FC<ArchiveAssignmentModalProps> = ({ onClose, onConfirm }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<ArchiveLocation | null>(null);

  // Flattened searchable list of final containers (Boxes/Binders)
  const containers = MOCK_ARCHIVE_LOCATIONS.filter(l => 
      (l.type === ArchiveType.BOX || l.type === ArchiveType.BINDER) &&
      l.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[80vh]">
        
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                📦 Asignar Ubicación Física
            </h3>
            <p className="text-xs text-slate-500">Seleccione el contenedor donde se archivará el original.</p>
        </div>

        <div className="p-4 border-b border-slate-100">
            <input 
                type="text" 
                placeholder="Buscar caja (ej: 2023-A)..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                autoFocus
            />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {containers.map(loc => {
                const path = getArchivePath(loc.parentId);
                const pathStr = path.map(p => p.name).join(' > ');
                
                return (
                    <div 
                        key={loc.id}
                        onClick={() => setSelectedLocation(loc)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between
                            ${selectedLocation?.id === loc.id 
                                ? 'bg-amber-50 border-amber-400 shadow-sm' 
                                : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50'}
                        `}
                    >
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-lg">{loc.type === ArchiveType.BOX ? '📦' : '📒'}</span>
                                <span className="font-bold text-slate-800 text-sm">{loc.name}</span>
                            </div>
                            <p className="text-[10px] text-slate-500 ml-7">{pathStr}</p>
                        </div>
                        {selectedLocation?.id === loc.id && (
                            <div className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs">✓</div>
                        )}
                    </div>
                );
            })}
            {containers.length === 0 && (
                <p className="text-center text-slate-400 text-sm py-4">No se encontraron contenedores.</p>
            )}
        </div>

        <div className="p-4 bg-slate-50 flex gap-3 justify-end">
            <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm">Cancelar</button>
            <button 
                disabled={!selectedLocation}
                onClick={() => selectedLocation && onConfirm(selectedLocation.id)}
                className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-md transition-colors"
            >
                Confirmar Ubicación
            </button>
        </div>

      </div>
    </div>
  );
};

export default ArchiveAssignmentModal;
