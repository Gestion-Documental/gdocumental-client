
import React, { useState } from 'react';

interface DeliveryRegistrationModalProps {
  onClose: () => void;
  onConfirm: (data: { receivedBy: string; receivedAt: string; file: File }) => void;
}

const DeliveryRegistrationModal: React.FC<DeliveryRegistrationModalProps> = ({ onClose, onConfirm }) => {
  const [receivedBy, setReceivedBy] = useState('');
  const [receivedAt, setReceivedAt] = useState(new Date().toISOString().slice(0, 16));
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert('Debe subir una evidencia');
      return;
    }
    setIsSubmitting(true);
    // Simulate delay or just call
    onConfirm({ receivedBy, receivedAt, file });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-bold text-slate-800">Confirmar Entrega</h3>
            <p className="text-xs text-slate-500">Registre los datos de quien recibió el documento.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Recibido Por (Nombre/Cargo)</label>
                <input 
                    type="text" 
                    required
                    value={receivedBy}
                    onChange={(e) => setReceivedBy(e.target.value)}
                    placeholder="Ej: María Perez - Recepción"
                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>
            
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha y Hora Real</label>
                <input 
                    type="datetime-local" 
                    required
                    value={receivedAt}
                    onChange={(e) => setReceivedAt(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Evidencia (Sello/Firma)</label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:bg-slate-50 transition-colors relative">
                    <input 
                        type="file" 
                        accept="image/*,application/pdf"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    {file ? (
                        <div className="flex items-center gap-2 justify-center text-green-600">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            <span className="text-sm font-medium truncate max-w-[200px]">{file.name}</span>
                        </div>
                    ) : (
                        <>
                            <svg className="w-6 h-6 text-slate-400 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            <span className="text-xs text-slate-500">Clic para subir foto o PDF</span>
                        </>
                    )}
                </div>
            </div>

            <div className="flex gap-3 mt-4 pt-4 border-t border-slate-100">
                <button 
                    type="button" 
                    onClick={onClose}
                    className="flex-1 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-sm"
                >
                    Cancelar
                </button>
                <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg flex justify-center items-center gap-2"
                >
                    {isSubmitting ? 'Guardando...' : 'Confirmar Entrega'}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default DeliveryRegistrationModal;
