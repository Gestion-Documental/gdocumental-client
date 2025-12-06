
import React, { useState, useEffect, useRef } from 'react';
import { DocumentType, DocumentTemplate, Project, Document, DocumentStatus, Comment, Attachment, SeriesType, UserRole, TRDEntry, SignatureMethod } from '../types';
import { MOCK_CONTACTS } from '../services/mockData';
import { previewDocument, fetchUsers, assignDocument } from '../services/api';

import ContactSelector from './ContactSelector';
import OnlyOfficeEditor, { OnlyOfficeEditorRef } from './OnlyOfficeEditor';
import { useToast } from './ToastProvider';

interface DocumentEditorProps {
  activeProject: Project;
  replyToDoc: Document | null;
  existingDoc: Document | null; 
  userRole: UserRole; 
  onCancel: () => void;
  onSave: (data: any) => void;
  onDeleteAttachment?: (attachmentId: string) => void;
  apiBaseUrl?: string;
  forceReadOnly?: boolean;
  token?: string;
  onDocumentUpdated?: (doc: Document) => void;
  currentUserName?: string;
  currentUserId?: string;
}

const normalizeAttachments = (doc?: Document | null): Attachment[] => {
  if (!doc) return [];
  if (doc.attachments && doc.attachments.length > 0) {
    return doc.attachments.map((a) => ({
      ...a,
      name: a.name || (a as any).filename || 'Adjunto',
      type: a.type || ((a.name || '').toLowerCase().endsWith('.pdf') ? 'PDF' : 'OTHER')
    }));
  }
  return doc.metadata?.attachments || [];
};

const DocumentEditor: React.FC<DocumentEditorProps> = ({ activeProject, replyToDoc, existingDoc, userRole, onCancel, onSave, onDeleteAttachment, apiBaseUrl, forceReadOnly, token, onDocumentUpdated, currentUserName, currentUserId }) => {

  const { addToast } = useToast();
  const editorRef = useRef<OnlyOfficeEditorRef>(null);
  
  // Local Active Doc State
  const [activeDoc, setActiveDoc] = useState<Document | null>(existingDoc);

  // Sync prop changes
  useEffect(() => {
      if (existingDoc) setActiveDoc(existingDoc);
  }, [existingDoc]);

  // Sync state when activeDoc changes
  useEffect(() => {
      if (activeDoc) {
          setTitle(activeDoc.title);
          setSeries(activeDoc.series);
          setTrdCode(activeDoc.metadata?.trdCode || '');
          setRecipientName(activeDoc.metadata?.recipientName || '');
          setRecipientRole(activeDoc.metadata?.recipientRole || '');
          setRecipientCompany(activeDoc.metadata?.recipientCompany || '');
          setRecipientAddress(activeDoc.metadata?.recipientAddress || '');
      }
  }, [activeDoc]);

  // UI State
  const [series, setSeries] = useState<SeriesType>(existingDoc?.series || 'ADM');
  const [isMetadataOpen, setIsMetadataOpen] = useState(!existingDoc); // Open by default for new docs
  const [showRadicationModal, setShowRadicationModal] = useState(false);
  const [signaturePin, setSignaturePin] = useState('');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [authorizeSignature, setAuthorizeSignature] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Metadata Fields
  const [docType, setDocType] = useState(existingDoc?.type || DocumentType.OUTBOUND);
  const [title, setTitle] = useState(existingDoc?.title || '');
  const [trdCode, setTrdCode] = useState<string>(existingDoc?.metadata?.trdCode || '');
  const [recipientName, setRecipientName] = useState(existingDoc?.metadata?.recipientName || '');
  const [recipientRole, setRecipientRole] = useState(existingDoc?.metadata?.recipientRole || '');
  const [recipientCompany, setRecipientCompany] = useState(existingDoc?.metadata?.recipientCompany || '');
  const [recipientAddress, setRecipientAddress] = useState(existingDoc?.metadata?.recipientAddress || '');
  const [ccList, setCcList] = useState<string[]>(existingDoc?.metadata?.ccList || ['Archivo de Proyecto']);
  const [ccInput, setCcInput] = useState('');

  // Assignment State
  const [users, setUsers] = useState<any[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedDirectorId, setSelectedDirectorId] = useState('');

  const currentStatus = existingDoc?.status || DocumentStatus.DRAFT;
  const isReadOnly = (userRole === 'ENGINEER' && currentStatus === DocumentStatus.PENDING_APPROVAL) || !!forceReadOnly;

  useEffect(() => {
      if (userRole === 'ENGINEER') {
          fetchUsers(token || '').then(setUsers).catch(console.error);
      }
  }, [userRole, token]);

  // Filter TRD by selected Series
  const trdOptions: TRDEntry[] = (activeProject?.trd || []).filter(trd => {
      const code = trd.code?.toUpperCase() || '';
      if (series === 'ADM') return code.includes('ADM') || code.startsWith('A');
      if (series === 'TEC') return code.includes('TEC') || code.startsWith('T');
      return true;
  });

  useEffect(() => {
    if (replyToDoc && !existingDoc) {
      setDocType(DocumentType.OUTBOUND);
      setSeries(replyToDoc.series);
      setTitle(`Ref: Respuesta a ${replyToDoc.radicadoCode || 'Documento'} - ${replyToDoc.title}`);
      if (replyToDoc.metadata?.sender) {
        setRecipientName(replyToDoc.metadata.sender);
      }
    }
  }, [replyToDoc, existingDoc]);

  // --- CC Logic ---
  const handleAddCc = (name: string) => {
      if (isReadOnly) return;
      if (name && !ccList.includes(name)) {
          setCcList([...ccList, name]);
      }
      setCcInput('');
  };
  
  const handleRemoveCc = (nameToRemove: string) => {
      if (isReadOnly) return;
      setCcList(ccList.filter(name => name !== nameToRemove));
  };

  const handleCreateOrUpdate = async () => {
      if (isSaving) return;
      if (!title || !series) {
          addToast('Complete los campos obligatorios', 'error');
          return;
      }
      setIsSaving(true);
      try {
          const payload = {
              projectId: activeProject.id,
              type: docType,
              series,
              title,
              metadata: {
                  trdCode,
                  recipientName,
                  recipientRole,
                  recipientCompany,
                  recipientAddress,
                  ccList
              }
          };

          let newDoc;
          if (existingDoc?.id) {
               const formData = new FormData();
               formData.append('title', title);
               formData.append('series', series);
               formData.append('metadata', JSON.stringify(payload.metadata));
               formData.append('content', '');

               const res = await fetch(`${apiBaseUrl}/documents/${existingDoc.id}`, {
                  method: 'PUT',
                  headers: { 'Authorization': `Bearer ${token}` },
                  body: formData
               });
               if (!res.ok) throw new Error('Error actualizando metadatos');
               newDoc = await res.json();
               addToast('Metadatos actualizados', 'success');
               if (onDocumentUpdated) onDocumentUpdated(newDoc);

          } else {
              const res = await fetch(`${apiBaseUrl}/documents/create`, {
                  method: 'POST',
                  headers: { 
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify(payload)
              });
              if (!res.ok) throw new Error('Error creando documento');
              newDoc = await res.json();
              setActiveDoc(newDoc);
              addToast('Documento generado', 'success');
              setIsMetadataOpen(false);
              if (onDocumentUpdated) onDocumentUpdated(newDoc);
          }
      } catch (e) {
          console.error(e);
          addToast('Error al procesar documento', 'error');
      } finally {
          setIsSaving(false);
      }
  };

  const handleSave = async (options: { forceStatus?: DocumentStatus, customMetadata?: any } = {}) => {
      // Wrapper for saving state logic
      // In OnlyOffice integration, content is saved by Document Server callback usually.
      // Here we might just be updating status or metadata.
      await handleCreateOrUpdate(); // Ensure metadata is sync

      if (options.forceStatus && options.forceStatus !== currentStatus && existingDoc?.id) {
            try {
                 const res = await fetch(`${apiBaseUrl}/documents/${existingDoc.id}/status`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ status: options.forceStatus })
                });
                if (!res.ok) throw new Error('Error actualizando estado');
                if (onSave) onSave({ ...existingDoc, status: options.forceStatus });
            } catch (e: any) {
                addToast(e.message, 'error');
            }
      }
  };

  const handleSign = async (method: SignatureMethod, signatureImage?: string) => {
      if (!signaturePin) {
          addToast('Ingrese su PIN de firma', 'error');
          return;
      }

      if (editorRef.current) {
          addToast('Guardando cambios antes de firmar...', 'info');
          editorRef.current.forceSave();
          await new Promise(resolve => setTimeout(resolve, 4000));
      }

      try {
          const res = await fetch(`${apiBaseUrl}/documents/sign`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ documentId: activeDoc?.id || existingDoc?.id, signaturePin, signatureMethod: method, signatureImage })
          });
          if (!res.ok) {
              const err = await res.json();
              throw new Error(err.error || 'Error al firmar');
          }
          const data = await res.json();
          addToast(`Documento Radicado: ${data.radicadoCode}`, 'success');
          setShowRadicationModal(false);
          if (onSave) onSave({ ...existingDoc, status: data.status, radicadoCode: data.radicadoCode });
          onCancel();
      } catch (error: any) {
          addToast(error.message, 'error');
      }
  };

  const handleRejectWithReason = () => {
      const reason = window.prompt("Por favor indique el motivo del rechazo:");
      if (!reason) return;
      // Add comment logic here if needed (simplified for this view)
      handleSave({ forceStatus: DocumentStatus.DRAFT });
  };

  const handleApproveWithAudit = () => setShowApprovalModal(true);

  const handleApproveAndReturn = async () => {
      const metadata = { ...activeDoc?.metadata };
      if (authorizeSignature) {
          metadata.signatureAuthorized = true;
          metadata.signerId = currentUserId;
      }
      // Update metadata first? For now assuming handleSave handles it or we call update endpoint
      await handleSave({ forceStatus: DocumentStatus.PENDING_SCAN });
      setShowApprovalModal(false);
  };

  const handlePreview = async () => {
      if (!activeDoc?.id || !token) {
          addToast('Guarde el documento primero', 'warning');
          return;
      }
      try {
          addToast('Generando vista previa...', 'info');
          await handleCreateOrUpdate();
          const blob = await previewDocument(token, activeDoc.id);
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank');
      } catch (e: any) {
          addToast(e.message || 'Error generando vista previa', 'error');
      }
  };

  const onlyOfficeConfig = React.useMemo(() => {
    const doc = activeDoc || existingDoc;
    return {
        document: {
            fileType: "docx",
            key: doc ? `${doc.id}-${new Date(doc.updatedAt || Date.now()).getTime()}` : `new-${Date.now()}`,
            title: doc ? `${doc.title}.docx` : "Nuevo Documento.docx",
            url: doc?.contentUrl ? `http://host.docker.internal:4000${doc.contentUrl}` : undefined,
        },
        documentType: "word",
        editorConfig: {
            callbackUrl: "http://host.docker.internal:4000/onlyoffice/callback",
            user: { id: currentUserId || "1", name: currentUserName || "User" }
        },
    };
  }, [activeDoc, existingDoc, currentUserId, currentUserName]);

  const handleOnlyOfficeError = React.useCallback((errorCode: number, errorDescription: string) => {
    console.error('OnlyOffice Load Error:', errorCode, errorDescription);
    addToast(`Error cargando editor: ${errorDescription}`, 'error');
  }, [addToast]);

  return (
    <div className="flex flex-row h-full gap-0 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-inner animate-fade-in relative">
      
      {/* LEFT SIDEBAR: METADATA & CONFIG */}
      <div className={`${isMetadataOpen ? 'w-80' : 'w-0'} transition-all duration-300 bg-white border-r border-slate-200 flex flex-col overflow-hidden relative z-30`}>
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center min-w-[320px]">
              <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Metadatos del Documento</h3>
              <button onClick={() => setIsMetadataOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-5 min-w-[320px]">
              {/* SERIES */}
              <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Serie Documental</label>
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                      <button onClick={() => setSeries('ADM')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${series === 'ADM' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>ADM</button>
                      <button onClick={() => setSeries('TEC')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${series === 'TEC' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>TEC</button>
                  </div>
              </div>

              {/* TRD */}
              <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Código TRD</label>
                  <select value={trdCode} onChange={(e) => setTrdCode(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none bg-white">
                      <option value="">Seleccione...</option>
                      {trdOptions.map(t => <option key={t.code} value={t.code}>{t.code} - {t.seriesName}</option>)}
                  </select>
              </div>

              {/* TITLE */}
              <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Asunto / Título</label>
                  <textarea value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none resize-none h-20" placeholder="Ej: Respuesta a solicitud..." />
              </div>

              {/* RECIPIENT */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-center mb-2">
                     <label className="text-xs font-bold text-slate-400 uppercase">Destinatario</label>
                     <ContactSelector value="" onChange={() => {}} onSelect={(c) => {
                          setRecipientName(c.attention);
                          setRecipientRole(c.position);
                          setRecipientCompany(c.entityName);
                          setRecipientAddress(c.address);
                      }} minimal />
                  </div>
                  <div className="space-y-2">
                      <input placeholder="Nombre" value={recipientName} onChange={e => setRecipientName(e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs bg-white" />
                      <input placeholder="Cargo" value={recipientRole} onChange={e => setRecipientRole(e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs bg-white" />
                      <input placeholder="Empresa" value={recipientCompany} onChange={e => setRecipientCompany(e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs bg-white" />
                      <input placeholder="Dirección" value={recipientAddress} onChange={e => setRecipientAddress(e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs bg-white" />
                  </div>
              </div>

              {/* GENERATE BUTTON */}
              <button
                  onClick={handleCreateOrUpdate}
                  disabled={isSaving}
                  className={`w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                  {isSaving ? 'Guardando...' : (activeDoc ? '💾 Guardar Metadatos' : '⚡ Crear Documento')}
              </button>
          </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-slate-200">
        <div className="bg-white px-4 py-2 border-b border-slate-200 shadow-sm z-50 flex justify-between items-center h-14">
            <div className="flex items-center gap-3">
                <button onClick={() => setIsMetadataOpen(!isMetadataOpen)} className={`p-2 rounded-lg transition-colors ${isMetadataOpen ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-100 text-slate-600'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
                </button>
                <div>
                    <h2 className="text-sm font-bold text-slate-800 truncate max-w-[300px]">{title || 'Nuevo Documento'}</h2>
                    <span className="text-[10px] text-slate-500 uppercase font-mono">{activeDoc?.radicadoCode || 'BORRADOR'} • {currentStatus}</span>
                </div>
            </div>
            
            <div className="flex gap-2">
                <button onClick={onCancel} className="px-3 py-1.5 text-slate-600 text-sm font-medium hover:bg-slate-100 rounded-lg">Cerrar</button>
                
                {activeDoc && (
                   <>
                       <button onClick={handlePreview} className="bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-slate-50 flex items-center gap-1">
                           <span>👁️</span> PDF
                       </button>

                       {userRole === 'ENGINEER' && currentStatus === DocumentStatus.DRAFT && (
                           <button onClick={() => setShowAssignModal(true)} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center gap-1 shadow-sm">
                               <span>📤</span> Enviar a Revisión
                           </button>
                       )}

                       {userRole === 'DIRECTOR' && currentStatus === DocumentStatus.PENDING_APPROVAL && (
                           <>
                               <button onClick={handleRejectWithReason} className="bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-red-200">Rechazar</button>
                               <button onClick={handleApproveWithAudit} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-green-700 shadow-sm">Aprobar</button>
                           </>
                       )}

                       {currentStatus === DocumentStatus.DRAFT && (
                            <button onClick={() => setShowRadicationModal(true)} className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-purple-700 flex items-center gap-1 shadow-sm">
                                <span>✍️</span> Firmar y Radicar
                            </button>
                       )}
                   </>
                )}
            </div>
        </div>

        <div className="flex-1 relative">
            {activeDoc || existingDoc ? (
                <OnlyOfficeEditor ref={editorRef} config={onlyOfficeConfig} documentServerUrl="http://localhost:8080" onLoadError={handleOnlyOfficeError} />
            ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-50">
                    <div className="w-16 h-16 mb-4 rounded-full bg-white shadow-sm flex items-center justify-center">
                        <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                    </div>
                    <p className="font-medium text-sm">Configure los metadatos a la izquierda para comenzar.</p>
                </div>
            )}
        </div>
      </div>

      {/* MODALS */}
      {showRadicationModal && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl transform transition-all scale-100">
                  <h3 className="text-lg font-bold mb-2 text-slate-800">Firmar Digitalmente</h3>
                  <p className="text-slate-500 mb-6 text-sm">Ingrese su PIN de 4 dígitos para autorizar la radicación.</p>
                  <input type="password" placeholder="• • • •" className="w-full text-center text-3xl tracking-[1em] border border-slate-300 rounded-lg py-3 mb-6 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all" maxLength={4} value={signaturePin} onChange={e => setSignaturePin(e.target.value)} autoFocus />
                  <div className="flex gap-3">
                      <button onClick={() => setShowRadicationModal(false)} className="flex-1 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors">Cancelar</button>
                      <button onClick={() => handleSign(SignatureMethod.DIGITAL)} className="flex-1 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 shadow-lg shadow-purple-600/30 transition-all">Confirmar</button>
                  </div>
              </div>
          </div>
      )}

      {showApprovalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl p-6 w-[500px] max-w-full">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Gestionar Aprobación</h3>
             <div className="flex flex-col gap-3">
              <button onClick={() => { setShowApprovalModal(false); setShowRadicationModal(true); }} className="flex items-center gap-3 p-4 border rounded-lg hover:bg-slate-50 transition-colors text-left group">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-200">✍️</div>
                <div><div className="font-semibold text-slate-800">Firmar y Radicar Ahora</div><div className="text-xs text-slate-500">Documento finalizado inmediatamente.</div></div>
              </button>
              <button onClick={() => handleApproveAndReturn()} className="flex items-center gap-3 p-4 border rounded-lg hover:bg-slate-50 transition-colors text-left group">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-200">↩️</div>
                <div><div className="font-semibold text-slate-800">Aprobar y Devolver</div><div className="text-xs text-slate-500">Devuelve al ingeniero para gestión.</div></div>
              </button>
               <div className="ml-14"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={authorizeSignature} onChange={(e) => setAuthorizeSignature(e.target.checked)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" /><span className="text-sm text-slate-700">Autorizar firma digital al ingeniero</span></label></div>
            </div>
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t"><button onClick={() => setShowApprovalModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button></div>
          </div>
        </div>
      )}

      {showAssignModal && (
          <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center animate-fade-in">
              <div className="bg-white p-6 rounded-xl shadow-2xl w-96">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Enviar a Revisión</h3>
                  <select value={selectedDirectorId} onChange={(e) => setSelectedDirectorId(e.target.value)} className="w-full p-2 border border-slate-300 rounded mb-6">
                      <option value="">-- Seleccione Director --</option>
                      {users.filter(u => u.role === 'DIRECTOR').map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                  </select>
                  <div className="flex justify-end gap-2">
                      <button onClick={() => setShowAssignModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancelar</button>
                      <button onClick={async () => {
                              if (!selectedDirectorId) return addToast('Seleccione un director', 'error');
                              try {
                                  const selectedDirector = users.find(u => u.id === selectedDirectorId);
                                  await assignDocument(token || '', existingDoc?.id || activeDoc?.id || '', selectedDirectorId);
                                  await handleSave({ forceStatus: DocumentStatus.PENDING_APPROVAL });
                                  setShowAssignModal(false);
                                  addToast('Enviado a revisión', 'success');
                                  onCancel();
                              } catch (e) { console.error(e); addToast('Error al enviar', 'error'); }
                          }} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded hover:bg-indigo-700">Enviar</button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default DocumentEditor;
