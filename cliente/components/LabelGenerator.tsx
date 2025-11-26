
import React, { useState } from 'react';
import { Document } from '../types';

export type LabelMode = 'STICKER' | 'ENVELOPE';

interface LabelGeneratorProps {
  document: Document;
  mode: LabelMode;
  onClose: () => void;
}

const LabelGenerator: React.FC<LabelGeneratorProps> = ({ document, mode, onClose }) => {
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = () => {
    setIsPrinting(true);
    // Simulate print delay
    setTimeout(() => {
        setIsPrinting(false);
        // In a real app, this would trigger window.print() with a specific CSS media query
        alert("Enviando a impresora...");
        onClose();
    }, 1500);
  };

  // Mock Sender Info (Project Context)
  const projectSender = "Puente Norte Construction";
  const projectAddress = "Av. El Dorado # 26-80, Bogotá";
  const projectPhone = "(601) 555-0199";

  // Mock Recipient Info (From Metadata)
  const recipientName = document.metadata?.recipientName || document.metadata?.recipient || "Destinatario Desconocido";
  const recipientCompany = document.metadata?.recipientCompany || "";
  const recipientAddress = document.metadata?.recipientAddress || "Dirección no registrada";

  // Mock Inbound Info
  const senderName = document.metadata?.sender || "Remitente Externo";

  // QR Generator (CSS Mock)
  const QRCode = ({ size = "w-24 h-24", dark = true }) => (
    <div className={`${size} bg-white p-0.5 border-2 ${dark ? 'border-black' : 'border-slate-800'}`}>
        <div className="w-full h-full bg-white grid grid-cols-6 grid-rows-6 gap-0">
            {[...Array(36)].map((_,i) => (
                <div key={i} className={`w-full h-full ${Math.random() > 0.4 ? 'bg-black' : 'bg-transparent'} ${(i<7 || i > 28 || (i+1)%6===0) ? 'bg-black' : ''}`}></div>
            ))}
        </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
           <div>
             <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                Vista Previa de Impresión
             </h3>
             <p className="text-xs text-slate-500">
                Modo: <span className="font-semibold uppercase text-blue-600">{mode === 'ENVELOPE' ? 'Rótulo de Sobre (Salida)' : 'Sticker de Archivo (Entrada)'}</span>
             </p>
           </div>
           <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
           </button>
        </div>

        {/* Preview Area */}
        <div className="flex-1 overflow-auto bg-slate-300 p-12 flex justify-center items-center">
            
            {/* --- MODE A: STICKER (For Inbound/Internal - Thermal Printer) --- */}
            {mode === 'STICKER' && (
                <div className="bg-white w-[100mm] h-[50mm] shadow-2xl flex relative overflow-hidden ring-1 ring-slate-900/10">
                    {/* Thermal Printing Style: High Contrast Black & White */}
                    <div className="flex-1 p-3 flex flex-col justify-between">
                        <div className="border-b-2 border-black pb-1 mb-1">
                             <h4 className="font-black text-sm uppercase leading-none">RECIBIDO</h4>
                             <p className="text-[9px] font-mono mt-0.5">NEXUS DMS</p>
                        </div>
                        
                        <div>
                            <p className="text-[8px] font-bold uppercase">No. RADICADO:</p>
                            <p className="text-xl font-black font-mono leading-none tracking-tighter mt-0.5">{document.radicadoCode}</p>
                        </div>

                        <div className="mt-auto">
                             <p className="text-[8px] font-bold">FECHA: <span className="font-normal font-mono">{new Date(document.updatedAt || document.createdAt).toLocaleString()}</span></p>
                             <p className="text-[8px] font-bold truncate max-w-[50mm]">DE: <span className="font-normal uppercase">{senderName}</span></p>
                        </div>
                    </div>
                    
                    {/* Right Side QR */}
                    <div className="w-[35mm] h-full bg-black flex items-center justify-center p-2">
                         <div className="bg-white p-1">
                             <QRCode size="w-[26mm] h-[26mm]" dark={true} />
                         </div>
                    </div>
                </div>
            )}

            {/* --- MODE B: ENVELOPE (For Outbound - Standard DL/C5) --- */}
            {mode === 'ENVELOPE' && (
                <div className="bg-white w-[220mm] h-[110mm] shadow-2xl p-8 relative flex flex-col justify-between ring-1 ring-slate-900/10">
                    
                    {/* Sender (Top Left) */}
                    <div className="text-xs text-slate-700 font-sans">
                        <div className="flex items-center gap-2 mb-2">
                             {/* Logo Placeholder */}
                             <div className="w-6 h-6 bg-slate-800 text-white flex items-center justify-center font-bold text-[10px] rounded">ND</div>
                             <span className="font-bold text-slate-900 text-sm uppercase tracking-wide">{projectSender}</span>
                        </div>
                        <p>{projectAddress}</p>
                        <p>{projectPhone}</p>
                        <p className="text-[9px] uppercase mt-2 text-slate-400 font-bold border-b border-slate-200 inline-block pb-0.5">REMITENTE</p>
                    </div>

                    {/* Stamps / Marks (Top Right) */}
                    <div className="absolute top-6 right-6 border-2 border-slate-300 border-dashed w-24 h-20 flex items-center justify-center bg-slate-50/50">
                        <span className="text-[10px] text-slate-400 font-bold transform -rotate-12">ESTAMPILLA</span>
                    </div>

                    {/* Recipient (Center Right) */}
                    <div className="self-end mr-16 w-[100mm] relative z-10">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-200 w-full">DESTINATARIO:</p>
                        <div className="text-xl font-serif text-slate-900 leading-snug">
                            <p className="font-bold uppercase tracking-wide">{recipientName}</p>
                            {recipientCompany && <p className="text-base text-slate-700 mt-1">{recipientCompany}</p>}
                            <p className="text-base mt-1 text-slate-600">{recipientAddress}</p>
                        </div>
                    </div>

                    {/* Footer / Tracking (Bottom) */}
                    <div className="absolute bottom-4 left-6 right-6 border-t-2 border-slate-100 pt-2 flex justify-between items-end">
                        <div className="flex items-center gap-3">
                             <QRCode size="w-10 h-10" dark={false} />
                             <div>
                                 <p className="text-[9px] font-bold uppercase text-slate-800">Control de Correspondencia</p>
                                 <p className="text-[10px] font-mono text-slate-500">{document.radicadoCode}</p>
                             </div>
                        </div>
                        <p className="text-[9px] text-slate-300 uppercase font-bold tracking-widest">OFFICIAL DOCUMENT</p>
                    </div>

                </div>
            )}

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 rounded-b-xl flex justify-end gap-3">
             <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">
                Cancelar
             </button>
             <button 
               onClick={handlePrint}
               disabled={isPrinting}
               className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2 rounded-lg font-bold shadow-lg flex items-center gap-2 disabled:opacity-70 transition-all"
             >
                {isPrinting ? (
                     <>
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Enviando...
                     </>
                ) : (
                     <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                        Imprimir {mode === 'ENVELOPE' ? 'Sobre' : 'Sticker'}
                     </>
                )}
             </button>
        </div>

      </div>
    </div>
  );
};

export default LabelGenerator;
