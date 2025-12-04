

import React from 'react';
import { Document, DocumentStatus } from '../types';

interface DashboardStatsProps {
  documents: Document[];
  onShowTransfers?: () => void; // New Handler
  onExportClientCsv?: () => void;
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ documents, onShowTransfers, onExportClientCsv }) => {
  
  // Metric 1: Total Volume
  const totalDocs = documents.length;

  // Metric 2: Bottlenecks (Pending Approval or Pending Scan)
  const pendingCount = documents.filter(d => 
    d.status === DocumentStatus.PENDING_APPROVAL || 
    d.status === DocumentStatus.PENDING_SCAN
  ).length;

  // Metric 3: En Tránsito (Sent but not delivered)
  const transitCount = documents.filter(d => 
      d.status === DocumentStatus.RADICADO && 
      d.deliveryStatus !== 'DELIVERED'
  ).length;

  // Metric 4: Retention Alerts (Ready for Transfer)
  const now = new Date();
  const transferReadyCount = documents.filter(d => {
      if (d.status !== DocumentStatus.RADICADO) return false;
      if (d.physicalLocationId === 'loc-central') return false; // Already transferred
      if (!d.metadata.transferDate) return false;
      return new Date(d.metadata.transferDate) < now;
  }).length;

  const handleExportMasterList = () => {
    // ISO 9001:2015 Compliant Header
    const headers = [
      "Codigo Radicado",
      "Fecha Emision",
      "Serie",
      "Tipo",
      "Asunto / Titulo",
      "Remitente/Destinatario",
      "Estado Actual",
      "Ubicacion Fisica",
      "Disposicion Final (ISO)",
      "Observaciones"
    ];

    const rows = documents.map(doc => {
      const locationName = doc.physicalLocationId ? "Archivo Central (Ver Sistema)" : "Nativo Digital";
      const disposition = "Archivo de Gestión (5 Años)"; // Mock ISO policy
      const party = doc.metadata.recipientName || doc.metadata.sender || "N/A";
      const status = doc.status === DocumentStatus.VOID ? `ANULADO: ${doc.metadata.voidReason}` : doc.status;

      return [
        doc.radicadoCode || "BORRADOR",
        new Date(doc.createdAt).toLocaleDateString(),
        doc.series,
        doc.type,
        `"${doc.title.replace(/"/g, '""')}"`, // Escape quotes
        `"${party.replace(/"/g, '""')}"`,
        status,
        locationName,
        disposition,
        doc.isCompleted ? "Cerrado" : "Abierto"
      ].join(",");
    });

    const csvContent = "\uFEFF" + headers.join(",") + "\n" + rows.join("\n"); // Add BOM for Excel
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Listado_Maestro_ISO_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-4 mb-8">
        
        {/* Header Actions */}
        <div className="flex justify-end animate-fade-in">
             {onExportClientCsv && (
               <button
                  onClick={onExportClientCsv}
                  className="text-xs font-bold text-slate-500 hover:text-green-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-2 transition-colors mr-2"
               >
                  📥 Exportar Excel Cliente
               </button>
             )}
             <button 
                onClick={handleExportMasterList}
                className="text-xs font-bold text-slate-500 hover:text-blue-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-2 transition-colors"
             >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                📊 Descargar Listado Maestro ISO
             </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in">
        
        {/* CARD 1: TOTAL VOLUME */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-blue-300 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg">
            <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Docs</p>
            <h3 className="text-2xl font-bold text-slate-800">{totalDocs}</h3>
            <p className="text-[10px] text-slate-400 mt-1">Proyecto Activo</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" /></svg>
            </div>
        </div>

        {/* CARD 2: BOTTLENECKS */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-orange-300 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg">
            <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Pendientes</p>
            <h3 className="text-2xl font-bold text-slate-800">{pendingCount}</h3>
            <p className="text-[10px] text-orange-600 font-medium mt-1">Requieren firma</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
        </div>

        {/* CARD 3: IN TRANSIT */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-amber-300 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg">
            <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">En Tránsito</p>
            <h3 className="text-2xl font-bold text-slate-800">{transitCount}</h3>
            <div className="flex items-center gap-1 mt-1">
                <p className="text-[10px] text-amber-600 font-medium">Sin recibir</p>
            </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 012-2v0m2 0a2 2 0 012 2l0 0m2 0a2 2 0 012-2v0m2 0a2 2 0 012 2l0 0" /></svg>
            </div>
        </div>

        {/* CARD 4: TRANSFER ALERTS (NEW) */}
        <div 
            onClick={() => transferReadyCount > 0 && onShowTransfers && onShowTransfers()}
            className={`p-5 rounded-xl border shadow-sm flex items-center justify-between group transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg cursor-pointer
                ${transferReadyCount > 0 ? 'bg-purple-50 border-purple-200 hover:border-purple-400' : 'bg-white border-slate-200 opacity-60 cursor-default'}
            `}
        >
            <div>
            <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${transferReadyCount > 0 ? 'text-purple-700' : 'text-slate-400'}`}>Transferencias</p>
            <h3 className={`text-2xl font-bold ${transferReadyCount > 0 ? 'text-purple-900' : 'text-slate-800'}`}>{transferReadyCount}</h3>
            <p className="text-[10px] mt-1 text-purple-600 font-medium">Vencidos en Gestión</p>
            </div>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 ${transferReadyCount > 0 ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-400'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
            </div>
        </div>

        </div>
    </div>
  );
};

export default DashboardStats;
