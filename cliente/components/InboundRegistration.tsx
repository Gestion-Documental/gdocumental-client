import React, { useState } from 'react';
import { Project, SeriesType, ReceptionMedium, Document } from '../types';
import ContactSelector from './ContactSelector';
import DocumentSelector from './DocumentSelector';
import { analyzeDocumentWithAI } from '../services/googleVisionService';

const LONG_TEXT_LIMIT = 5000;
const MEDIUM_TEXT_LIMIT = 1000;

interface InboundRegistrationProps {
  activeProject: Project;
  existingDocuments: Document[];
  onCancel: () => void;
  onSave: (data: any) => void;
}

const InboundRegistration: React.FC<InboundRegistrationProps> = ({ activeProject, existingDocuments, onCancel, onSave }) => {
  const [medium, setMedium] = useState<ReceptionMedium>('PHYSICAL');
  
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false); // State for AI

  // Metadata State
  const [series, setSeries] = useState<SeriesType>('ADM');
  const [documentDate, setDocumentDate] = useState(new Date().toISOString().slice(0, 10));
  const [externalReference, setExternalReference] = useState('');
  const [senderName, setSenderName] = useState('');
  const [subject, setSubject] = useState('');
  const [requiresResponse, setRequiresResponse] = useState(false);
  const [deadline, setDeadline] = useState(new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10));
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyToRadicado, setReplyToRadicado] = useState('');

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          const f = e.dataTransfer.files[0];
          setFile(f);
          // Only preview images/pdfs logic, simplified for mock
          if (f.name.endsWith('.pdf') || f.type.includes('image')) {
              setPreviewUrl(URL.createObjectURL(f));
          } else {
              setPreviewUrl(null); // No preview for EML yet
          }
      }
  };

  const handleSelectFile = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pdf,.eml,.msg';
      input.onchange = (e: any) => {
          const f = e.target.files?.[0];
          if (f) {
            setFile(f);
            if (f.name.endsWith('.pdf') || f.type.includes('image')) {
                setPreviewUrl(URL.createObjectURL(f));
            } else {
                setPreviewUrl(null);
            }
          }
      };
      input.click();
  };

  const handleAnalyzeWithAI = async () => {
      if (!file) return;
      setIsAnalyzing(true);
      
      try {
          const result = await analyzeDocumentWithAI(file);
          if (result.success) {
              // Auto-Fill Form with AI Metadata
              if (result.metadata.detectedDate) setDocumentDate(result.metadata.detectedDate);
              if (result.metadata.detectedReference) setExternalReference(result.metadata.detectedReference);
              if (result.metadata.suggestedSender) setSenderName(result.metadata.suggestedSender);
              if (result.metadata.suggestedSubject) setSubject(result.metadata.suggestedSubject);
              
              // Series Heuristic (Mock)
              if (result.metadata.suggestedSubject?.toLowerCase().includes('obra')) {
                  setSeries('TEC');
              }

              alert("✅ Datos extraídos con Inteligencia Artificial (Google Cloud Vision)");
          }
      } catch (error) {
          console.error(error);
          alert("Error al analizar el documento.");
      } finally {
          setIsAnalyzing(false);
      }
  };

  const handleSubmit = () => {
      setIsProcessing(true);
      // Simulate processing
      setTimeout(() => {
          onSave({
              series,
              title: subject,
              content: `<p>${medium === 'PHYSICAL' ? 'Documento escaneado' : 'Correo Electrónico Importado'}. Referencia Externa: ${externalReference}</p>`, // Minimal content as placeholder
              receptionMedium: medium,
              metadata: {
                  sender: senderName,
                  externalReference,
                  documentDate,
                  template: 'NONE',
                  deadline: requiresResponse ? deadline : undefined
              },
              requiresResponse,
              replyToId,
              replyToRadicado,
              file
          });
      }, 1500);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xl flex flex-col lg:flex-row h-[calc(100vh-100px)] animate-fade-in">
        
        {/* LEFT COLUMN: VISUALIZER (Takes more space) */}
        <div className="flex-[4] bg-slate-100 border-r border-slate-200 relative flex flex-col">
            <div className="bg-white px-4 py-2 border-b border-slate-200 flex justify-between items-center h-12">
                 <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700 text-sm">Vista Previa</span>
                    {file && <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-mono border border-slate-200">{file.name}</span>}
                 </div>
                 {file && (
                    <button
                        onClick={() => { setFile(null); setPreviewUrl(null); }}
                        className="text-red-500 hover:text-red-700 text-xs font-bold px-2 py-1 rounded hover:bg-red-50 transition-colors"
                    >
                        Quitar Archivo
                    </button>
                 )}
            </div>

            <div className="flex-1 p-4 overflow-y-auto flex items-center justify-center bg-slate-200/50">
                {!file ? (
                    <div 
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleFileDrop}
                        onClick={handleSelectFile}
                        className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-slate-500 cursor-pointer hover:bg-white hover:border-blue-400 transition-all w-full h-full max-h-[400px] max-w-lg bg-white/50"
                    >
                        <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-3">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        </div>
                        <h4 className="font-bold text-sm mb-1 text-center">Subir Documento</h4>
                        <p className="text-xs text-center text-slate-400">PDF, JPG, PNG o Email (.eml)</p>
                    </div>
                ) : (
                    <div className="w-full h-full bg-white shadow-lg rounded overflow-hidden relative group flex flex-col items-center justify-center border border-slate-200">
                        {/* Preview Logic */}
                        {previewUrl ? (
                             (file?.type === 'application/pdf' || file?.name.toLowerCase().endsWith('.pdf')) ? (
                                <iframe src={previewUrl} className="w-full h-full border-none" title="PDF Preview"></iframe>
                             ) : (
                                <img src={previewUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
                             )
                        ) : (
                            <div className="text-center p-10">
                                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                </div>
                                <h4 className="font-bold text-slate-800 text-sm">{file.name}</h4>
                                <p className="text-xs text-slate-500 mt-1">Vista previa no disponible.</p>
                            </div>
                        )}
                        
                        {/* AI Button Overlay */}
                        <div className="absolute bottom-4 right-4">
                            <button
                                onClick={handleAnalyzeWithAI}
                                disabled={isAnalyzing}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xs shadow-lg transition-all transform hover:scale-105
                                    ${isAnalyzing
                                        ? 'bg-white text-indigo-500 border border-indigo-100 cursor-wait'
                                        : 'bg-indigo-600 text-white hover:bg-indigo-700 border border-indigo-700'
                                    }
                                `}
                            >
                                {isAnalyzing ? (
                                    <>
                                        <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Analizando...
                                    </>
                                ) : (
                                    <>
                                        <span>✨</span> Auto-completar con IA
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* RIGHT COLUMN: METADATA FORM (More compact) */}
        <div className="flex-[3] bg-white flex flex-col min-w-[320px]">
            <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-lg font-bold text-slate-800">Radicar Entrada</h2>
                <p className="text-xs text-slate-500 truncate">Proyecto: <span className="font-semibold text-blue-600">{activeProject.name}</span></p>
            </div>

            <div className="flex-1 px-6 py-4 overflow-y-auto space-y-4 relative">

                {/* 1. KEY INFO SECTION */}
                <div className="grid grid-cols-2 gap-3">
                    {/* MEDIUM SELECTOR (COMPACT) */}
                    <div className="col-span-2 bg-slate-50 p-1 rounded-lg flex border border-slate-200">
                         <button
                             onClick={() => setMedium('PHYSICAL')}
                             className={`flex-1 py-1.5 text-xs font-bold rounded flex items-center justify-center gap-2 transition-all ${medium === 'PHYSICAL' ? 'bg-white text-orange-600 shadow-sm ring-1 ring-orange-100' : 'text-slate-500 hover:text-slate-700'}`}
                         >
                             <span>📬</span> Físico
                         </button>
                         <button
                             onClick={() => setMedium('DIGITAL_EMAIL')}
                             className={`flex-1 py-1.5 text-xs font-bold rounded flex items-center justify-center gap-2 transition-all ${medium === 'DIGITAL_EMAIL' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-blue-100' : 'text-slate-500 hover:text-slate-700'}`}
                         >
                             <span>📧</span> Digital
                         </button>
                    </div>

                    {/* SENDER (IMPORTANT) */}
                    <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Remitente *</label>
                        <ContactSelector
                            label=""
                            placeholder="Buscar Entidad o Persona..."
                            value={senderName}
                            onChange={setSenderName}
                            onSelect={(c) => setSenderName(c.entityName)}
                            allowManual={true}
                            onManualAdd={(val) => setSenderName(val)}
                        />
                    </div>

                    {/* SUBJECT (IMPORTANT) */}
                    <div className="col-span-2">
                         <label className="block text-xs font-bold text-slate-500 mb-1">Asunto *</label>
                         <textarea
                             rows={2}
                             value={subject}
                             onChange={(e) => setSubject(e.target.value)}
                             placeholder="Descripción breve..."
                             maxLength={MEDIUM_TEXT_LIMIT}
                             className="w-full p-2 border border-slate-300 rounded text-sm focus:border-blue-500 outline-none resize-none transition-colors"
                         />
                    </div>
                </div>

                {/* 2. DETAILS GRID */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Referencia Externa</label>
                        <input
                            type="text"
                            value={externalReference}
                            onChange={(e) => setExternalReference(e.target.value)}
                            placeholder="Ej: OFICIO-123"
                            className="w-full p-2 border border-slate-200 rounded text-sm bg-slate-50 focus:bg-white focus:border-blue-400 outline-none transition-colors"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Fecha Documento</label>
                        <input 
                            type="date"
                            value={documentDate}
                            onChange={(e) => setDocumentDate(e.target.value)}
                            className="w-full p-2 border border-slate-200 rounded text-sm bg-slate-50 focus:bg-white focus:border-blue-400 outline-none transition-colors"
                        />
                    </div>

                    <div>
                         <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Serie</label>
                         <select
                             value={series}
                             onChange={(e) => setSeries(e.target.value as SeriesType)}
                             className="w-full p-2 border border-slate-200 rounded text-sm bg-slate-50 outline-none focus:border-blue-400"
                         >
                             <option value="ADM">Administrativa</option>
                             <option value="TEC">Técnica</option>
                         </select>
                    </div>

                    <div className="flex items-center">
                        <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-50 w-full transition-colors border border-transparent hover:border-slate-100">
                            <input 
                                type="checkbox"
                                checked={requiresResponse}
                                onChange={(e) => setRequiresResponse(e.target.checked)}
                                className="rounded text-yellow-600 focus:ring-yellow-500"
                            />
                            <span className="text-xs font-bold text-slate-600">Requiere Respuesta</span>
                        </label>
                    </div>

                    {requiresResponse && (
                        <div className="col-span-2 bg-yellow-50 p-2 rounded border border-yellow-100 animate-fade-in flex items-center gap-2">
                             <label className="text-[10px] font-bold text-yellow-700 uppercase whitespace-nowrap">Vence:</label>
                             <input
                                 type="date"
                                 value={deadline}
                                 onChange={(e) => setDeadline(e.target.value)}
                                 className="flex-1 bg-white border border-yellow-200 rounded text-xs p-1 outline-none text-slate-700"
                             />
                        </div>
                    )}
                </div>

                {/* 3. OPTIONAL LINKING */}
                <div className="pt-2 border-t border-slate-100">
                     <details className="group">
                         <summary className="list-none text-xs text-blue-600 font-bold cursor-pointer hover:text-blue-800 flex items-center gap-1 mb-2 select-none">
                             <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                             Opciones Avanzadas (Responder a...)
                         </summary>
                         <div className="pl-4 pb-2 animate-fade-in">
                            <DocumentSelector
                                documents={existingDocuments}
                                value={replyToRadicado}
                                onChange={setReplyToRadicado}
                                label=""
                                placeholder="Buscar Radicado a responder..."
                            />
                         </div>
                     </details>
                </div>

            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                <button 
                    onClick={onCancel}
                    className="px-4 py-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors"
                >
                    Cancelar
                </button>
                <button 
                    onClick={handleSubmit}
                    disabled={!file || !subject || !senderName || isProcessing}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg text-sm font-bold shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all transform active:scale-95"
                >
                    {isProcessing ? (
                        <>
                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Guardando...
                        </>
                    ) : (
                        <>
                            <span>📥</span> Radicar
                        </>
                    )}
                </button>
            </div>
        </div>
    </div>
  );
};

export default InboundRegistration;
