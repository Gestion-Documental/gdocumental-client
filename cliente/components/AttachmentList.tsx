import React from 'react';
import { Attachment } from '../types';

interface AttachmentListProps {
  attachments: Attachment[];
  onDelete?: (id: string) => void;
  apiBaseUrl?: string;
}

const AttachmentList: React.FC<AttachmentListProps> = ({ attachments, onDelete, apiBaseUrl = '' }) => {
  if (!attachments || attachments.length === 0) {
    return <p className="text-xs text-slate-400">No hay adjuntos.</p>;
  }

  return (
    <ul className="text-xs text-slate-600 space-y-1">
      {attachments.map((att) => {
        const downloadUrl = att.url || (att.id ? `${apiBaseUrl}/documents/attachments/${att.id}/download` : '#');
        return (
          <li key={att.id} className="flex items-center gap-2">
            <a href={downloadUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate max-w-xs">
              {att.name || att.filename || 'Adjunto'}
            </a>
            {att.size && <span className="text-[10px] text-slate-400">({att.size})</span>}
            {onDelete && (
              <button
                onClick={() => onDelete(att.id)}
                className="text-red-500 hover:text-red-700 text-[10px]"
              >
                eliminar
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
};

export default AttachmentList;
