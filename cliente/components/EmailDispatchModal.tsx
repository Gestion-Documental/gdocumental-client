import React, { useMemo, useState } from 'react';
import { Document } from '../types';
import { emailService } from '../services/emailService';

interface EmailDispatchModalProps {
  document: Document;
  currentUserName: string;
  onClose: () => void;
  onConfirm: (payload: {
    method: 'NEXUS_MAIL' | 'EXTERNAL_CLIENT';
    dispatchDate: string;
    emailTrackingStatus: 'SENT' | 'OPENED' | 'CLICKED';
    dispatchUser?: string;
    trackingId?: string;
  }) => void;
}

type TabOption = 'AUTO' | 'MANUAL';

const EmailDispatchModal: React.FC<EmailDispatchModalProps> = ({ document, currentUserName, onClose, onConfirm }) => {
  const [activeTab, setActiveTab] = useState<TabOption>('AUTO');
  const defaultTo = document.metadata?.recipientEmail || 'contacto@cliente.com';
  const [to, setTo] = useState(defaultTo);
  const [cc, setCc] = useState(document.metadata?.ccList?.join(', ') || '');
  const defaultSubject = `${document.radicadoCode || 'RADICADO'} - ${document.title}`;
  const [subject, setSubject] = useState(defaultSubject);
  const defaultBody = `Cordial saludo,

Adjunto encontrará el documento radicado ${document.radicadoCode || document.id} correspondiente a "${document.title}".

Quedamos atentos a sus comentarios.

Atentamente,
${currentUserName}`;
  const [body, setBody] = useState(defaultBody);
  const [isSending, setIsSending] = useState(false);

  const attachments = useMemo(() => {
    const extra = document.metadata?.attachments || [];
    return [
      { name: `${document.radicadoCode || 'documento'}_firmado.pdf`, size: 'PDF firmado' },
      ...extra
    ];
  }, [document]);

  const handleSendAuto = async () => {
    setIsSending(true);
    try {
      const result = await emailService.send({
        to,
        cc,
        subject,
        body,
        attachments
      });
      onConfirm({
        method: 'NEXUS_MAIL',
        dispatchDate: result.dispatchDate,
        emailTrackingStatus: result.trackingStatus,
        dispatchUser: currentUserName,
        trackingId: result.messageId
      });
      alert('✅ Enviado por Nexus Mail (simulado). Se activó el rastreo de lectura.');
      onClose();
    } catch (e) {
      alert('Error al enviar correo. Intente de nuevo.');
    } finally {
      setIsSending(false);
    }
  };

  const handleDownloadZip = () => {
    alert('Descargando paquete ZIP con PDF firmado y anexos (simulado).');
  };

  const handleOpenMailClient = () => {
    const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  };

  const handleMarkManual = () => {
    const dispatchDate = new Date().toISOString();
    onConfirm({
      method: 'EXTERNAL_CLIENT',
      dispatchDate,
      emailTrackingStatus: 'SENT',
      dispatchUser: currentUserName
    });
    alert('Despacho marcado como enviado manualmente.');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Despachar por Correo</h2>
            <p className="text-sm text-slate-500">Documento: {document.radicadoCode || document.id}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <button
              onClick={() => setActiveTab('AUTO')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${activeTab === 'AUTO' ? 'border-blue-500 bg-white shadow-md' : 'border-slate-200 bg-white hover:border-blue-300'}`}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xl">🚀</div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Envío Automático (Nexus Mail)</p>
                  <p className="text-xs text-slate-500">El sistema envía el correo por ti. Incluye rastreo de lectura.</p>
                </div>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('MANUAL')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${activeTab === 'MANUAL' ? 'border-amber-500 bg-white shadow-md' : 'border-slate-200 bg-white hover:border-amber-300'}`}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-xl">📧</div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Envío Manual (Outlook/Gmail)</p>
                  <p className="text-xs text-slate-500">Use su propio correo. El sistema prepara los archivos y el texto.</p>
                </div>
              </div>
            </button>
          </div>

          {activeTab === 'AUTO' && (
            <div className="mt-6 bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-slate-400">Para</label>
                <input value={to} onChange={(e) => setTo(e.target.value)} className="w-full mt-1 p-2 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-slate-400">CC</label>
                <input value={cc} onChange={(e) => setCc(e.target.value)} className="w-full mt-1 p-2 border border-slate-200 rounded-lg text-sm" placeholder="copias@correo.com, segundo@dominio.com" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-slate-400">Asunto</label>
                <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full mt-1 p-2 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-slate-400">Cuerpo</label>
                <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} className="w-full mt-1 p-3 border border-slate-200 rounded-lg text-sm"></textarea>
              </div>

              <div>
                <p className="text-xs font-bold uppercase text-slate-400 mb-2">Adjuntos</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {attachments.map((a, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700">
                      <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      <span className="font-medium truncate">{a.name}</span>
                      {a.size && <span className="text-[10px] text-slate-400 ml-auto">{a.size}</span>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSendAuto}
                  disabled={isSending}
                  className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all disabled:opacity-60"
                >
                  {isSending ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      Enviando...
                    </>
                  ) : (
                    <>
                      🚀 Enviar Ahora
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'MANUAL' && (
            <div className="mt-6 bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button onClick={handleDownloadZip} className="p-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-left text-sm font-semibold transition-all flex items-center gap-2">
                  <span>📥</span> Descargar Paquete (ZIP)
                </button>
                <button onClick={handleOpenMailClient} className="p-3 rounded-lg border border-slate-200 hover:border-amber-400 hover:bg-amber-50 text-left text-sm font-semibold transition-all flex items-center gap-2">
                  <span>✉️</span> Abrir mi Correo
                </button>
                <div className="p-3 rounded-lg border border-green-200 bg-green-50 text-sm">
                  <p className="font-bold text-green-800 mb-1">Checklist</p>
                  <p className="text-xs text-green-700">Usa el texto generado y adjunta el ZIP antes de marcar como enviado.</p>
                </div>
              </div>

              <div className="bg-slate-50 border border-dashed border-slate-200 p-3 rounded-lg text-xs text-slate-600 font-mono whitespace-pre-wrap">
                {`Para: ${to}
Asunto: ${subject}

${body}`}
              </div>

              <button
                onClick={handleMarkManual}
                className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2"
              >
                ✅ Marcar como Enviado
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailDispatchModal;
