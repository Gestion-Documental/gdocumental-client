
import React, { useState } from 'react';
import { User } from '../types';

interface UserProfileProps {
  user: User;
  onBack: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, onBack }) => {
  const [pin, setPin] = useState(user.securityPin || '');
  const [signature, setSignature] = useState(user.signatureUrl || '');
  
  // Mock states for form
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
      // Here you would typically call an API to update the user profile
  };

  const handleDropSignature = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      // In a real app, handle file read. Here mock update.
      alert("Simulando carga de imagen PNG...");
      setSignature("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMDAgNjAiPjxwYXRoIGQ9Ik0xMCw1MCBDMjAsNDAgNDAsMTAgNjAsMjAgUzgwLDgwIDEwMCw1MCBTMTUwLDIwIDE5MCw1MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjMiLz48L3N2Zz4=");
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-6 px-4 pb-20">
        <div className="max-w-3xl mx-auto">
            
            <button onClick={onBack} className="mb-6 flex items-center text-sm text-slate-500 hover:text-slate-800">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                Volver al Dashboard
            </button>

            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                
                {/* Header Profile */}
                <div className="bg-slate-800 p-8 text-white flex items-center gap-6">
                    <img src={user.avatarUrl} className="w-24 h-24 rounded-full border-4 border-white shadow-md" alt="Profile" />
                    <div>
                        <h1 className="text-2xl font-bold">{user.fullName}</h1>
                        <p className="text-blue-200">{user.email}</p>
                        <span className="inline-block mt-2 bg-blue-600 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                            {user.role.replace('_', ' ')}
                        </span>
                    </div>
                </div>

                <div className="p-8 space-y-10">
                    
                    {/* Section: Signature */}
                    <section>
                        <h2 className="text-lg font-bold text-slate-800 mb-1 border-b pb-2 border-slate-100">Firma Digital Oficial</h2>
                        <p className="text-sm text-slate-500 mb-4">Esta imagen será usada para estampar documentos aprobados. Use formato PNG transparente.</p>
                        
                        <div className="flex flex-col md:flex-row gap-6 items-start">
                            <div className="border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 w-full md:w-1/2 h-40 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={handleDropSignature}
                                onClick={() => alert("Abrir selector de archivos...")}
                            >
                                <svg className="w-8 h-8 text-slate-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                <span className="text-sm font-medium text-slate-600">Arrastre su firma (PNG)</span>
                            </div>
                            
                            <div className="w-full md:w-1/2">
                                <p className="text-xs font-bold text-slate-400 uppercase mb-2">Vista Previa Actual</p>
                                <div className="border border-slate-200 rounded-xl p-4 bg-white h-40 flex items-center justify-center">
                                    {signature ? (
                                        <img src={signature} alt="Signature" className="max-h-24" />
                                    ) : (
                                        <span className="text-slate-400 italic text-sm">No hay firma configurada</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Section: Security PIN */}
                    <section>
                        <h2 className="text-lg font-bold text-slate-800 mb-1 border-b pb-2 border-slate-100">PIN de Seguridad</h2>
                        <p className="text-sm text-slate-500 mb-4">Código de 4 dígitos requerido para confirmar operaciones sensibles (Firma y Radicación).</p>
                        
                        <div className="max-w-xs">
                            <label className="block text-xs font-bold text-slate-700 mb-2">Nuevo PIN</label>
                            <input 
                                type="password" 
                                maxLength={12}
                                value={pin}
                                onChange={(e) => setPin(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg p-3 text-center font-mono text-xl tracking-[0.5em] focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="••••"
                            />
                        </div>
                    </section>

                    {/* Actions */}
                    <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                        <span className={`text-sm font-medium text-green-600 transition-opacity ${isSaved ? 'opacity-100' : 'opacity-0'}`}>
                            ✓ Cambios guardados correctamente
                        </span>
                        <button 
                            onClick={handleSave}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold shadow-lg transition-all"
                        >
                            Guardar Perfil
                        </button>
                    </div>

                </div>
            </div>
        </div>
    </div>
  );
};

export default UserProfile;
