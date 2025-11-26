

import React, { useState, useEffect, useRef } from 'react';
import { Comment, UserRole } from '../types';

interface CommentSectionProps {
  comments: Comment[];
  currentUserRole: UserRole;
  onAddComment: (text: string) => void;
}

const CommentSection: React.FC<CommentSectionProps> = ({ comments, currentUserRole, onAddComment }) => {
  const [newComment, setNewComment] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [comments]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      onAddComment(newComment);
      setNewComment('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200 w-96 shadow-xl z-20">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <h3 className="font-bold text-slate-700 flex items-center gap-2">
          <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>
          Colaboración
        </h3>
        <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">{comments.length}</span>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
        {comments.length === 0 ? (
           <div className="text-center mt-10 opacity-50">
              <p className="text-sm text-slate-400">No hay comentarios aún.</p>
              <p className="text-xs text-slate-400">Inicie la conversación sobre este documento.</p>
           </div>
        ) : (
          comments.map((comment) => {
            const isMe = comment.role === currentUserRole;
            const isSystem = comment.role === 'SYSTEM';

            if (isSystem) {
                return (
                    <div key={comment.id} className="flex justify-center my-4">
                        <div className="bg-red-50 border border-red-100 text-red-800 text-xs px-3 py-1.5 rounded-full font-medium shadow-sm flex items-center gap-2">
                           <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                           {comment.text}
                        </div>
                    </div>
                )
            }

            return (
              <div key={comment.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-2 mb-1">
                   <span className={`text-[10px] font-bold ${isMe ? 'text-blue-600' : 'text-slate-500'}`}>
                      {comment.author}
                   </span>
                   <span className="text-[10px] text-slate-300">{new Date(comment.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                <div 
                  className={`max-w-[85%] px-3 py-2 rounded-xl text-sm shadow-sm
                    ${isMe 
                       ? 'bg-blue-600 text-white rounded-tr-none' 
                       : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'
                    }`}
                >
                  {comment.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white border-t border-slate-200">
        <form onSubmit={handleSubmit} className="flex gap-2">
           <input 
             type="text" 
             value={newComment}
             onChange={(e) => setNewComment(e.target.value)}
             placeholder="Escriba un comentario..."
             className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all"
           />
           <button 
             type="submit"
             disabled={!newComment.trim()}
             className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white p-2 rounded-lg transition-colors"
           >
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
           </button>
        </form>
      </div>
    </div>
  );
};

export default CommentSection;