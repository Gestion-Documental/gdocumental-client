
import React from 'react';
import { Attachment } from '../types';

interface FileAttachmentsProps {
  attachments: Attachment[];
  onChange: (attachments: Attachment[]) => void;
  readOnly?: boolean;
  onDeleteAttachment?: (id: string) => void;
  apiBaseUrl?: string;
  maxSizeMb?: number;
  allowedTypes?: string[]; // mime prefixes e.g., ['application/pdf','image/']
  onError?: (msg: string) => void;
}

const FileAttachments: React.FC<FileAttachmentsProps> = ({ attachments, onChange, readOnly, onDeleteAttachment, apiBaseUrl = '', maxSizeMb = 15, allowedTypes = ['application/pdf', 'image/'], onError }) => {

  const handleFileSelect = (files: FileList | null) => {
    if (readOnly || !files) return;
    const newAttachments: Attachment[] = [];
    for (const f of Array.from(files)) {
      const sizeMb = f.size / 1024 / 1024;
      const typeAllowed = allowedTypes.some((t) => f.type.startsWith(t));
      if (sizeMb > maxSizeMb) {
        onError?.(`El archivo ${f.name} supera el límite de ${maxSizeMb} MB`);
        continue;
      }
      if (!typeAllowed) {
        onError?.(`Tipo no permitido: ${f.type || 'desconocido'}`);
        continue;
      }
      newAttachments.push({
        id: `f-${Date.now()}-${f.name}`,
        name: f.name,
        type: f.type.includes('pdf') ? 'PDF' : 'OTHER',
        size: `${(f.size / 1024 / 1024).toFixed(2)} MB`,
        file: f
      });
    }
    if (newAttachments.length === 0) return;
    onChange([...attachments, ...newAttachments]);
  };

  const handleRemove = (id: string) => {
      if (readOnly) return;
      if (onDeleteAttachment) {
        onDeleteAttachment(id);
        return;
      }
      onChange(attachments.filter(f => f.id !== id));
  };

  const getIcon = (type: string) => {
      switch(type) {
          case 'PDF': return (
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
          );
          case 'EXCEL': return (
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          );
          default: return (
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
          );
      }
  };

  return (
    <div className="w-full max-w-[210mm] mx-auto mt-6 animate-fade-in">
        <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
            Soportes y Anexos
        </h3>
        
        {!readOnly && (
            <label 
                className="border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 hover:border-blue-400 cursor-pointer p-6 flex flex-col items-center justify-center transition-all group mb-4"
            >
                <input 
                  type="file" 
                  multiple 
                  className="hidden" 
                  onChange={(e) => handleFileSelect(e.target.files)} 
                />
                <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center mb-2 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                </div>
                <p className="text-sm font-medium text-slate-700">Arrastre aquí Planos, Presupuestos o Anexos</p>
                <p className="text-xs text-slate-400 mt-1">o haga clic para explorar archivos</p>
            </label>
        )}

        {attachments.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {attachments.map((file) => (
                    <div key={file.id} className="bg-white border border-slate-200 rounded-lg p-3 flex items-center gap-3 shadow-sm group">
                        {getIcon(file.type)}
                        <div className="flex-1 min-w-0">
                            <a 
                              href={file.url || (file.id ? `${apiBaseUrl}/documents/attachments/${file.id}/download` : '#')} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-sm font-medium text-blue-600 truncate hover:underline"
                              title={file.name}
                            >
                              {file.name}
                            </a>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wide">{file.size || ''}</p>
                        </div>
                        {!readOnly && (
                            <button 
                                onClick={() => handleRemove(file.id)}
                                className="text-slate-300 hover:text-red-500 transition-colors p-1"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        )}
                    </div>
                ))}
            </div>
        )}
    </div>
  );
};

export default FileAttachments;
