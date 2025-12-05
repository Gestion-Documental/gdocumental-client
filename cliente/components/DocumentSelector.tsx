
import React, { useState, useEffect, useRef } from 'react';
import { Document } from '../types';

interface DocumentSelectorProps {
  documents: Document[];
  value: string; // Radicado Code
  onChange: (radicado: string) => void;
  onSelect?: (doc: Document) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
}

const DocumentSelector: React.FC<DocumentSelectorProps> = ({ 
  documents,
  value, 
  onChange, 
  onSelect, 
  placeholder = "Buscar por Radicado o Asunto...", 
  disabled = false,
  label = "Responder a Radicado"
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync internal search term with external value if it changes externally
  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  // Filter documents
  const filteredDocs = documents.filter(d => {
      if (!d.radicadoCode) return false;
      const search = searchTerm.toLowerCase();
      return (
          d.radicadoCode.toLowerCase().includes(search) ||
          d.title.toLowerCase().includes(search)
      );
  }).slice(0, 10); // Limit to 10 results

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);

  const handleSelect = (doc: Document) => {
      const val = doc.radicadoCode || '';
      setSearchTerm(val);
      onChange(val);
      if (onSelect) onSelect(doc);
      setShowSuggestions(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setSearchTerm(val);
      onChange(val);
      setShowSuggestions(true);
  };

  return (
    <div className="relative" ref={wrapperRef}>
        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">{label}</label>
        <div className="relative">
            <input 
                disabled={disabled} 
                type="text" 
                value={searchTerm} 
                onChange={handleChange}
                onFocus={() => !disabled && setShowSuggestions(true)}
                placeholder={placeholder}
                className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-sm focus:bg-white focus:border-blue-400 outline-none transition-all"
            />
            {/* Search Icon */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
        </div>
        
        {showSuggestions && !disabled && searchTerm && (
            <div className="absolute top-full left-0 w-full bg-white border border-slate-200 rounded-lg shadow-xl z-50 mt-1 max-h-60 overflow-y-auto animate-fade-in">
                {filteredDocs.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-slate-400 italic">
                            No se encontraron documentos.
                            <p className="text-[10px] mt-1">Puede ingresar el radicado manualmente si no existe en el sistema.</p>
                        </div>
                ) : (
                    <>
                        <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Documentos Encontrados
                        </div>
                        {filteredDocs.map(doc => (
                            <button
                                key={doc.id}
                                onClick={() => handleSelect(doc)}
                                className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors flex flex-col border-b border-slate-50 last:border-none group"
                            >
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold text-slate-800 group-hover:text-blue-700">{doc.radicadoCode}</span>
                                    <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{doc.series}</span>
                                </div>
                                <span className="text-xs text-slate-500 group-hover:text-blue-600/70 truncate">{doc.title}</span>
                            </button>
                        ))}
                    </>
                )}
            </div>
        )}
    </div>
  );
};

export default DocumentSelector;
