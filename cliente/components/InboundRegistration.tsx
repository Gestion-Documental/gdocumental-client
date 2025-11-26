
import React, { useState } from 'react';
import { Project, SeriesType, ReceptionMedium } from '../types';
import ContactSelector from './ContactSelector';
import { analyzeDocumentWithAI } from '../services/googleVisionService';

interface InboundRegistrationProps {
  activeProject: Project;
  onCancel: () => void;
  onSave: (data: any) => void;
}

const InboundRegistration: React.FC<InboundRegistrationProps> = ({ activeProject, onCancel, onSave }) => {
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

  const handleMockUpload = () => {
      // Create a mock file for demonstration
      setFile(new File(["mock pdf"], "scanned_doc.pdf", { type: "application/pdf" }));
      // Use a placeholder image for preview since we can't real render PDF in this env
      setPreviewUrl("https://via.placeholder.com/600x800.png?text=Preview+PDF+Escaneado");
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
                  template: 'NONE'
              }
          });
      }, 1500);
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-inner flex flex-col lg:flex-row h-[calc(100vh-140px)] animate-fade-in">
        
        {/* LEFT COLUMN: VISUALIZER */}
        <div className="flex-1 bg-slate-200 border-r border-slate-300 relative flex flex-col">
            <div className="bg-white px-6 py-3 border-b border-slate-200 flex justify-between items-center">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                   {medium === 'PHYSICAL' ? (
                       <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                   ) : (
                       <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                   )}
                   Visor de {medium === 'PHYSICAL' ? 'Documento' : 'Correo'}
                </h3>
                {file && <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500 font-mono">{file.name}</span>}
            </div>

            <div className="flex-1 p-6 overflow-y-auto flex items-center justify-center">
                {!file ? (
                    <div 
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleFileDrop}
                        onClick={handleMockUpload}
                        className="border-2 border-dashed border-slate-400 rounded-xl p-10 flex flex-col items-center justify-center text-slate-500 cursor-pointer hover:bg-slate-100 hover:border-blue-400 transition-all w-full h-full"
                    >
                        <div className="w-16 h-16 bg-slate-300 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        </div>
                        <h4 className="font-bold text-lg mb-1 text-center">
                            {medium === 'PHYSICAL' ? 'Arrastre aquí el PDF escaneado' : 'Arrastre correo .EML o .MSG'}
                        </h4>
                        <p className="text-sm">o haga clic para explorar archivos</p>
                    </div>
                ) : (
                    <div className="w-full h-full bg-white shadow-2xl rounded p-4 overflow-hidden relative group flex flex-col items-center justify-center">
                        {/* Preview Logic */}
                        {previewUrl ? (
                             <img src={previewUrl} alt="Preview" className="max-w-full max-h-full object-contain opacity-80" />
                        ) : (
                            <div className="text-center p-10">
                                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
                                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                </div>
                                <h4 className="font-bold text-slate-800">{file.name}</h4>
                                <p className="text-sm text-slate-500 mt-2">Vista previa no disponible para este formato.</p>
                            </div>
                        )}
                        
                        <button 
                            onClick={() => { setFile(null); setPreviewUrl(null); }}
                            className="absolute top-4 right-4 bg-red-600 text-white p-2 rounded-full shadow hover:bg-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                )}
            </div>
        </div>

        {/* RIGHT COLUMN: METADATA FORM */}
        <div className="flex-1 bg-white flex flex-col">
            <div className="px-8 py-6 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-800">Registrar Entrada</h2>
                <p className="text-sm text-slate-500">Correspondencia recibida para: <span className="font-semibold text-blue-600">{activeProject.name}</span></p>
            </div>

            {/* AI ANALYSIS BANNER */}
            <div className="px-8 pt-6 pb-2">
                <button
                    onClick={handleAnalyzeWithAI}
                    disabled={!file || isAnalyzing}
                    className={`w-full py-3 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm
                        ${isAnalyzing 
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-400 cursor-wait' 
                            : !file 
                                ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                                : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 hover:shadow-md'
                        }
                    `}
                >
                    {isAnalyzing ? (
                        <>
                            <svg className="animate-spin h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Subiendo a la nube...
                        </>
                    ) : (
                        <>
                            <span className="text-lg">👁️</span>
                            Analizar con Google Cloud Vision
                        </>
                    )}
                </button>
                {!file && <p className="text-[10px] text-center text-slate-400 mt-2">Cargue un archivo para habilitar IA.</p>}
            </div>

            <div className="flex-1 p-8 overflow-y-auto space-y-6 relative">
                {isAnalyzing && <div className="absolute inset-0 bg-white/60 z-10 backdrop-blur-[1px]"></div>}

                {/* MEDIUM SELECTOR */}
                <div>
                     <label className="block text-xs font-bold text-slate-400 uppercase mb-3">Medio de Recepción</label>
                     <div className="grid grid-cols-2 gap-4">
                        <button 
                            onClick={() => setMedium('DIGITAL_EMAIL')}
                            className={`p-3 rounded-lg border-2 flex items-center gap-3 transition-all text-left
                                ${medium === 'DIGITAL_EMAIL' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}
                            `}
                        >
                            <div className={`p-2 rounded-full ${medium === 'DIGITAL_EMAIL' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            </div>
                            <div>
                                <span className={`block text-sm font-bold ${medium === 'DIGITAL_EMAIL' ? 'text-blue-900' : 'text-slate-600'}`}>Digital / Email</span>
                                <span className="text-[10px] text-slate-500">Correo electrónico, Portal Web</span>
                            </div>
                        </button>

                        <button 
                            onClick={() => setMedium('PHYSICAL')}
                            className={`p-3 rounded-lg border-2 flex items-center gap-3 transition-all text-left
                                ${medium === 'PHYSICAL' ? 'border-orange-500 bg-orange-50' : 'border-slate-200 hover:border-orange-300'}
                            `}
                        >
                            <div className={`p-2 rounded-full ${medium === 'PHYSICAL' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            </div>
                            <div>
                                <span className={`block text-sm font-bold ${medium === 'PHYSICAL' ? 'text-orange-900' : 'text-slate-600'}`}>Físico / Papel</span>
                                <span className="text-[10px] text-slate-500">Carta, Sobre, Paquete</span>
                            </div>
                        </button>
                     </div>
                </div>

                <div className="h-px bg-slate-100 my-4"></div>
                
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Serie Documental</label>
                        <select 
                            value={series}
                            onChange={(e) => setSeries(e.target.value as SeriesType)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg text-sm p-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                        >
                            <option value="ADM">🏢 Administrativa (ADM)</option>
                            <option value="TEC">👷 Técnica (TEC)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Fecha del Documento</label>
                        <input 
                            type="date"
                            value={documentDate}
                            onChange={(e) => setDocumentDate(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg text-sm p-2.5 outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">No. Externo / Referencia</label>
                    <input 
                        type="text"
                        value={externalReference}
                        onChange={(e) => setExternalReference(e.target.value)}
                        placeholder="Ej: OFICIO-2023-505"
                        className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-sm focus:bg-white focus:border-blue-400 outline-none transition-all"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">El número con el que viene marcado el documento.</p>
                </div>

                <div>
                    <ContactSelector 
                        label="Remitente (Quién envía)"
                        placeholder="Buscar Entidad o Persona..."
                        value={senderName}
                        onChange={setSenderName}
                        onSelect={(c) => setSenderName(c.entityName)}
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Asunto / Resumen</label>
                    <textarea 
                        rows={3}
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Breve descripción del contenido..."
                        className="w-full p-3 border border-slate-200 rounded-lg bg-slate-50 text-sm focus:bg-white focus:border-blue-400 outline-none transition-all resize-none"
                    />
                </div>

            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                <button 
                    onClick={onCancel}
                    className="px-6 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                >
                    Cancelar
                </button>
                <button 
                    onClick={handleSubmit}
                    disabled={!file || !subject || isProcessing}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all"
                >
                    {isProcessing ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Radicando...
                        </>
                    ) : (
                        <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Radicar Entrada
                        </>
                    )}
                </button>
            </div>
        </div>
    </div>
  );
};

export default InboundRegistration;
