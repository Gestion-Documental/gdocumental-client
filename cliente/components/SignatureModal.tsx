
import React, { useState, useRef, useEffect } from 'react';
import { Document, SignatureMethod, User } from '../types';

interface SignatureModalProps {
  document: Document;
  user: User; // Added User Prop
  onClose: () => void;
  onConfirm: (method: SignatureMethod, signatureImage?: string) => void;
}

type ModalStep = 'SELECTION' | 'DIGITAL_SIGN' | 'PHYSICAL_UPLOAD' | 'PROCESSING';
type DigitalTab = 'DRAW' | 'SAVED';

const SignatureModal: React.FC<SignatureModalProps> = ({ document, user, onClose, onConfirm }) => {
  const [step, setStep] = useState<ModalStep>('SELECTION');
  const [digitalTab, setDigitalTab] = useState<DigitalTab>('DRAW');
  
  // Canvas State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Security State
  const [pin, setPin] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Validate PIN against User Profile
  const isPinValid = pin === user.securityPin;
  const hasSavedSignature = !!user.signatureUrl;

  // Canvas Logic
  useEffect(() => {
    if (step === 'DIGITAL_SIGN' && digitalTab === 'DRAW' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#0f172a'; // Slate-900
      }
    }
  }, [step, digitalTab]);

  const startDrawing = (e: React.MouseEvent) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      const rect = canvas.getBoundingClientRect();
      ctx.beginPath();
      ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    }
  };

  const draw = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
        const rect = canvas.getBoundingClientRect();
        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        ctx.stroke();
    }
  };

  const stopDrawing = () => setIsDrawing(false);
  const clearCanvas = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if(ctx && canvas) ctx.clearRect(0,0, canvas.width, canvas.height);
  }

  // --- ACTIONS ---

  const handleDigitalComplete = () => {
    // Only allow if in Saved mode AND pin is valid, OR if in Draw mode
    if (digitalTab === 'SAVED' && !isPinValid) return;

    setIsProcessing(true);
    setStep('PROCESSING');

    // Extract Image
    let signatureImg = user.signatureUrl || ''; // Default to profile signature
    if (digitalTab === 'DRAW' && canvasRef.current) {
        signatureImg = canvasRef.current.toDataURL("image/png");
    }

    // Simulate Network Delay
    setTimeout(() => {
        onConfirm(SignatureMethod.DIGITAL, signatureImg);
    }, 2000);
  };

  const handlePhysicalComplete = () => {
    setIsProcessing(true);
    setStep('PROCESSING');
    setTimeout(() => {
        onConfirm(SignatureMethod.PHYSICAL);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-white px-8 py-6 border-b border-slate-100 flex justify-between items-center">
          <div>
             <h2 className="text-2xl font-bold text-slate-800">Finalizar Documento</h2>
             <p className="text-sm text-slate-500">Elija el método de firma para: <span className="font-semibold">{document.title}</span></p>
          </div>
          {step !== 'PROCESSING' && (
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-8 overflow-y-auto bg-slate-50/50 min-h-[450px]">
          
          {/* STEP 1: SELECTION */}
          {step === 'SELECTION' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
              
              {/* Option A: Digital */}
              <button 
                onClick={() => setStep('DIGITAL_SIGN')}
                className="group relative bg-white p-8 rounded-xl border-2 border-slate-200 hover:border-blue-500 hover:shadow-xl transition-all text-left flex flex-col items-center text-center gap-4"
              >
                <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                   <svg className="w-10 h-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600">Firma Digital</h3>
                  <p className="text-sm text-slate-500 mt-2">Firme en pantalla ahora mismo. Se generará el radicado y el código QR de inmediato.</p>
                </div>
                <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-1 rounded mt-2">Recomendado</span>
              </button>

              {/* Option B: Physical */}
              <button 
                onClick={() => setStep('PHYSICAL_UPLOAD')}
                className="group relative bg-white p-8 rounded-xl border-2 border-slate-200 hover:border-orange-500 hover:shadow-xl transition-all text-left flex flex-col items-center text-center gap-4"
              >
                <div className="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                   <svg className="w-10 h-10 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-orange-600">Trámite Físico</h3>
                  <p className="text-sm text-slate-500 mt-2">Descargue el PDF, fírmelo manualmente en papel y suba la copia escaneada después.</p>
                </div>
              </button>
            </div>
          )}

          {/* STEP 2: DIGITAL SIGNATURE */}
          {step === 'DIGITAL_SIGN' && (
             <div className="max-w-2xl mx-auto">
                <div className="flex justify-center mb-6">
                   <div className="bg-white p-1 rounded-lg border border-slate-200 inline-flex shadow-sm">
                      <button 
                        onClick={() => setDigitalTab('DRAW')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${digitalTab === 'DRAW' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        Dibujar en Pantalla
                      </button>
                      <button 
                        onClick={() => setDigitalTab('SAVED')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${digitalTab === 'SAVED' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        Mi Firma Guardada
                      </button>
                   </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    {digitalTab === 'DRAW' ? (
                       <div className="flex flex-col gap-4">
                          <p className="text-sm text-slate-600 text-center mb-2">Use su mouse o dedo para firmar en el recuadro:</p>
                          <canvas 
                            ref={canvasRef}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            width={500}
                            height={200}
                            className="border-2 border-dashed border-slate-300 rounded-lg cursor-crosshair touch-none bg-slate-50 mx-auto w-full"
                          />
                          <button onClick={clearCanvas} className="text-xs text-red-500 hover:text-red-700 underline self-end">Borrar Firma</button>
                       </div>
                    ) : (
                       <div className="flex flex-col items-center gap-6 py-4">
                          {hasSavedSignature ? (
                              <div className="w-full max-w-sm border border-slate-200 rounded-lg p-4 bg-slate-50 flex flex-col items-center">
                                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Vista Previa</span>
                                  <img src={user.signatureUrl} alt="Saved Signature" className="h-20 opacity-80" />
                              </div>
                          ) : (
                              <div className="text-center text-red-500 text-sm border border-red-200 bg-red-50 p-4 rounded-lg">
                                  No tiene una firma configurada en su perfil.
                              </div>
                          )}
                          
                          {hasSavedSignature && (
                            <div className="w-full max-w-xs bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2 text-yellow-800 font-semibold text-sm">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                    Validación de Seguridad
                                </div>
                                <p className="text-xs text-yellow-700 mb-3">Para usar su firma guardada, ingrese su PIN de seguridad.</p>
                                <div className="relative">
                                    <input 
                                    type="password" 
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value)}
                                    maxLength={4}
                                    className={`w-full text-center tracking-[0.5em] text-lg font-bold p-2 border rounded outline-none focus:ring-2 ${isPinValid ? 'border-green-500 focus:ring-green-200 bg-green-50 text-green-700' : 'border-slate-300 focus:ring-blue-200'}`}
                                    placeholder="••••"
                                    />
                                    {isPinValid && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    </div>
                                    )}
                                </div>
                            </div>
                          )}
                       </div>
                    )}
                </div>

                <div className="flex justify-between mt-8">
                   <button onClick={() => setStep('SELECTION')} className="text-slate-500 font-medium px-4 py-2 hover:bg-slate-100 rounded-lg transition-colors">Atrás</button>
                   <button 
                     onClick={handleDigitalComplete}
                     disabled={digitalTab === 'SAVED' && !isPinValid}
                     className={`px-8 py-3 rounded-lg font-bold shadow-lg transition-all flex items-center gap-2
                       ${(digitalTab === 'SAVED' && !isPinValid) 
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                          : 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-105 shadow-blue-500/30'}`
                     }
                   >
                     <span>Estampar y Radicar</span>
                     {(digitalTab === 'SAVED' && isPinValid) && (
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                     )}
                   </button>
                </div>
             </div>
          )}

          {/* STEP 3: PHYSICAL UPLOAD */}
          {step === 'PHYSICAL_UPLOAD' && (
             <div className="max-w-2xl mx-auto flex flex-col gap-6">
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-4">
                   <div className="bg-white p-2 rounded-full shadow-sm text-blue-600">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                   </div>
                   <div>
                      <h4 className="font-bold text-blue-900 text-sm">Paso 1: Descargar Borrador</h4>
                      <p className="text-xs text-blue-700">Imprima este documento para firmarlo manualmente.</p>
                   </div>
                   <button className="ml-auto text-sm bg-white border border-blue-200 text-blue-700 px-3 py-1.5 rounded font-medium hover:bg-blue-50">Descargar PDF</button>
                </div>

                <div className="border-2 border-dashed border-slate-300 rounded-xl p-10 flex flex-col items-center justify-center bg-slate-50 hover:bg-white hover:border-blue-400 transition-all cursor-pointer group">
                   <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors text-slate-400">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                   </div>
                   <p className="text-sm font-medium text-slate-700 mb-1">Arrastre el PDF escaneado aquí</p>
                   <p className="text-xs text-slate-400">o haga clic para explorar archivos</p>
                </div>

                <div className="flex justify-between mt-4">
                   <button onClick={() => setStep('SELECTION')} className="text-slate-500 font-medium px-4 py-2 hover:bg-slate-100 rounded-lg transition-colors">Atrás</button>
                   <button 
                     onClick={handlePhysicalComplete}
                     className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 rounded-lg font-bold shadow-lg shadow-orange-500/20 transition-all hover:scale-105"
                   >
                     Radicar Escaneo
                   </button>
                </div>
             </div>
          )}

          {/* STEP 4: PROCESSING */}
          {step === 'PROCESSING' && (
             <div className="text-center flex flex-col items-center justify-center h-full py-10">
                <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-6"></div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Procesando Radicación...</h2>
                <p className="text-slate-500 text-sm">Generando hash de seguridad y estampado criptográfico.</p>
             </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default SignatureModal;
