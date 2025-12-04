
import React, { useRef, useState } from 'react';
import { User } from '../types';
import { useToast } from './ToastProvider';
import { uploadSignature } from '../services/api';
import { API_URL } from '../services/api';

interface UserProfileProps {
  user: User;
  token: string;
  onBack: () => void;
  onUpdate: (user: User) => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, token, onBack, onUpdate }) => {
  const [pin, setPin] = useState(''); // New PIN (empty by default to avoid confusion)
  const [currentPin, setCurrentPin] = useState('');
  const [signature, setSignature] = useState(user.signatureUrl || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();
  
  // Mock states for form
  const [isSaved, setIsSaved] = useState(false);

  // Sync state with props if user changes (e.g. re-fetch)
  React.useEffect(() => {
      // We don't pre-fill PINs for security/UX when changing
      setPin(''); 
      setCurrentPin('');
      const rawSig = user.signatureUrl || '';
      const resolvedSig = rawSig.startsWith('/uploads') ? `${API_URL}${rawSig}` : rawSig;
      setSignature(resolvedSig);
  }, [user]);

  const handleSave = async () => {
      if (pin && (pin.length !== 4 || !/^\d+$/.test(pin))) {
          return addToast('El nuevo PIN debe ser de 4 dígitos numéricos', 'error');
      }
      
      // If user has a PIN, they must provide current PIN to change it
      if (user.securityPin && pin && !currentPin) {
          return addToast('Debe ingresar su PIN actual para cambiarlo', 'error');
      }

      // If no changes
      if (!pin && !signature) return;

      try {
        const { user: updated } = await uploadSignature(token, undefined, pin || undefined, currentPin);
        // Update local state to match server response
        if (updated.signatureUrl) setSignature(updated.signatureUrl);
        
        // Notify parent to update global user state
        onUpdate({
            ...user,
            ...updated,
            signatureUrl: updated.signatureImage,
            securityPin: updated.signaturePin
        });

        addToast('Perfil actualizado', 'success');
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
        // Clear inputs
        setPin('');
        setCurrentPin('');
      } catch (e: any) {
        addToast(e.message || 'No se pudo guardar el perfil', 'error');
      }
  };

  const handleDropSignature = async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file) await handleUploadFile(file);
  };

  const handleUploadFile = async (file: File) => {
      try {
        if (!file.type.includes('png')) {
          return addToast('Solo se permite PNG transparente para la firma', 'error');
        }
        // Optimistic preview
        const objectUrl = URL.createObjectURL(file);
        setSignature(objectUrl);

        const { user: updated } = await uploadSignature(token, file, pin);
        
        // Update with real URL from server
        const finalUrl = updated.signatureImage || objectUrl;
        const resolvedUrl = finalUrl.startsWith('/uploads') ? `${API_URL}${finalUrl}` : finalUrl;
        setSignature(resolvedUrl);
        
        onUpdate({
            ...user,
            ...updated,
            signatureUrl: updated.signatureImage,
            securityPin: updated.signaturePin
        });

        addToast('Firma actualizada', 'success');
      } catch (e: any) {
        addToast(e.message || 'No se pudo subir la firma', 'error');
        // Revert to original if failed
        setSignature(user.signatureUrl || '');
      }
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
                            {(user.role || 'USER').replace('_', ' ')}
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
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <svg className="w-8 h-8 text-slate-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                <span className="text-sm font-medium text-slate-600">Arrastre su firma (PNG)</span>
                                <input
                                  type="file"
                                  ref={fileInputRef}
                                  className="hidden"
                                  accept="image/png"
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) handleUploadFile(f);
                                    e.target.value = '';
                                  }}
                                />
                            </div>
                            
                            <div className="w-full md:w-1/2">
                                <p className="text-xs font-bold text-slate-400 uppercase mb-2">Vista Previa Actual</p>
                                <div className="border border-slate-200 rounded-xl p-4 bg-white h-40 flex items-center justify-center">
                                    {signature ? (
                                        <img src={signature} alt="Signature" className="max-h-24 object-contain" />
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
                        
                        <div className="flex gap-6">
                            {user.securityPin && (
                                <div className="max-w-xs">
                                    <label className="block text-xs font-bold text-slate-700 mb-2">PIN Actual</label>
                                    <input 
                                        type="password" 
                                        maxLength={4}
                                        value={currentPin}
                                        onChange={(e) => setCurrentPin(e.target.value)}
                                        className="w-full border border-slate-300 rounded-lg p-3 text-center font-mono text-xl tracking-[0.5em] focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="••••"
                                    />
                                </div>
                            )}
                            
                            <div className="max-w-xs">
                                <label className="block text-xs font-bold text-slate-700 mb-2">
                                    {user.securityPin ? 'Nuevo PIN' : 'Crear PIN'}
                                </label>
                                <input 
                                    type="password" 
                                    maxLength={4}
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value)}
                                    className="w-full border border-slate-300 rounded-lg p-3 text-center font-mono text-xl tracking-[0.5em] focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="••••"
                                />
                            </div>
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
