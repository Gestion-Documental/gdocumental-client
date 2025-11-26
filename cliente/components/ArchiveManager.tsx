
import React, { useState } from 'react';
import { ArchiveLocation, ArchiveType, Document } from '../types';
import { MOCK_ARCHIVE_LOCATIONS, getArchivePath } from '../services/mockData';

interface ArchiveManagerProps {
  documents: Document[];
}

const ArchiveManager: React.FC<ArchiveManagerProps> = ({ documents }) => {
  const [locations, setLocations] = useState<ArchiveLocation[]>(MOCK_ARCHIVE_LOCATIONS);
  const [selectedId, setSelectedId] = useState<string>('loc-1');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['loc-1', 'loc-2', 'loc-3']));

  const selectedLocation = locations.find(l => l.id === selectedId);
  
  // Find contents of selected location
  const contents = documents.filter(d => d.physicalLocationId === selectedId);
  const subLocations = locations.filter(l => l.parentId === selectedId);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const newSet = new Set(expandedIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setExpandedIds(newSet);
  };

  const handleCreateBox = () => {
     const name = prompt("Nombre de la Nueva Caja (ej: Caja RRHH-2025):");
     if (name && selectedLocation) {
         const newBox: ArchiveLocation = {
             id: `loc-${Date.now()}`,
             name: name,
             type: ArchiveType.BOX,
             parentId: selectedLocation.id
         };
         setLocations([...locations, newBox]);
     }
  };

  const getIcon = (type: ArchiveType) => {
      switch (type) {
          case ArchiveType.BUILDING: return '🏢';
          case ArchiveType.ROOM: return '🚪';
          case ArchiveType.SHELF: return '🪜';
          case ArchiveType.BOX: return '📦';
          case ArchiveType.BINDER: return '📒';
          default: return '📍';
      }
  };

  const renderTree = (parentId?: string) => {
      const children = locations.filter(l => l.parentId === parentId);
      if (children.length === 0) return null;

      return (
          <ul className="pl-4 border-l border-slate-200 ml-2">
              {children.map(loc => {
                  const isExpanded = expandedIds.has(loc.id);
                  const isSelected = selectedId === loc.id;
                  const hasChildren = locations.some(l => l.parentId === loc.id);

                  return (
                      <li key={loc.id} className="mt-1">
                          <div 
                            onClick={() => setSelectedId(loc.id)}
                            className={`flex items-center gap-2 cursor-pointer p-1.5 rounded transition-colors text-sm
                                ${isSelected ? 'bg-blue-100 text-blue-800 font-bold' : 'hover:bg-slate-100 text-slate-700'}
                            `}
                          >
                             {hasChildren && (
                                 <button onClick={(e) => toggleExpand(loc.id, e)} className="text-slate-400 hover:text-slate-600">
                                     <svg className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                                 </button>
                             )}
                             <span>{getIcon(loc.type)}</span>
                             <span className="truncate">{loc.name}</span>
                          </div>
                          {isExpanded && renderTree(loc.id)}
                      </li>
                  );
              })}
          </ul>
      );
  };

  const path = getArchivePath(selectedId);

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-slate-50 animate-fade-in">
        
        <div className="flex justify-between items-center mb-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <span className="text-2xl">🗄️</span>
                    Gestor de Archivo Físico
                </h2>
                <p className="text-sm text-slate-500">Topografía y ubicación de documentos originales.</p>
            </div>
            {selectedLocation && (selectedLocation.type === ArchiveType.SHELF || selectedLocation.type === ArchiveType.ROOM) && (
                <button 
                  onClick={handleCreateBox}
                  className="bg-amber-100 hover:bg-amber-200 text-amber-800 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Crear Contenedor
                </button>
            )}
        </div>

        <div className="flex gap-6 flex-1 overflow-hidden">
            
            {/* LEFT: Tree View */}
            <div className="w-80 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                <div className="bg-slate-50 p-4 border-b border-slate-200 font-bold text-slate-600 text-sm">
                    Estructura Jerárquica
                </div>
                <div className="p-4 overflow-y-auto flex-1">
                    {/* Roots */}
                    {locations.filter(l => !l.parentId).map(root => (
                        <div key={root.id}>
                             <div 
                                onClick={() => setSelectedId(root.id)}
                                className={`flex items-center gap-2 cursor-pointer p-2 rounded transition-colors text-sm font-bold
                                    ${selectedId === root.id ? 'bg-blue-100 text-blue-800' : 'hover:bg-slate-100 text-slate-800'}
                                `}
                            >
                                <span>{getIcon(root.type)}</span>
                                <span>{root.name}</span>
                            </div>
                            {expandedIds.has(root.id) && renderTree(root.id)}
                        </div>
                    ))}
                </div>
            </div>

            {/* RIGHT: Content View */}
            <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                
                {/* Breadcrumbs */}
                <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center gap-2 text-sm text-slate-500 overflow-x-auto">
                    {path.map((p, idx) => (
                        <React.Fragment key={p.id}>
                            <span className={idx === path.length - 1 ? "font-bold text-slate-800" : ""}>{p.name}</span>
                            {idx < path.length - 1 && <span>/</span>}
                        </React.Fragment>
                    ))}
                </div>

                <div className="p-6 flex-1 overflow-y-auto">
                    
                    {/* Sub-Locations Grid */}
                    {subLocations.length > 0 && (
                        <div className="mb-8">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Sub-Ubicaciones</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {subLocations.map(sub => (
                                    <div 
                                        key={sub.id} 
                                        onClick={() => setSelectedId(sub.id)}
                                        className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col items-center gap-2 cursor-pointer hover:bg-blue-50 hover:border-blue-300 hover:shadow-md transition-all group"
                                    >
                                        <div className="text-3xl group-hover:scale-110 transition-transform">{getIcon(sub.type)}</div>
                                        <span className="text-sm font-medium text-center text-slate-700">{sub.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Documents List */}
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex justify-between">
                            Documentos en esta ubicación
                            <span className="bg-slate-100 text-slate-600 px-2 rounded-full">{contents.length}</span>
                        </h3>
                        
                        {contents.length === 0 ? (
                            <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-lg">
                                <span className="text-4xl opacity-20 block mb-2">📄</span>
                                <p className="text-slate-400 text-sm">No hay documentos asignados a esta ubicación.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {contents.map(doc => (
                                    <div key={doc.id} className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
                                        <div className={`w-2 h-full py-4 rounded-full ${doc.series === 'TEC' ? 'bg-indigo-500' : 'bg-slate-400'}`}></div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-1.5 rounded">{doc.radicadoCode}</span>
                                                <span className="text-[10px] text-slate-400">{new Date(doc.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-sm font-medium text-slate-800">{doc.title}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>

                {/* Footer Actions (Mock Box Label) */}
                {selectedLocation?.type === ArchiveType.BOX && (
                    <div className="p-4 border-t border-slate-200 bg-amber-50 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                             <div className="w-12 h-12 bg-white p-1 border border-black">
                                 {/* Mock QR */}
                                 <div className="w-full h-full bg-black"></div>
                             </div>
                             <div>
                                 <p className="text-sm font-bold text-amber-900">Rótulo de Caja</p>
                                 <p className="text-xs text-amber-700">Identificador para inventario físico.</p>
                             </div>
                        </div>
                        <button 
                            onClick={() => alert("Imprimiendo rótulo de caja...")}
                            className="bg-white border border-amber-200 hover:bg-amber-100 text-amber-800 px-4 py-2 rounded-lg font-bold text-sm shadow-sm"
                        >
                            🖨️ Imprimir QR
                        </button>
                    </div>
                )}

            </div>

        </div>

    </div>
  );
};

export default ArchiveManager;
