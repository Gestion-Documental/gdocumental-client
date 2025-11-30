

import React, { useState, useEffect, useRef } from 'react';
import { MOCK_CONTACTS, Contact } from '../services/mockData';

interface ContactSelectorProps {
  value: string;
  onChange: (val: string) => void;
  onSelect: (contact: Contact) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

const ContactSelector: React.FC<ContactSelectorProps> = ({ 
  value, 
  onChange, 
  onSelect, 
  placeholder = "Escriba o Seleccione...", 
  disabled = false,
  label = "Nombre Entidad / Empresa",
  onKeyDown
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Filter contacts
  const filteredContacts = MOCK_CONTACTS.filter(c => 
      c.entityName.toLowerCase().includes((value || '').toLowerCase())
  );

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

  const handleSelect = (contact: Contact) => {
      onChange(contact.entityName);
      onSelect(contact);
      setShowSuggestions(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
      setShowSuggestions(true);
  };

  return (
    <div className="relative" ref={wrapperRef}>
        <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">{label}</label>
        <div className="relative">
            <input 
                disabled={disabled} 
                type="text" 
                value={value} 
                onChange={handleChange}
                onKeyDown={onKeyDown}
                onFocus={() => !disabled && setShowSuggestions(true)}
                placeholder={placeholder}
                maxLength={5000}
                className="w-full p-2 pr-10 border border-slate-200 rounded bg-slate-50 text-sm focus:bg-white focus:border-blue-400 outline-none disabled:bg-slate-100 disabled:text-slate-500 font-semibold transition-all shadow-sm focus:shadow-md" 
            />
            {/* Chevron Icon */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg className={`w-4 h-4 transition-transform ${showSuggestions ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
        </div>
        
        {showSuggestions && !disabled && (
            <div className="absolute top-full left-0 w-full bg-white border border-slate-200 rounded-lg shadow-xl z-50 mt-1 max-h-60 overflow-y-auto animate-fade-in">
                {filteredContacts.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-slate-400 italic">No se encontraron coincidencias.</div>
                ) : (
                    <>
                        <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Sugeridos del Directorio
                        </div>
                        {filteredContacts.map(contact => (
                            <button
                                key={contact.id}
                                onClick={() => handleSelect(contact)}
                                className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors flex flex-col border-b border-slate-50 last:border-none group"
                            >
                                <span className="text-sm font-bold text-slate-800 group-hover:text-blue-700">{contact.entityName}</span>
                                <span className="text-xs text-slate-500 group-hover:text-blue-600/70">{contact.attention} - {contact.position}</span>
                            </button>
                        ))}
                    </>
                )}
            </div>
        )}
    </div>
  );
};

export default ContactSelector;
