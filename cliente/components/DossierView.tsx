

import React, { useState } from 'react';
import { Document, DocumentType, DocumentStatus, UserRole } from '../types';
import LabelGenerator, { LabelMode } from './LabelGenerator';
import DeliveryRegistrationModal from './DeliveryRegistrationModal';
import ArchiveAssignmentModal from './ArchiveAssignmentModal'; 
import { getArchivePath } from '../services/mockData'; 
import EmailDispatchModal from './EmailDispatchModal';
import { sanitizeHtml } from '../utils/sanitize';

interface DossierViewProps {
  document: Document;
  userRole: UserRole;
  currentUserName: string;
  onClose: () => void;
  onRegisterDelivery?: (docId: string, data: { receivedBy: string; receivedAt: string; proof: string }) => void;
  onAssignLocation?: (docId: string, locationId: string) => void; 
  onVoidDocument?: (docId: string, reason: string) => void;
  onDispatchUpdate?: (payload: { method: 'NEXUS_MAIL' | 'EXTERNAL_CLIENT'; dispatchDate: string; emailTrackingStatus: 'SENT' | 'OPENED' | 'CLICKED'; dispatchUser?: string; trackingId?: string }) => void;
  onDeleteAttachment?: (attachmentId: string) => void;
  apiBaseUrl?: string;
  onChangeStatus?: (status: DocumentStatus) => void;
}

const DossierView: React.FC<DossierViewProps> = ({ document, userRole, currentUserName, onClose, onRegisterDelivery, onAssignLocation, onVoidDocument, onDispatchUpdate, onDeleteAttachment, apiBaseUrl, onChangeStatus }) => {
  const [isZipping, setIsZipping] = useState(false);
  const [showLabelGenerator, setShowLabelGenerator] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false); 
  const [showEmailModal, setShowEmailModal] = useState(false);
  
  const attachments = document.attachments && document.attachments.length > 0 ? document.attachments : (document.metadata?.attachments || []);
  const allowDeleteAttachments = !isVoid && (document.status === DocumentStatus.DRAFT || document.status === DocumentStatus.PENDING_APPROVAL) && userRole === 'DIRECTOR';

  const handleDownloadZip = () => {
    setIsZipping(true);
    setTimeout(() => {
        setIsZipping(false);
        alert(`Paquete ${document.radicadoCode}.zip descargado con éxito.`);
    }, 1500);
  };

  const handleDeliveryConfirm = (data: { receivedBy: string; receivedAt: string; proof: string }) => {
      if (onRegisterDelivery) {
          onRegisterDelivery(document.id, data);
      }
      setShowDeliveryModal(false);
  };
  
  const handleArchiveConfirm = (locationId: string) => {
      if (onAssignLocation) {
          onAssignLocation(document.id, locationId);
      }
      setShowArchiveModal(false);
  }

  const handleVoidClick = () => {
    if (!onVoidDocument) return;
    const reason = window.prompt("⚠️ CAUSA DE ANULACIÓN (ISO 9001:2015)\n\nEsta acción es irreversible. Por favor describa el motivo de anulación:");
    if (reason && reason.trim().length > 5) {
        onVoidDocument(document.id, reason);
    } else if (reason) {
        alert("El motivo es demasiado corto. La anulación requiere justificación detallada.");
    }
  };

  const isOutbound = document.type === DocumentType.OUTBOUND;
  const labelMode: LabelMode = isOutbound ? 'ENVELOPE' : 'STICKER';
  
  const labelButtonText = isOutbound 
    ? '🖨️ Imprimir Rótulo para SOBRE' 
    : '🖨️ Imprimir Sticker de RECIBIDO';

  // Can register delivery if: Outbound + Radicated + Not Delivered Yet + Not Void
  const isVoid = document.status === DocumentStatus.VOID;
  const canRegisterDelivery = !isVoid && isOutbound && document.status === 'RADICADO' && document.deliveryStatus !== 'DELIVERED';
  const isDelivered = document.deliveryStatus === 'DELIVERED';
  const canMarkPendingApproval = document.status === DocumentStatus.DRAFT && !isVoid;
  const canMarkArchived = document.status === DocumentStatus.RADICADO && !isVoid;
  
  // Digital Asset Logic
  const isDigitalOriginal = document.receptionMedium?.includes('DIGITAL');

  // Physical Location Logic
  const physicalPath = getArchivePath(document.physicalLocationId);
  const currentLocationName = physicalPath.length > 0 ? physicalPath[physicalPath.length - 1].name : null;
  const fullPathString = physicalPath.map(p => p.name).join(' > ');

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] animate-fade-in relative">
      
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
           <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
           </button>
           <div>
             <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                Expediente Digital
                <span className={`text-sm font-normal px-2 py-0.5 rounded border border-slate-200 ${isVoid ? 'bg-red-50 text-red-500 line-through' : 'bg-slate-100 text-slate-500'}`}>
                    {document.radicadoCode}
                </span>
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded uppercase ${document.series === 'TEC' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
                    {document.series}
                </span>
             </h2>
           </div>
        </div>
        <div className="flex gap-3">
           {isVoid ? (
               <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold border border-red-200 flex items-center gap-1">
                  ⛔ DOCUMENTO ANULADO
               </span>
           ) : (
               <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold border border-green-200 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  RADICADO OFICIAL
               </span>
           )}
           
           {/* Anular Action for Directors */}
           {userRole === 'DIRECTOR' && !isVoid && (
               <button 
                onClick={handleVoidClick}
                className="text-xs text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1 rounded border border-transparent hover:border-red-100 transition-all font-medium"
               >
                   🚫 Anular
               </button>
           )}

           {/* Estado rápido */}
           {!isVoid && onChangeStatus && (
             <div className="flex gap-2">
               {canMarkPendingApproval && (
                 <button
                   onClick={() => onChangeStatus(DocumentStatus.PENDING_APPROVAL)}
                   className="text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 px-3 py-1 rounded hover:bg-yellow-100"
                 >
                   Pendiente Aprobación
                 </button>
               )}
               {canMarkArchived && (
                 <button
                   onClick={() => onChangeStatus(DocumentStatus.ARCHIVED)}
                   className="text-xs bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1 rounded hover:bg-slate-200"
                 >
                   Archivar
                 </button>
               )}
             </div>
           )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 overflow-hidden">
          
          <div className="flex-[2] bg-slate-200 rounded-xl overflow-y-auto p-8 flex justify-center shadow-inner relative border border-slate-300">
             
             <div className="bg-white w-[210mm] min-h-[297mm] shadow-2xl relative p-[20mm] flex flex-col scale-90 origin-top">
                
                {/* VOID WATERMARK */}
                {isVoid && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
                        <div className="border-8 border-red-500/30 p-10 transform -rotate-45 rounded-xl">
                            <span className="text-[120px] font-black text-red-500/20 uppercase">ANULADO</span>
                        </div>
                    </div>
                )}

                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none select-none">
                    <svg width="400" height="400" viewBox="0 0 100 100">
                        <text x="50" y="50" fontSize="20" fontWeight="bold" transform="rotate(-45 50 50)" textAnchor="middle" fill="currentColor">OFFICIAL COPY</text>
                    </svg>
                </div>

                <div className="mb-8 border-b-2 border-slate-900 pb-4 flex justify-between items-end">
                    <div>
                        <h1 className="text-2xl font-serif font-bold text-slate-900 uppercase tracking-widest">Radika</h1>
                        <p className="text-xs text-slate-500">Gestión Documental Inteligente</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-bold text-slate-400 uppercase">Radicado Oficial</p>
                        <p className={`text-lg font-mono font-bold ${isVoid ? 'text-red-500 line-through' : 'text-slate-900'}`}>{document.radicadoCode}</p>
                    </div>
                </div>

                <div 
                  className="text-justify text-sm leading-7 whitespace-pre-wrap font-serif min-h-[400px]"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(document.content) }}
                />

                {attachments.length > 0 && (
                    <div className="mb-6 mt-4 border-t border-dashed border-slate-300 pt-4">
                        <p className="text-xs font-bold font-sans text-slate-800 mb-2 uppercase">Anexos Relacionados:</p>
                        <ul className="text-xs font-mono text-slate-600 list-disc pl-4 space-y-1">
                            {attachments.map(att => {
                                const downloadUrl = att.url || (att.id ? `${apiBaseUrl || ''}/documents/attachments/${att.id}/download` : '#');
                                return (
                                  <li key={att.id} className="flex items-center gap-2">
                                      <a href={downloadUrl} className="text-blue-600 hover:underline" target="_blank" rel="noreferrer">
                                        {att.name || (att as any).filename || 'Adjunto'}
                                      </a>
                                      {att.size && <span className="opacity-50">({att.size})</span>}
                                      {onDeleteAttachment && allowDeleteAttachments && (
                                        <button
                                          onClick={() => onDeleteAttachment(att.id)}
                                          className="text-red-500 hover:text-red-700 ml-2"
                                        >
                                          eliminar
                                        </button>
                                      )}
                                  </li>
                                );
                            })}
                        </ul>
                    </div>
                )}

                <div className="mt-auto flex justify-between items-end relative">
                    <div className="relative">
                        {document.signatureImage && (
                            <img 
                                src={document.signatureImage} 
                                alt="Signature" 
                                className={`h-20 -mb-4 ml-4 opacity-90 transform -rotate-2 ${isVoid ? 'grayscale opacity-30' : ''}`}
                            />
                        )}
                        <div className="border-t border-slate-900 w-48 mt-2 pt-1 text-center">
                            <p className="text-xs font-bold uppercase text-slate-900">Firma Autorizada</p>
                            <p className="text-[10px] text-slate-500">Firmado digitalmente via NexusDMS</p>
                        </div>
                    </div>

                    <div className="flex gap-3 items-end opacity-90">
                        <div className="text-right">
                            <p className="text-[9px] text-slate-400 font-mono mb-0.5">Hash: {document.securityHash?.substring(0,16)}...</p>
                            <p className="text-[9px] text-slate-400 font-mono">{new Date(document.updatedAt || document.createdAt).toLocaleString()}</p>
                        </div>
                        <div className="w-20 h-20 bg-white p-1 border border-slate-900">
                                <div className="w-full h-full bg-white grid grid-cols-6 grid-rows-6 gap-0.5">
                                    {[...Array(36)].map((_,i) => (
                                        <div key={i} className={`w-full h-full ${Math.random() > 0.4 ? 'bg-black' : 'bg-transparent'} ${(i<7 || i > 28 || (i+1)%6===0) ? 'bg-black' : ''}`}></div>
                                    ))}
                                </div>
                        </div>
                    </div>
                </div>

             </div>
          </div>

          <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-xl flex flex-col overflow-hidden">
             <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" /></svg>
                    Contenido del Expediente
                </h3>
             </div>

             <div className="p-6 flex-1 overflow-y-auto">
                
                {/* --- PHYSICAL ARCHIVE LOCATION CARD OR DIGITAL CLOUD CARD --- */}
                {isDigitalOriginal ? (
                     <div className="rounded-lg p-4 border border-blue-100 bg-blue-50 mb-6 relative overflow-hidden">
                         <div className="flex items-start justify-between">
                             <div>
                                 <p className="text-[10px] text-blue-400 uppercase font-bold tracking-wider mb-1">
                                     ☁️ Almacenamiento
                                 </p>
                                 <h4 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                                     Activo Nativo Digital
                                 </h4>
                                 <p className="text-[10px] text-blue-600 mt-1">
                                     Respaldo asegurado en Servidor Seguro. No requiere ubicación física.
                                 </p>
                             </div>
                             <div className="bg-white p-2 rounded-full shadow-sm text-blue-500">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
                             </div>
                         </div>
                     </div>
                ) : (
                    <div className={`rounded-lg p-4 border mb-6 relative overflow-hidden group
                        ${currentLocationName 
                            ? 'bg-amber-50 border-amber-200' 
                            : 'bg-slate-50 border-slate-200 border-dashed'}
                    `}>
                        <div className="relative z-10">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">
                                        📍 Ubicación del Original
                                    </p>
                                    {currentLocationName ? (
                                        <>
                                            <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                                📦 {currentLocationName}
                                            </h4>
                                            <p className="text-[10px] text-slate-500 mt-1 max-w-[200px] truncate" title={fullPathString}>
                                                {fullPathString}
                                            </p>
                                        </>
                                    ) : (
                                        <p className="text-sm font-medium text-slate-500 italic">No asignado a archivo físico</p>
                                    )}
                                </div>
                                {!isVoid && (
                                    <button 
                                        onClick={() => setShowArchiveModal(true)}
                                        className={`text-xs px-2 py-1 rounded border transition-colors
                                            ${currentLocationName 
                                                ? 'bg-white text-amber-700 border-amber-200 hover:bg-amber-100' 
                                                : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 shadow-sm'}
                                        `}
                                    >
                                        {currentLocationName ? 'Cambiar' : 'Asignar'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* META INFO */}
                <div className="bg-blue-50/50 rounded-lg p-4 border border-blue-100 mb-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-[10px] text-slate-400 uppercase font-bold">Fecha Radicación</p>
                            <p className="text-sm font-medium text-slate-800">{new Date(document.updatedAt || document.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 uppercase font-bold">Tipo Documental</p>
                            <p className="text-sm font-medium text-slate-800 capitalize">{document.type}</p>
                        </div>
                        <div className="col-span-2">
                             <p className="text-[10px] text-slate-400 uppercase font-bold">Asunto</p>
                             <p className="text-sm font-medium text-slate-800">{document.title}</p>
                        </div>
                        {document.dispatchMethod && (
                            <div className="col-span-2 bg-white border border-slate-200 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                    <p className="text-xs font-bold uppercase text-slate-600">Despacho por Email</p>
                                </div>
                                <p className="text-sm text-slate-800 font-semibold">
                                    {document.dispatchMethod === 'NEXUS_MAIL' ? 'Enviado vía Sistema (Nexus Mail)' : 'Despachado externamente por usuario'}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                    {document.dispatchDate ? new Date(document.dispatchDate).toLocaleString() : '--'} · Estado: {document.emailTrackingStatus || 'N/A'}
                                    {document.metadata?.dispatchTrackingId && ` · ID: ${document.metadata.dispatchTrackingId}`}
                                    {document.metadata?.dispatchUser && ` · Responsable: ${document.metadata.dispatchUser}`}
                                </p>
                            </div>
                        )}
                        {isVoid && (
                            <div className="col-span-2 bg-red-50 p-2 rounded border border-red-100">
                                <p className="text-[10px] text-red-500 uppercase font-bold">Causa de Anulación</p>
                                <p className="text-sm font-medium text-red-700">{document.metadata.voidReason}</p>
                            </div>
                        )}
                    </div>
                </div>

                <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center justify-between">
                    Soportes Adjuntos
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{attachments.length}</span>
                </h4>
                
                <div className="space-y-3 mb-8">
                    {attachments.length === 0 ? (
                        <p className="text-sm text-slate-400 italic">No hay archivos adjuntos en este expediente.</p>
                    ) : (
                        attachments.map(att => (
                            <div key={att.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-slate-50 transition-all group cursor-pointer">
                                <div className="bg-white p-2 rounded shadow-sm">
                                    {att.type === 'PDF' ? (
                                        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                    ) : (
                                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-700 truncate">{att.name}</p>
                                    <p className="text-[10px] text-slate-400">{att.size}</p>
                                </div>
                                <button className="text-slate-300 hover:text-blue-600">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* --- DELIVERY STATUS SECTION --- */}
                {isDelivered && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-2 mb-2">
                             <span className="w-2 h-2 rounded-full bg-green-500"></span>
                             <h4 className="text-sm font-bold text-green-800 uppercase">Documento Entregado</h4>
                        </div>
                        <div className="text-xs text-green-700 space-y-1">
                            <p><strong>Recibido por:</strong> {document.receivedBy}</p>
                            <p><strong>Fecha:</strong> {new Date(document.receivedAt!).toLocaleString()}</p>
                        </div>
                    </div>
                )}


                <div className="space-y-3 mt-auto">
                    {document.status === DocumentStatus.RADICADO && !isVoid && userRole === 'DIRECTOR' && (
                        <button
                          onClick={() => setShowEmailModal(true)}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold shadow-md flex items-center justify-center gap-2 transition-all"
                        >
                            📧 Enviar por Email
                        </button>
                    )}
                    
                    {!isVoid && (
                        <button 
                        onClick={handleDownloadZip}
                        disabled={isZipping}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
                        >
                            {isZipping ? (
                                <>
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Comprimiendo...
                                </>
                            ) : (
                                <>
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                Descargar Paquete Completo (.zip)
                                </>
                            )}
                        </button>
                    )}
                    
                    {!isDigitalOriginal && !isVoid && (
                        <button 
                        onClick={() => setShowLabelGenerator(true)}
                        className="w-full bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 py-3 rounded-xl font-semibold shadow-sm flex items-center justify-center gap-2 transition-all"
                        >
                            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 0 002-2v-4a2 0 00-2-2H5a2 0 00-2 2v4a2 0 002 2h2m2 4h6a2 0 002-2v-4a2 0 00-2-2H9a2 0 00-2 2v4a2 0 002 2zm8-12V5a2 0 00-2-2H9a2 0 00-2 2v4h10z" /></svg>
                            {labelButtonText}
                        </button>
                    )}

                    {canRegisterDelivery && (
                        <button 
                          onClick={() => setShowDeliveryModal(true)}
                          className="w-full bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 py-3 rounded-xl font-semibold shadow-sm flex items-center justify-center gap-2 transition-all"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            📝 Registrar Entrega
                        </button>
                    )}

                </div>

             </div>
          </div>

      </div>

      {showLabelGenerator && (
        <LabelGenerator 
            document={document} 
            mode={labelMode} 
            onClose={() => setShowLabelGenerator(false)} 
        />
      )}

      {showDeliveryModal && (
          <DeliveryRegistrationModal 
             onClose={() => setShowDeliveryModal(false)}
             onConfirm={handleDeliveryConfirm}
          />
      )}

      {showEmailModal && (
        <EmailDispatchModal 
            document={document}
            currentUserName={currentUserName}
            onClose={() => setShowEmailModal(false)}
            onConfirm={(payload) => onDispatchUpdate && onDispatchUpdate(payload)}
        />
      )}

      {/* Archive Assignment Modal */}
      {showArchiveModal && (
          <ArchiveAssignmentModal
            onClose={() => setShowArchiveModal(false)}
            onConfirm={handleArchiveConfirm}
          />
      )}

    </div>
  );
};

export default DossierView;
