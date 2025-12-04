
import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Document } from '../types';
import { sanitizeHtml } from '../utils/sanitize';

interface SignedDocumentViewProps {
  document: Document;
  onClose: () => void;
}

const SignedDocumentView: React.FC<SignedDocumentViewProps> = ({ document, onClose }) => {
  const paperRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    if (!paperRef.current) {
      console.error("Document element missing");
      return;
    }

    setIsDownloading(true);

    try {
        const canvas = await html2canvas(paperRef.current, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            logging: false,
            backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/png');
        
        // Determine Page Size
        const pageSizeKey = (document.metadata?.pageSize as 'A4' | 'LETTER' | 'LEGAL') || 'A4';
        const PAGE_SIZES = {
            A4: { width: 210, height: 297 },
            LETTER: { width: 216, height: 279 },
            LEGAL: { width: 216, height: 356 }
        };
        const sizeConfig = PAGE_SIZES[pageSizeKey] || PAGE_SIZES.A4;

        // Initialize PDF with custom size
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: [sizeConfig.width, sizeConfig.height]
        });
        
        const imgWidth = sizeConfig.width;
        const pageHeight = sizeConfig.height;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        let heightLeft = imgHeight;
        let position = 0;

        // First page
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        // Subsequent pages
        while (heightLeft > 0) {
            position = heightLeft - imgHeight; // Negative offset to show next chunk
            pdf.addPage([sizeConfig.width, sizeConfig.height]);
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }

        const filename = `${document.radicadoCode || 'document'}.pdf`;
        pdf.save(filename);

    } catch (error) {
        console.error("PDF Generation failed:", error);
        alert("Error generating PDF. Please try again.");
    } finally {
        setIsDownloading(false);
    }
  };

  const comments = document.metadata?.comments || [];
  const attachments = document.metadata?.attachments || [];
  const ccList = document.metadata?.ccList || [];

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
           <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <h2 className="text-xl font-bold text-slate-900">Documento Radicado</h2>
           </div>
           <p className="text-sm text-slate-500">ID de Transacción: <span className="font-mono text-slate-700">{document.id}</span></p>
        </div>
        <div className="flex gap-3">
           <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition-colors">Volver al Dashboard</button>
           <button 
             onClick={handleDownloadPDF}
             disabled={isDownloading}
             className={`px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium shadow-lg flex items-center gap-2 transition-all ${isDownloading ? 'opacity-70 cursor-wait' : ''}`}
           >
              {isDownloading ? (
                <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generando PDF...
                </>
              ) : (
                <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Descargar PDF Firmado
                </>
              )}
           </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 flex-1 overflow-hidden">
          
          {/* LEFT: The Paper Preview (Now showing actual PDF) */}
          <div className="flex-1 bg-slate-200 rounded-xl overflow-hidden shadow-inner flex flex-col min-h-[90vh]">
            {document.contentUrl ? (
                <iframe 
                    src={`http://localhost:4000${document.contentUrl}`} 
                    className="w-full h-full border-none"
                    title="Documento Firmado"
                />
            ) : (
                <div className="flex-1 flex items-center justify-center text-slate-500">
                    <p>No hay vista previa disponible.</p>
                </div>
            )}
          </div>

          {/* RIGHT: Audit Log Sidebar */}
          <div className="w-96 bg-white border-l border-slate-200 shadow-xl flex flex-col">
              <div className="p-4 border-b border-slate-100 bg-slate-50">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    Historial de Auditoría
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Registro inmutable de eventos</p>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                 
                 {/* Event: Creation */}
                 <div className="relative pl-6 border-l-2 border-slate-200 pb-2">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-200 border-2 border-white"></div>
                    <p className="text-xs text-slate-400 font-mono mb-1">{new Date(document.createdAt).toLocaleString()}</p>
                    <p className="text-sm font-medium text-slate-700">Documento Creado</p>
                    <p className="text-xs text-slate-500">Estado inicial: DRAFT</p>
                 </div>

                 {/* Comments & System Events */}
                 {comments.map((comment, idx) => {
                     // Determine style based on event type
                     const isAudit = comment.text.includes('AUDITORÍA');
                     const isRejection = comment.text.includes('Devuelto');
                     
                     let iconColor = 'bg-blue-100 border-blue-500';
                     if (isAudit) iconColor = 'bg-yellow-100 border-yellow-500';
                     if (isRejection) iconColor = 'bg-red-100 border-red-500';

                     return (
                        <div key={idx} className="relative pl-6 border-l-2 border-slate-200 pb-2">
                            <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white ${iconColor}`}></div>
                            <p className="text-xs text-slate-400 font-mono mb-1">{new Date(comment.createdAt).toLocaleString()}</p>
                            
                            {isAudit ? (
                                <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-xs text-yellow-800">
                                    <strong className="block mb-1 font-bold">⚠️ INTERVENCIÓN SUPERVISADA</strong>
                                    {comment.text.replace('⚠️ AUDITORÍA: ', '')}
                                    
                                    {/* DIFF VIEW */}
                                    {comment.changes && (
                                        <div className="mt-2 text-[10px] font-mono border-t border-yellow-200 pt-2 grid gap-2">
                                            <div>
                                                <span className="text-red-700 font-bold uppercase block text-[9px] mb-0.5">Versión Original:</span>
                                                <div className="bg-red-50 text-red-800 p-1.5 rounded line-through opacity-70 break-all border border-red-100">
                                                    {comment.changes.original.substring(0, 150)}...
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-green-700 font-bold uppercase block text-[9px] mb-0.5">Versión Final:</span>
                                                <div className="bg-green-50 text-green-900 p-1.5 rounded border border-green-200 break-all font-semibold">
                                                    {comment.changes.modified.substring(0, 150)}...
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : isRejection ? (
                                <div className="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-800">
                                    <strong className="block mb-1 font-bold">⛔ RECHAZO DE CALIDAD</strong>
                                    {comment.text}
                                </div>
                            ) : (
                                <div>
                                    <p className="text-sm font-medium text-slate-700">Comentario: {comment.author}</p>
                                    <p className="text-xs text-slate-500 italic">"{comment.text}"</p>
                                </div>
                            )}
                        </div>
                     );
                 })}

                 {/* Event: Radication */}
                 <div className="relative pl-6 border-l-2 border-green-200 pb-2">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow-sm"></div>
                    <p className="text-xs text-slate-400 font-mono mb-1">{new Date(document.updatedAt || document.createdAt).toLocaleString()}</p>
                    <p className="text-sm font-bold text-green-700">Radicación Exitosa</p>
                    <p className="text-xs text-slate-500">Código: {document.radicadoCode}</p>
                 </div>

              </div>
          </div>
      </div>
    </div>
  );
};

export default SignedDocumentView;
