
import React from 'react';
import { DocumentType, DocumentStatus, DateRangeOption, SeriesType } from '../types';

interface SearchToolbarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  filterType: DocumentType | 'ALL';
  onTypeChange: (val: DocumentType | 'ALL') => void;
  filterStatus: DocumentStatus | 'ALL';
  onStatusChange: (val: DocumentStatus | 'ALL') => void;
  filterSeries: SeriesType | 'ALL'; // New Prop
  onSeriesChange: (val: SeriesType | 'ALL') => void; // New Prop
  dateRange: DateRangeOption;
  onDateRangeChange: (val: DateRangeOption) => void;
}

const SearchToolbar: React.FC<SearchToolbarProps> = ({
  searchQuery, onSearchChange,
  filterType, onTypeChange,
  filterStatus, onStatusChange,
  filterSeries, onSeriesChange,
  dateRange, onDateRangeChange
}) => {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col lg:flex-row gap-4 mb-4 animate-fade-in">
      
      <div className="flex-1 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
          placeholder="Buscar por Asunto, Radicado, Destinatario..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
        
        {/* Series Filter (New) */}
        <select
          value={filterSeries}
          onChange={(e) => onSeriesChange(e.target.value as SeriesType | 'ALL')}
          className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none cursor-pointer hover:bg-slate-50 font-medium"
        >
          <option value="ALL">Todas las Series</option>
          <option value="ADM">🏢 Administrativa</option>
          <option value="TEC">👷 Técnica</option>
        </select>

        <select
          value={filterType}
          onChange={(e) => onTypeChange(e.target.value as DocumentType | 'ALL')}
          className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none cursor-pointer hover:bg-slate-50"
        >
          <option value="ALL">Todos los Tipos</option>
          <option value={DocumentType.INBOUND}>Entrada (Inbound)</option>
          <option value={DocumentType.OUTBOUND}>Salida (Outbound)</option>
          <option value={DocumentType.INTERNAL}>Interno (Memo)</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => onStatusChange(e.target.value as DocumentStatus | 'ALL')}
          className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none cursor-pointer hover:bg-slate-50"
        >
          <option value="ALL">Todos los Estados</option>
          <option value={DocumentStatus.RADICADO}>Radicados</option>
          <option value={DocumentStatus.DRAFT}>Borradores</option>
          <option value={DocumentStatus.PENDING_APPROVAL}>Por Aprobar</option>
          <option value={DocumentStatus.PENDING_SCAN}>Por Escanear</option>
          <option value={DocumentStatus.ARCHIVED}>Archivados</option>
          <option value={DocumentStatus.VOID}>Anulados</option>
        </select>

        <select
          value={dateRange}
          onChange={(e) => onDateRangeChange(e.target.value as DateRangeOption)}
          className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none cursor-pointer hover:bg-slate-50"
        >
          <option value="ALL">Cualquier Fecha</option>
          <option value="7D">Últimos 7 días</option>
          <option value="30D">Último Mes</option>
        </select>

      </div>
    </div>
  );
};

export default SearchToolbar;
