
import React from 'react';
import { Document, DocumentType, DocumentStatus } from '../types';

interface TraceabilityTimelineProps {
  documents: Document[];
  onClose: () => void;
}

const TraceabilityTimeline: React.FC<TraceabilityTimelineProps> = ({ documents, onClose }) => {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col h-full animate-fade-in">
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Trazabilidad del Hilo</h3>
          <p className="text-xs text-slate-500">Historial de Correspondencia</p>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
          <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 relative">
        {/* Central Line */}
        <div className="absolute left-1/2 top-6 bottom-6 w-0.5 bg-slate-300 -ml-[1px]"></div>

        <div className="space-y-8">
          {documents.map((doc, index) => {
            const isLeft = doc.type === DocumentType.INBOUND;
            const isRight = doc.type === DocumentType.OUTBOUND;
            const isCenter = doc.type === DocumentType.INTERNAL;
            
            // Layout classes
            // Default: Left alignment (INBOUND)
            let alignment = "flex-row"; 
            let cardStyle = "bg-white border-l-4 border-l-blue-500 border-y border-r border-slate-200"; // White card
            let icon = (
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center border-2 border-white shadow-sm absolute -right-4 top-1/2 transform -translate-y-1/2 z-10">
                    <span className="text-lg leading-none">📥</span>
                </div>
            );

            if (isRight) {
                // Right alignment (OUTBOUND)
                alignment = "flex-row-reverse";
                cardStyle = "bg-blue-50 border-r-4 border-r-indigo-500 border-y border-l border-blue-100"; // Light blue card
                icon = (
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center border-2 border-white shadow-sm absolute -left-4 top-1/2 transform -translate-y-1/2 z-10">
                        <span className="text-lg leading-none">📤</span>
                    </div>
                );
            }

            if (isCenter) {
                 // Internal Note
                 alignment = "justify-center";
                 cardStyle = "bg-slate-100 border border-slate-300 w-2/3 mx-auto text-center";
                 icon = (
                     <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center border-2 border-white shadow-sm absolute left-1/2 transform -translate-x-1/2 -top-3 z-10">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                     </div>
                 );
            }

            return (
              <div key={doc.id} className={`flex w-full ${alignment} relative items-center`}>
                
                {/* The Card */}
                <div className={`w-[45%] relative p-4 rounded-lg shadow-sm transition-all hover:shadow-md cursor-pointer group ${cardStyle}`}>
                   
                   {!isCenter && icon}

                   <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </span>
                      {doc.status === DocumentStatus.RADICADO && (
                          <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium border border-green-200">
                             Radicado
                          </span>
                      )}
                      {doc.status === DocumentStatus.DRAFT && (
                          <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-medium border border-yellow-200">
                             Borrador
                          </span>
                      )}
                   </div>
                   
                   <h4 className="font-bold text-slate-800 text-sm leading-tight mb-1">{doc.title}</h4>
                   <p className="text-xs text-slate-500 font-mono truncate">
                       {doc.radicadoCode || 'Pendiente de Radicación'}
                   </p>
                   
                   {/* Connector Line to Center */}
                   {!isCenter && (
                     <div className={`absolute top-1/2 w-6 h-0.5 bg-slate-300 transform -translate-y-1/2 z-0
                        ${isLeft ? '-right-6' : '-left-6'}
                     `}></div>
                   )}
                </div>

                {/* Spacer for alignment */}
                {!isCenter && <div className="w-[45%]"></div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TraceabilityTimeline;
