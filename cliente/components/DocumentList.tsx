

import React, { useState, useMemo } from 'react';
import { Document, DocumentStatus, DocumentType, DateRangeOption, SeriesType, UserRole } from '../types';
import SearchToolbar from './SearchToolbar';
import { getArchivePath, getSeriesName } from '../services/mockData';

interface DocumentListProps {
  documents: Document[];
  userRole: UserRole;
  attentionFilter?: boolean;
  onClearAttentionFilter?: () => void;
  isTransferView?: boolean; // New Prop: Enable Transfer Mode
  onOpenFinalizeModal: (doc: Document) => void;
  onViewThread: (doc: Document) => void;
  onReply: (doc: Document) => void;
  onEdit: (doc: Document) => void;
  onViewDossier: (doc: Document) => void; 
  onVoid: (doc: Document) => void;
  onTransferBatch?: (docIds: string[]) => void; // New Handler
  onCloseTransferView?: () => void; // New Handler
}

type TabOption = 'ALL' | 'APPROVALS';

const DocumentList: React.FC<DocumentListProps> = ({ 
    documents, userRole, attentionFilter = false, onClearAttentionFilter,
    isTransferView = false,
    onOpenFinalizeModal, onViewThread, onReply, onEdit, onViewDossier, onVoid,
    onTransferBatch, onCloseTransferView
}) => {
  const [activeTab, setActiveTab] = useState<TabOption>('ALL');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<DocumentType | 'ALL'>('ALL');
  const [filterStatus, setFilterStatus] = useState<DocumentStatus | 'ALL'>('ALL');
  const [filterSeries, setFilterSeries] = useState<SeriesType | 'ALL'>('ALL');
  const [dateRange, setDateRange] = useState<DateRangeOption>('ALL');

  const pendingCount = documents.filter(d => d.status === DocumentStatus.PENDING_APPROVAL).length;

  const getStatusColor = (status: DocumentStatus) => {
    switch (status) {
      case DocumentStatus.RADICADO: return 'bg-green-100 text-green-800 border-green-200';
      case DocumentStatus.PENDING_SCAN: return 'bg-orange-100 text-orange-800 border-orange-200'; 
      case DocumentStatus.DRAFT: return 'bg-slate-100 text-slate-700 border-slate-200 dashed border';
      case DocumentStatus.PENDING_APPROVAL: return 'bg-yellow-50 text-yellow-800 border-yellow-200';
      case DocumentStatus.ARCHIVED: return 'bg-slate-100 text-slate-600 border-slate-200';
      case DocumentStatus.VOID: return 'bg-red-50 text-red-700 border-red-200 line-through decoration-red-400';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: DocumentType) => {
    switch (type) {
      case DocumentType.INBOUND: return (
        <svg className="w-4 h-4 text-orange-500 rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
      );
      case DocumentType.OUTBOUND: return (
        <svg className="w-4 h-4 text-blue-500 rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
      );
      default: return (
        <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
      );
    }
  };

  const renderDeadlineBadge = (doc: Document) => {
    if (doc.status === DocumentStatus.VOID) return <span className="text-[10px] text-red-300">VOID</span>;
    if (!doc.requiresResponse) return <span className="text-[10px] text-slate-400">No Action</span>;
    if (doc.isCompleted) return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            Done
        </span>
    );
    if (!doc.deadline) return <span className="text-[10px] text-slate-400">--</span>;

    const now = new Date();
    const deadline = new Date(doc.deadline);
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded border border-red-200">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                {Math.abs(diffDays)}d Overdue
            </span>
        );
    } else if (diffDays <= 3) {
        return (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded border border-orange-200">
                 <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                {diffDays}d Left
            </span>
        );
    } else {
        return (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                {new Date(doc.deadline).toLocaleDateString()}
            </span>
        );
    }
  };

  const renderObservationTags = (doc: Document) => {
      if (doc.status === DocumentStatus.VOID) {
          return (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-50 text-red-600 border border-red-100 text-[10px] font-bold uppercase">
                  🚫 Anulado
              </span>
          );
      }
      
      const tags = [];
      
      if (doc.type === DocumentType.OUTBOUND && doc.status === DocumentStatus.RADICADO && doc.deliveryStatus !== 'DELIVERED') {
          tags.push(
              <span key="transit" className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-100 text-[10px] font-medium">
                  🛵 En Ruta
              </span>
          );
      }
      
      if (doc.requiresResponse && !doc.isCompleted) {
           tags.push(
              <span key="waiting" className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 text-[10px] font-medium">
                  ⏳ Esperando Respuesta
              </span>
          );
      }

      if (tags.length === 0) return <span className="text-[10px] text-slate-300">-</span>;
      
      return <div className="flex flex-col gap-1 items-start">{tags}</div>;
  };

  // --- FILTER LOGIC ---
  const filteredDocs = useMemo(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    return documents.filter(doc => {
      // 0. Transfer View Logic
      if (isTransferView) {
          // Show ONLY docs ready for transfer
          if (doc.status !== DocumentStatus.RADICADO) return false;
          if (doc.physicalLocationId === 'loc-central') return false; // Already centralized
          if (!doc.metadata.transferDate) return false;
          if (new Date(doc.metadata.transferDate) >= new Date()) return false; // Not expired yet
      }

      // 0.5 Attention filter (overdue or <=3 days, require response, not completed)
      if (!isTransferView && attentionFilter) {
          const requires = doc.requiresResponse && !doc.isCompleted;
          if (!requires || !doc.deadline) return false;
          const deadline = new Date(doc.deadline).getTime();
          const diffDays = Math.ceil((deadline - now) / oneDay);
          const isOverdue = diffDays < 0;
          const isUrgent = diffDays >= 0 && diffDays <= 3;
          if (!(isOverdue || isUrgent)) return false;
      }

      // 1. Tab Filter (Only if not transfer view)
      if (!isTransferView && activeTab === 'APPROVALS') {
          if (doc.status !== DocumentStatus.PENDING_APPROVAL) return false;
      }

      // 2. Series Filter
      if (filterSeries !== 'ALL' && doc.series !== filterSeries) return false;

      // 3. Type Filter
      if (filterType !== 'ALL' && doc.type !== filterType) return false;

      // 4. Status Filter
      if (filterStatus !== 'ALL' && doc.status !== filterStatus) return false;

      // 5. Date Range Filter
      if (dateRange !== 'ALL') {
          const created = new Date(doc.createdAt).getTime();
          const now = Date.now();
          const oneDay = 24 * 60 * 60 * 1000;
          if (dateRange === '7D' && (now - created) > (7 * oneDay)) return false;
          if (dateRange === '30D' && (now - created) > (30 * oneDay)) return false;
      }

      // 6. Text Search (Matches Title, Radicado, Recipient, Sender)
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const radicado = (doc.radicadoCode || '').toLowerCase();
        const title = doc.title.toLowerCase();
        const recipient = (doc.metadata?.recipientName || doc.metadata?.recipient || '').toLowerCase();
        const sender = (doc.metadata?.sender || '').toLowerCase();
        
        return title.includes(q) || radicado.includes(q) || recipient.includes(q) || sender.includes(q);
      }

      return true;
    });
  }, [documents, activeTab, filterType, filterStatus, filterSeries, dateRange, searchQuery, isTransferView]);

  const handleVoidClick = (doc: Document) => {
      if (doc.status === DocumentStatus.VOID) return;
      const reason = window.prompt("⚠️ CAUSA DE ANULACIÓN (ISO 9001:2015)\n\nPor favor describa el motivo por el cual se anula este documento oficial:");
      if (reason) {
          onVoid(doc);
      }
  };

  const handleExportFUID = () => {
      // AGN Colombia FUID Columns
      const headers = [
          "No. Orden",
          "Codigo Serie",
          "Nombre Serie / Subserie",
          "Titulo / Asunto",
          "Fechas Extremas",
          "Unidad Conservacion",
          "Soporte",
          "Notas"
      ];

      const rows = filteredDocs.map((doc, idx) => {
          const path = getArchivePath(doc.physicalLocationId);
          const box = path.find(p => p.type === 'BOX')?.name || "Sin Caja";
          const support = doc.receptionMedium?.includes('DIGITAL') ? "Electronico" : "Papel";
          const seriesName = getSeriesName(doc.metadata.trdCode);

          return [
              idx + 1,
              doc.metadata.trdCode || "S/C",
              `"${seriesName}"`,
              `"${doc.title.replace(/"/g, '""')}"`,
              new Date(doc.createdAt).toISOString().slice(0,10), // Simplified dates
              box,
              support,
              ""
          ].join(",");
      });

      const csvContent = "\uFEFF" + headers.join(",") + "\n" + rows.join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `FUID_Transferencia_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleBatchTransfer = () => {
      if (onTransferBatch) {
          const ids = filteredDocs.map(d => d.id);
          if (ids.length === 0) return;
          if (window.confirm(`¿Está seguro de transferir ${ids.length} expedientes al Archivo Central? Se generará el Acta de Transferencia.`)) {
              onTransferBatch(ids);
          }
      }
  };

  const outboundHighlights = documents
    .filter(d => d.type === DocumentType.OUTBOUND)
    .slice(0, 4);
  const inboundHighlights = documents
    .filter(d => d.type === DocumentType.INBOUND)
    .slice(0, 4);

  return (
    <div className="flex flex-col gap-4" id="document-list-anchor">
        
        {/* Standard Tabs or Transfer Header */}
        {isTransferView ? (
            <div className="bg-purple-50 border-b border-purple-200 px-4 py-3 rounded-t-xl flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-purple-900 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                        Gestión de Transferencias Documentales
                    </h3>
                    <p className="text-xs text-purple-700">Documentos que han cumplido su tiempo de retención en gestión.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleExportFUID} className="text-xs bg-white border border-purple-300 text-purple-700 px-3 py-1.5 rounded hover:bg-purple-100 font-medium shadow-sm">
                        📊 Exportar FUID (Excel)
                    </button>
                    <button onClick={handleBatchTransfer} className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded hover:bg-purple-700 font-bold shadow-sm flex items-center gap-1">
                        🚛 Realizar Transferencia Primaria
                    </button>
                    <button onClick={onCloseTransferView} className="text-xs text-slate-500 hover:text-slate-800 px-2">
                        ✕ Cerrar
                    </button>
                </div>
            </div>
        ) : (
            <div className="border-b border-slate-200 flex gap-6">
                <button 
                onClick={() => setActiveTab('ALL')}
                className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === 'ALL' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                >
                    All Documents
                </button>
                <button 
                onClick={() => setActiveTab('APPROVALS')}
                className={`pb-3 text-sm font-medium transition-colors relative flex items-center gap-2 ${activeTab === 'APPROVALS' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                >
                    Pending Approval
                    {pendingCount > 0 && (
                        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                            {pendingCount}
                        </span>
                    )}
                </button>
            </div>
        )}

        {attentionFilter && !isTransferView && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-lg shadow-sm">
            <span className="text-sm font-semibold">Modo Atención: mostrando urgentes y vencidos</span>
            <button 
              onClick={() => onClearAttentionFilter?.()}
              className="text-xs font-bold bg-white text-red-700 border border-red-200 px-3 py-1 rounded hover:bg-red-100"
            >
              Ver todos
            </button>
          </div>
        )}

        {!isTransferView && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Comunicaciones Enviadas</h4>
                <span className="text-[11px] text-slate-400">Últimas {outboundHighlights.length}</span>
              </div>
              {outboundHighlights.length === 0 ? (
                <p className="text-sm text-slate-400">Sin envíos registrados.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {outboundHighlights.map(doc => (
                    <div key={doc.id} className="flex items-start gap-3 text-sm">
                      <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[11px] font-bold text-blue-700 shrink-0">
                        {(doc.metadata?.sender || doc.author || 'SY').slice(0,2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span className="font-mono text-slate-600">{doc.radicadoCode || 'BORRADOR'}</span>
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">{doc.series}</span>
                        </div>
                        <p className="text-slate-800 font-semibold truncate">{doc.title}</p>
                        <p className="text-xs text-slate-500 truncate">Para: {doc.metadata?.recipientName || doc.metadata?.recipient || 'No especificado'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Comunicaciones Recibidas</h4>
                <span className="text-[11px] text-slate-400">Últimas {inboundHighlights.length}</span>
              </div>
              {inboundHighlights.length === 0 ? (
                <p className="text-sm text-slate-400">Sin ingresos registrados.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {inboundHighlights.map(doc => (
                    <div key={doc.id} className="flex items-start gap-3 text-sm">
                      <div className="w-10 h-10 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center text-[11px] font-bold text-orange-700 shrink-0">
                        {(doc.metadata?.sender || 'IN').slice(0,2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span className="font-mono text-slate-600">{doc.radicadoCode || 'BORRADOR'}</span>
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">{doc.series}</span>
                        </div>
                        <p className="text-slate-800 font-semibold truncate">{doc.title}</p>
                        <p className="text-xs text-slate-500 truncate">De: {doc.metadata?.sender || 'Remitente no definido'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <SearchToolbar 
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filterType={filterType}
          onTypeChange={setFilterType}
          filterStatus={filterStatus}
          onStatusChange={setFilterStatus}
          filterSeries={filterSeries}
          onSeriesChange={setFilterSeries}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {filteredDocs.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-64 bg-slate-50/50">
                    <p className="text-slate-400 font-medium">No documents found matching criteria.</p>
                 </div>
            ) : (
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold">
                    <tr>
                        <th className="px-6 py-4">Radicado / ID</th>
                        <th className="px-6 py-4">Remitente / Destinatario</th>
                        <th className="px-6 py-4">Detalle / Asunto</th>
                        <th className="px-6 py-4">Estado</th>
                        {isTransferView ? (
                            <th className="px-6 py-4 text-purple-700">Retención</th>
                        ) : (
                            <th className="px-6 py-4">Observaciones</th>
                        )}
                        <th className="px-6 py-4 text-right">Acciones</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                    {filteredDocs.map((doc) => {
                        const isVoid = doc.status === DocumentStatus.VOID;
                        
                        // Parties
                        const authorName = doc.author || doc.metadata?.sender || 'Sistema';
                        const recipientName = doc.metadata?.recipientName || doc.metadata?.recipient || '—';
                        const authorInitials = authorName
                          ? authorName.split(' ').map((n: string) => n[0]).join('').substring(0,2).toUpperCase()
                          : 'SY';

                        return (
                        <tr key={doc.id} className={`hover:bg-slate-50 transition-colors group ${isVoid ? 'bg-slate-50 opacity-60' : ''}`}>
                        <td className="px-6 py-4 font-mono text-slate-900 font-medium align-top">
                            <div className="flex flex-col gap-1 items-start">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${doc.series === 'TEC' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
                                    {doc.series}
                                </span>
                                {doc.radicadoCode ? (
                                    <span className={`px-2 py-1 rounded border w-fit ${isVoid ? 'bg-red-50 border-red-200 text-red-500 line-through' : 'bg-slate-100 border-slate-200'}`}>
                                    {doc.radicadoCode}
                                    </span>
                                ) : (
                                    <span className="text-slate-400 italic">-- BORRADOR --</span>
                                )}
                            </div>
                        </td>
                        <td className="px-6 py-4 align-top">
                             <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center text-xs font-bold border border-blue-100 shadow-sm shrink-0" title={`Elaborado por: ${authorName}`}>
                                    {authorInitials}
                                </div>
                                <div className="flex flex-col text-xs text-slate-500">
                                    <span className="font-semibold text-slate-800 truncate max-w-[140px]" title={authorName}>
                                        {authorName}
                                    </span>
                                    <span className="text-[11px] text-slate-400 uppercase tracking-wide">→ {recipientName}</span>
                                </div>
                            </div>
                        </td>
                        <td className="px-6 py-4 align-top">
                            <div className="flex items-center gap-2 mb-1">
                            <div className={`p-1 rounded-full bg-slate-50 border border-slate-100`}>
                                {getTypeIcon(doc.type)}
                            </div>
                            <span className="font-medium text-slate-700 text-xs">{doc.type}</span>
                            </div>
                            <div className={`font-medium text-slate-900 ${isVoid ? 'line-through decoration-slate-400' : ''}`}>{doc.title}</div>
                            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                                <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                                {doc.metadata?.destination && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                    {doc.metadata.destination}
                                  </span>
                                )}
                            </div>
                        </td>
                        <td className="px-6 py-4 align-top">
                            <div className="flex flex-col gap-2 items-start">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${getStatusColor(doc.status)}`}>
                                {doc.status.replace('_', ' ')}
                                </span>
                                {renderDeadlineBadge(doc)}
                            </div>
                        </td>
                        <td className="px-6 py-4 align-top">
                            {isTransferView ? (
                                <div className="text-xs text-purple-700 bg-purple-50 border border-purple-100 p-2 rounded">
                                    <p className="font-bold">Venció: {doc.metadata.transferDate}</p>
                                    <p className="text-[10px]">TRD: {doc.metadata.trdCode}</p>
                                </div>
                            ) : (
                                renderObservationTags(doc)
                            )}
                        </td>
                        <td className="px-6 py-4 text-right align-top">
                            <div className="flex items-center justify-end gap-2">
                                
                                {(doc.status === DocumentStatus.RADICADO || doc.status === DocumentStatus.ARCHIVED || doc.status === DocumentStatus.VOID) && (
                                    <button
                                        onClick={() => onViewDossier(doc)}
                                        className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"
                                        title="Ver Expediente"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    </button>
                                )}

                                {userRole === 'DIRECTOR' && (doc.status === DocumentStatus.RADICADO || doc.status === DocumentStatus.ARCHIVED) && (
                                    <button
                                        onClick={() => handleVoidClick(doc)}
                                        className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                        title="🚫 ANULAR DOCUMENTO"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                    </button>
                                )}

                                {doc.status === DocumentStatus.RADICADO && doc.type !== DocumentType.OUTBOUND && (
                                <button
                                    onClick={() => onReply(doc)}
                                    className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                                    title="Reply"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                                </button>
                                )}

                                <button 
                                onClick={() => onViewThread(doc)}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                title="Traceability"
                                >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                </button>
                                
                                {doc.status === DocumentStatus.DRAFT && (
                                    <button
                                        onClick={() => onEdit(doc)}
                                        className="text-xs bg-slate-800 hover:bg-slate-900 text-white font-medium px-3 py-1.5 rounded transition-colors flex items-center gap-2"
                                    >
                                        Edit
                                    </button>
                                )}

                                {doc.status === DocumentStatus.PENDING_APPROVAL && userRole === 'DIRECTOR' && (
                                    <button
                                        onClick={() => onEdit(doc)}
                                        className="text-xs bg-yellow-500 hover:bg-yellow-600 text-white font-medium px-3 py-1.5 rounded transition-colors flex items-center gap-2 shadow-sm"
                                    >
                                        Review
                                    </button>
                                )}

                                {/* Solo Director puede radicar/finalizar; ocultar botones si no procede */}
                                {userRole === 'DIRECTOR' && doc.status === DocumentStatus.DRAFT && (
                                    <button
                                        onClick={() => onOpenFinalizeModal(doc)}
                                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 py-1.5 rounded transition-colors flex items-center gap-2"
                                    >
                                        Radicar
                                    </button>
                                )}
                            </div>
                        </td>
                        </tr>
                    )})}
                    </tbody>
                </table>
            )}
        </div>
    </div>
  );
};

export default DocumentList;
