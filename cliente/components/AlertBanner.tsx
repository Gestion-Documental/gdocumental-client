
import React from 'react';
import { Document } from '../types';

interface AlertBannerProps {
  documents: Document[];
  onReviewAll?: () => void;
}

const AlertBanner: React.FC<AlertBannerProps> = ({ documents, onReviewAll }) => {
  // Analyze Documents
  const now = new Date();
  
  const actionableDocs = documents.filter(d => d.requiresResponse && !d.isCompleted && d.deadline);
  
  const overdueDocs = actionableDocs.filter(d => {
    return new Date(d.deadline!) < now;
  });

  const urgentDocs = actionableDocs.filter(d => {
    const deadline = new Date(d.deadline!);
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return diffDays >= 0 && diffDays <= 3;
  });

  if (overdueDocs.length === 0 && urgentDocs.length === 0) {
    return null; // Don't render if everything is fine
  }

  const isCritical = overdueDocs.length > 0;
  
  return (
    <div className={`rounded-lg border p-4 mb-6 flex items-start gap-4 shadow-sm animate-fade-in
      ${isCritical ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'}
    `}>
      <div className={`p-2 rounded-full shrink-0 ${isCritical ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
         {isCritical 
           ? <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
           : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
         }
      </div>
      
      <div className="flex-1">
        <h3 className={`font-bold text-sm ${isCritical ? 'text-red-800' : 'text-orange-800'}`}>
            Action Required: {overdueDocs.length + urgentDocs.length} Documents Need Attention
        </h3>
        <p className={`text-xs mt-1 ${isCritical ? 'text-red-700' : 'text-orange-700'}`}>
            {isCritical 
              ? `You have ${overdueDocs.length} overdue document(s) that require immediate response.` 
              : `You have ${urgentDocs.length} document(s) approaching their deadline within 3 days.`}
        </p>
        
        {/* Quick Links */}
        <div className="mt-3 flex gap-2">
            {overdueDocs.slice(0, 3).map(d => (
                <span key={d.id} className="text-[10px] font-mono bg-white/60 px-2 py-1 rounded border border-black/5 truncate max-w-[200px]">
                    {d.radicadoCode || d.title}
                </span>
            ))}
        </div>
      </div>
      
      <button 
        onClick={onReviewAll}
        className={`px-4 py-2 rounded text-xs font-semibold hover:opacity-80 transition-opacity
         ${isCritical ? 'bg-red-600 text-white' : 'bg-orange-500 text-white'}
      `}>
         Review All
      </button>
    </div>
  );
};

export default AlertBanner;
