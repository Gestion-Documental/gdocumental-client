
import React, { useState, useEffect, useRef } from 'react';
import { DocumentType, DocumentTemplate, Project, Document, DocumentStatus, Comment, Attachment, SeriesType, UserRole, TRDEntry, SignatureMethod } from '../types';
import { MOCK_CONTACTS } from '../services/mockData';
import { previewDocument } from '../services/api';

import FileAttachments from './FileAttachments';
import ContactSelector from './ContactSelector';
import { sanitizeHtml } from '../utils/sanitize';
import DOMPurify from 'dompurify';
import tinymce from 'tinymce/tinymce';
import 'tinymce/icons/default';
import 'tinymce/themes/silver';
import 'tinymce/models/dom';
import 'tinymce/plugins/advlist';
import 'tinymce/plugins/autolink';
import 'tinymce/plugins/lists';
import 'tinymce/plugins/link';
import 'tinymce/plugins/image';
import 'tinymce/plugins/charmap';
import 'tinymce/plugins/preview';
import 'tinymce/plugins/anchor';
import 'tinymce/plugins/searchreplace';
import 'tinymce/plugins/visualblocks';
import 'tinymce/plugins/code';
import 'tinymce/plugins/fullscreen';
import 'tinymce/plugins/insertdatetime';
import 'tinymce/plugins/media';
import 'tinymce/plugins/table';
import 'tinymce/plugins/help';
import 'tinymce/plugins/wordcount';
import 'tinymce/skins/ui/oxide/skin.min.css';
import 'tinymce/skins/content/default/content.min.css';
import { useToast } from './ToastProvider';

declare global {
  interface Window {
    tinymce: any;
  }
}

if (typeof window !== 'undefined') {
  (window as any).tinymce = tinymce;
}

type PageSize = 'A4' | 'LETTER' | 'LEGAL';

const PAGE_SIZES: Record<PageSize, { width: string; height: string; heightMm: number; label: string; bodyWidth: string }> = {
    A4: { width: '210mm', height: '297mm', heightMm: 297, label: 'A4 (210x297mm)', bodyWidth: '170mm' },
    LETTER: { width: '216mm', height: '279mm', heightMm: 279, label: 'Carta (216x279mm)', bodyWidth: '176mm' },
    LEGAL: { width: '216mm', height: '356mm', heightMm: 356, label: 'Oficio (216x356mm)', bodyWidth: '176mm' }
};

// Moved outside to avoid type errors and recreation on render
const PaperContainer = ({ children, className = "", style = {} }: { children?: React.ReactNode, className?: string, style?: React.CSSProperties }) => (
  <div 
    className={`bg-slate-100 mx-auto text-slate-900 relative transition-all duration-500 rounded-sm ${className}`}
    style={style}
  >
      {children}
  </div>
);

const LONG_TEXT_LIMIT = 5000;
const MEDIUM_TEXT_LIMIT = 1000;

// Moved outside, accepts onExecCmd callback
const FallbackToolbar = ({ onExecCmd }: { onExecCmd: (cmd: string, value?: string) => void }) => (
  <div className="sticky top-[65px] z-20 bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-1 flex-wrap shadow-sm">
      <div className="flex gap-1 border-r border-slate-200 pr-2 mr-1">
           <button onClick={() => onExecCmd('bold')} className="p-1.5 hover:bg-slate-100 rounded text-slate-700 font-bold" title="Bold">B</button>
           <button onClick={() => onExecCmd('italic')} className="p-1.5 hover:bg-slate-100 rounded text-slate-700 italic" title="Italic">I</button>
      </div>
  </div>
);

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
  token?: string; // Add token prop
  onDocumentUpdated?: (doc: Document) => void;
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


// ... (existing imports)

import OnlyOfficeEditor, { OnlyOfficeEditorRef } from './OnlyOfficeEditor';

const DocumentEditor: React.FC<DocumentEditorProps> = ({ activeProject, replyToDoc, existingDoc, userRole, onCancel, onSave, onDeleteAttachment, apiBaseUrl, forceReadOnly, token, onDocumentUpdated }) => {

  const { addToast } = useToast();
  const editorRef = useRef<OnlyOfficeEditorRef>(null);
  
  // Local Active Doc State (to handle Wizard creation)
  const [activeDoc, setActiveDoc] = useState<Document | null>(existingDoc);

  // Sync prop changes
  useEffect(() => {
      if (existingDoc) setActiveDoc(existingDoc);
  }, [existingDoc]);

  // Sync state when activeDoc changes (e.g. after Wizard creation)
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

  // New Series State
  const [series, setSeries] = useState<SeriesType>(existingDoc?.series || 'ADM');
  const [isMetadataOpen, setIsMetadataOpen] = useState(true); // Open by default for new docs
  const [showRadicationModal, setShowRadicationModal] = useState(false);
  const [signaturePin, setSignaturePin] = useState('');
  const [isWizardOpen, setIsWizardOpen] = useState(!existingDoc); // Open wizard if new doc


  // ... (existing state)
  
  // Nutrient Toggle


  // ... (rest of the component)
  const [docType, setDocType] = useState(existingDoc?.type || DocumentType.OUTBOUND);
  const [template, setTemplate] = useState<DocumentTemplate>(existingDoc?.metadata?.template || DocumentTemplate.FORMAL_LETTER);
  const [title, setTitle] = useState(existingDoc?.title || '');
  
  // Page Size State
  const [pageSize, setPageSize] = useState<PageSize>((existingDoc?.metadata?.pageSize as PageSize) || 'A4');

  // TRD Logic
  const [trdCode, setTrdCode] = useState<string>(existingDoc?.metadata?.trdCode || '');
  
  const [content, setContent] = useState(existingDoc?.content || '');
  const [originalContent, setOriginalContent] = useState(existingDoc?.content || ''); 
  
  const [comments, setComments] = useState<Comment[]>(existingDoc?.metadata?.comments || [
      { id: 'c1', author: 'System', role: 'SYSTEM', text: 'Borrador iniciado.', createdAt: new Date(Date.now() - 86400000).toISOString() }
  ]);
  
  const [attachments, setAttachments] = useState<Attachment[]>(normalizeAttachments(existingDoc));
  
  // Carbon Copy (CC) State - Default to 'Archivo de Proyecto' for new docs
  const [ccList, setCcList] = useState<string[]>(existingDoc?.metadata?.ccList || ['Archivo de Proyecto']);
  const [ccInput, setCcInput] = useState('');

  const [isDirty, setIsDirty] = useState(!!existingDoc);

  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [editorReady, setEditorReady] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>('');

  const editorId = 'nexus-tinymce-editor';
  const fallbackRef = useRef<HTMLDivElement>(null);

  const [recipientName, setRecipientName] = useState(existingDoc?.metadata?.recipientName || '');
  const [recipientRole, setRecipientRole] = useState(existingDoc?.metadata?.recipientRole || '');
  const [recipientCompany, setRecipientCompany] = useState(existingDoc?.metadata?.recipientCompany || '');
  const [recipientAddress, setRecipientAddress] = useState(existingDoc?.metadata?.recipientAddress || '');

  const currentStatus = existingDoc?.status || DocumentStatus.DRAFT;
  const isFinalized =
    currentStatus === DocumentStatus.RADICADO ||
    currentStatus === DocumentStatus.ARCHIVED ||
    currentStatus === DocumentStatus.VOID ||
    currentStatus === DocumentStatus.PENDING_SCAN;
  
  const isDirectorReviewing = userRole === 'DIRECTOR' && currentStatus === DocumentStatus.PENDING_APPROVAL;
  const isDirectorDrafting = userRole === 'DIRECTOR' && currentStatus === DocumentStatus.DRAFT;
  
  const isReadOnly = isFinalized || (userRole === 'ENGINEER' && currentStatus === DocumentStatus.PENDING_APPROVAL) || !!forceReadOnly;
  
  const hasDirectorChanges = userRole === 'DIRECTOR' && content !== originalContent;

  const handleRemoveAttachment = async (id: string) => {
      const target = attachments.find(a => a.id === id);
      // If it's an existing attachment (no File), sync delete with backend
      if (!isReadOnly && target && !target.file && onDeleteAttachment && existingDoc?.id) {
          try {
              await onDeleteAttachment(id);
          } catch (e) {
              addToast((e as any)?.message || 'No se pudo eliminar el adjunto', 'error');
          }
      }
      setAttachments(prev => prev.filter(a => a.id !== id));
  };

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
      setTemplate(DocumentTemplate.FORMAL_LETTER);
      // Inherit series from parent if possible, otherwise default
      setSeries(replyToDoc.series);
      setTitle(`Ref: Respuesta a ${replyToDoc.radicadoCode || 'Documento'} - ${replyToDoc.title}`);
      if (replyToDoc.metadata?.sender) {
        setRecipientName(replyToDoc.metadata.sender);
      }
      setIsDirty(false);
    }
  }, [replyToDoc, existingDoc]);

  useEffect(() => {
     if (existingDoc && !originalContent && content) {
         setOriginalContent(content);
     }
  }, [existingDoc, content]);

  useEffect(() => {
      setAttachments(normalizeAttachments(existingDoc));
  }, [existingDoc?.id]);

  // Smart Template Logic
  useEffect(() => {
    if (isDirty || isReadOnly) return; 

    if (template === DocumentTemplate.FORMAL_LETTER) {
        const dateStr = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
        
        const generatedHTML = `
           <div style="font-family: 'Times New Roman', serif; color: #000;">
             <p><strong>Ciudad, ${dateStr}</strong></p>
             <br/>
             <p>Señor(a):<br/>
             <strong>${recipientName || '[Nombre del Destinatario]'}</strong><br/>
             ${recipientRole ? recipientRole + '<br/>' : ''}
             ${recipientCompany || '[Empresa]'}<br/>
             ${recipientAddress || ''}</p>
             <br/>
             <p><strong>Ref: ${title || '[Asunto]'}</strong></p>
             <br/>
             <p>Estimado(a):</p>
             <p>${replyToDoc ? 'En respuesta a su comunicación citada en la referencia, nos permitimos informarle...' : 'Escriba aquí el contenido de la comunicación...'}</p>
             <br/><br/><br/>
             <p>Atentamente,</p>
             <br/><br/><br/><br/>
           </div>
        `;
        updateEditorContent(generatedHTML);
    } 
    else if (template === DocumentTemplate.INTERNAL_MEMO) {
        const generatedHTML = `
            <div style="font-family: sans-serif; color: #000;">
                <h2 style="text-align: center; border-bottom: 2px solid #000;">MEMORANDO INTERNO</h2>
                <br/>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="width: 100px; font-weight: bold;">PARA:</td>
                        <td>${recipientName || '[Destinatario]'} - ${recipientRole || '[Área]'}</td>
                    </tr>
                    <tr>
                        <td style="font-weight: bold;">DE:</td>
                        <td>Gerencia del Proyecto (${activeProject.prefix})</td>
                    </tr>
                    <tr>
                        <td style="font-weight: bold;">ASUNTO:</td>
                        <td>${title || '[Asunto]'}</td>
                    </tr>
                    <tr>
                        <td style="font-weight: bold;">FECHA:</td>
                        <td>${new Date().toLocaleDateString()}</td>
                    </tr>
                </table>
                <hr/>
                <br/>
                <p>Cordial saludo,</p>
                <p>Cuerpo del mensaje...</p>
                <br/><br/><br/>
                <p>Atentamente,</p>
                <br/><br/><br/><br/>
            </div>
        `;
        updateEditorContent(generatedHTML);
    }
  }, [template, recipientName, recipientRole, recipientCompany, recipientAddress, title, activeProject, isDirty, replyToDoc, isReadOnly]);

  const updateEditorContent = (html: string) => {
      setContent(html);
      // TinyMCE update logic removed
  };

  const handleManualEdit = (newContent: string) => {
      if (isReadOnly) return;
      setContent(newContent);
      setIsDirty(true);
  };

  const handleTemplateChange = (newTemplate: DocumentTemplate) => {
      if (isReadOnly) return;
      setTemplate(newTemplate);
      setIsDirty(false);
  };

  const selectContact = (contact: typeof MOCK_CONTACTS[0]) => {
      setRecipientCompany(contact.entityName);
      setRecipientName(contact.attention);
      setRecipientRole(contact.position);
      setRecipientAddress(contact.address);
      setIsDirty(false); // Trigger template regen
  };
  
  // --- CC Logic ---
  const handleAddCc = (name: string) => {
      if (isReadOnly) return;
      if (name && !ccList.includes(name)) {
          setCcList([...ccList, name]);
      }
      setCcInput(''); // Clear input whether selected or typed
  };
  
  const handleRemoveCc = (nameToRemove: string) => {
      if (isReadOnly) return;
      setCcList(ccList.filter(name => name !== nameToRemove));
  };
  
  const handleCcKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          e.preventDefault();
          handleAddCc(ccInput);
      }
  };

  // Update TinyMCE styles when pageSize changes
  // Page Size Effect Removed


  // TinyMCE Init Effect Removed

  
  const handleAddComment = (text: string) => {
      const newComment: Comment = {
          id: `c${Date.now()}`,
          author: userRole === 'ENGINEER' ? 'Ingeniero' : 'Director',
          role: userRole,
          text: text,
          createdAt: new Date().toISOString()
      };
      setComments([...comments, newComment]);
  };

  const handleRejectWithReason = () => {
      const reason = window.prompt("Por favor indique el motivo del rechazo:");
      if (!reason) return; 

      const rejectComment: Comment = {
          id: `c${Date.now()}`,
          author: 'Sistema',
          role: 'SYSTEM',
          text: `Documento Devuelto: ${reason}`,
          createdAt: new Date().toISOString()
      };
      const updatedComments = [...comments, rejectComment];
      setComments(updatedComments);
      handleSave({ forceStatus: DocumentStatus.DRAFT, customComments: updatedComments });
  };

  const stripHtml = (html: string) => {
      const tmp = document.createElement("DIV");
      tmp.innerHTML = html;
      return tmp.textContent || tmp.innerText || "";
  }

  const handleApproveWithAudit = () => {
     let commentsToSend = [...comments];
     
     if (userRole === 'DIRECTOR' && hasDirectorChanges) {
         const cleanOriginal = stripHtml(originalContent);
         const cleanModified = stripHtml(content);

         const auditComment: Comment = {
             id: `audit-${Date.now()}`,
             author: 'AUDITORÍA',
             role: 'SYSTEM',
             text: `⚠️ AUDITORÍA: El Director ha realizado correcciones directas sobre la versión original del Ingeniero.`,
             changes: {
                 original: cleanOriginal,
                 modified: cleanModified
             },
             createdAt: new Date().toISOString()
         };
         commentsToSend.push(auditComment);
     }

     handleSave({ shouldFinalize: true, customComments: commentsToSend });
  };

  // Nutrient Toggle
  // Nutrient Toggle Removed - OnlyOffice is now default


  // ... (rest of the component)

  const handleSave = async (options: { shouldFinalize?: boolean, forceStatus?: DocumentStatus, customComments?: Comment[], file?: File }) => {
    const nextStatus = options.forceStatus || currentStatus;
    
    // Prepare Metadata
    const metadataToSave = {
        ...existingDoc?.metadata,
        recipientCompany,
        recipientName,
        recipientRole,
        recipientAddress,
        ccList,
        template,
        pageSize,
        trdCode,
        requiresResponse: trdOptions.find(t => t.code === trdCode)?.responseDays ? true : false,
        deadline: trdOptions.find(t => t.code === trdCode)?.responseDays 
            ? new Date(Date.now() + (trdOptions.find(t => t.code === trdCode)?.responseDays || 15) * 86400000).toISOString() 
            : null,
        securityHash: `${Date.now()}-${Math.random().toString(36).substring(7)}` // Simple hash simulation
    };

    const formData = new FormData();
    formData.append('title', title);
    formData.append('series', series);
    formData.append('metadata', JSON.stringify(metadataToSave));
    
    // For OnlyOffice, we don't save HTML content to the 'content' field anymore, 
    // or we could save a placeholder. The real content is in the .docx file.
    formData.append('content', ''); 
    
    if (options.file) {
        formData.append('file', options.file);
    }

    if (options.shouldFinalize) {
        // Logic for finalize (status update) is handled via separate endpoint usually or we can bundle it?
        // The backend PUT /:id updates content. Status update is POST /:id/status.
        // We might need to chain calls.
    }

    try {
        let savedDoc;
        if (existingDoc?.id) {
            // Update existing
            const res = await fetch(`${apiBaseUrl}/documents/${existingDoc.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                    // 'Content-Type': 'multipart/form-data', // Browser sets this automatically with boundary
                },
                body: formData
            });
            if (!res.ok) throw new Error('Error al guardar');
            savedDoc = await res.json();
            
            // If status change needed
            if (nextStatus !== currentStatus) {
                 const res = await fetch(`${apiBaseUrl}/documents/${existingDoc.id}/status`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ status: nextStatus })
                });
                savedDoc.status = nextStatus;
            }

        } else {
            // Create new
            // Need to append projectId, type, etc.
            formData.append('projectId', activeProject.id);
            formData.append('type', docType);
            
            const res = await fetch(`${apiBaseUrl}/documents/create`, { // Need to check if create supports FormData
                method: 'POST',
                body: formData
            });
             if (!res.ok) throw new Error('Error al crear');
            savedDoc = await res.json();
        }

        addToast('Documento guardado exitosamente', 'success');
        if (onSave) onSave(savedDoc);
    } catch (error) {
        console.error(error);
        addToast('Error al guardar el documento', 'error');
    }
  };




  const handleSign = async (method: SignatureMethod, signatureImage?: string) => {
      if (!signaturePin) {
          addToast('Ingrese su PIN de firma', 'error');
          return;
      }

      // Force save before signing
      if (editorRef.current) {
          addToast('Guardando cambios antes de firmar...', 'info');
          editorRef.current.forceSave();
          // Wait longer for the save to propagate to the server (4s)
          await new Promise(resolve => setTimeout(resolve, 4000));
      }

      try {
          const res = await fetch(`${apiBaseUrl}/documents/sign`, {
              method: 'POST',
              headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ documentId: existingDoc?.id, signaturePin, signatureMethod: method, signatureImage })
          });
          if (!res.ok) {
              const err = await res.json();
              throw new Error(err.error || 'Error al firmar');
          }
          const data = await res.json();
          addToast(`Documento Radicado: ${data.radicadoCode}`, 'success');
          setShowRadicationModal(false);
          if (onSave) onSave({ ...existingDoc, status: data.status, radicadoCode: data.radicadoCode });
          onCancel(); // Close editor
      } catch (error: any) {
          addToast(error.message, 'error');
      }
  };

  const execCmd = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (fallbackRef.current) fallbackRef.current.focus();
  };

  useEffect(() => {
    console.log("DocumentEditor MOUNTED");
    return () => console.log("DocumentEditor UNMOUNTED");
  }, []);

  const openPreview = () => {
    let html = content;
    if (!useFallback && window.tinymce && window.tinymce.get(editorId)) {
      html = window.tinymce.get(editorId).getContent();
    } else if (useFallback && fallbackRef.current) {
      html = fallbackRef.current.innerHTML;
    }
    setPreviewHtml(html);
    setIsPreviewMode(true);
  };

  const closePreview = () => {
    setIsPreviewMode(false);
  };

  const handleOnlyOfficeError = React.useCallback((errorCode: number, errorDescription: string) => {
    console.error('OnlyOffice Load Error:', errorCode, errorDescription);
    addToast(`Error cargando editor: ${errorDescription}`, 'error');
  }, [addToast]);

  const onlyOfficeConfig = React.useMemo(() => {
    const doc = activeDoc || existingDoc;
    const cfg = {
        document: {
            fileType: "docx",
            key: doc ? `${doc.id}-${new Date(doc.updatedAt || Date.now()).getTime()}` : `new-${Date.now()}`,
            title: doc ? `${doc.title}.docx` : "Nuevo Documento.docx",
            url: doc?.contentUrl 
                ? `http://host.docker.internal:4000${doc.contentUrl}` 
                : undefined, // NO FALLBACK to template.docx
        },
        documentType: "word",
        editorConfig: {
            callbackUrl: "http://host.docker.internal:4000/onlyoffice/callback",
            user: {
                id: "1", 
                name: "User" 
            }
        },
    };
    console.log("OnlyOffice Config:", cfg, "Doc:", doc);
    return cfg;
  }, [activeDoc, existingDoc]);

  // ... (previous code)

  // Unified Layout State
  // Unified Layout State
  // Moved to top

  // ... (existing state)

  // REMOVED: isWizardOpen logic
  // REMOVED: isSidebarOpen (right sidebar)

  // ... (handlers)

  const handleCreateOrUpdate = async () => {
      if (!title || !series) {
          addToast('Complete los campos obligatorios', 'error');
          return;
      }
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
              // Update existing
               const formData = new FormData();
               formData.append('title', title);
               formData.append('series', series);
               formData.append('metadata', JSON.stringify(payload.metadata));
               formData.append('content', ''); // No content update here

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
              // Create New
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
              setIsMetadataOpen(false); // Auto-collapse after generation to focus on editor
              if (onDocumentUpdated) onDocumentUpdated(newDoc);
          }
      } catch (e) {
          console.error(e);
          addToast('Error al procesar documento', 'error');
      }
  };

  const handlePreview = async () => {
      if (!activeDoc?.id || !token) {
          addToast('Guarde el documento primero', 'warning');
          return;
      }
      try {
          addToast('Generando vista previa...', 'info');
          // Force save first to ensure latest metadata
          await handleCreateOrUpdate();
          
          const blob = await previewDocument(token, activeDoc.id);
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank');
      } catch (e: any) {
          addToast(e.message || 'Error generando vista previa', 'error');
      }
  };

  return (
    <div className="flex flex-row h-full gap-0 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-inner animate-fade-in relative">
      
      {/* LEFT SIDEBAR: METADATA & CONFIG */}
      <div className={`${isMetadataOpen ? 'w-80' : 'w-0'} transition-all duration-300 bg-white border-r border-slate-200 flex flex-col overflow-hidden relative z-20`}>
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center min-w-[320px]">
              <h3 className="font-bold text-slate-700">Configuración</h3>
              <button onClick={() => setIsMetadataOpen(false)} className="text-slate-400 hover:text-slate-600">
                  ✕
              </button>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6 min-w-[320px]">
              {/* SERIES */}
              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Serie Documental</label>
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                      <button 
                          onClick={() => setSeries('ADM')}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${series === 'ADM' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                          ADM
                      </button>
                      <button 
                          onClick={() => setSeries('TEC')}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${series === 'TEC' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                          TEC
                      </button>
                  </div>
              </div>

              {/* TRD */}
              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Código TRD</label>
                  <select 
                      value={trdCode}
                      onChange={(e) => setTrdCode(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none bg-white"
                  >
                      <option value="">Seleccione...</option>
                      {trdOptions.map(t => (
                          <option key={t.code} value={t.code}>{t.code} - {t.seriesName}</option>
                      ))}
                  </select>
              </div>

              {/* TITLE */}
              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Asunto / Título</label>
                  <textarea 
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none resize-none h-20"
                      placeholder="Ej: Respuesta a solicitud..."
                  />
              </div>

              {/* RECIPIENT */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-3 flex justify-between items-center">
                      Destinatario
                      <ContactSelector 
                          value=""
                          onChange={() => {}}
                          onSelect={(contact) => {
                              setRecipientName(contact.attention);
                              setRecipientRole(contact.position);
                              setRecipientCompany(contact.entityName);
                              setRecipientAddress(contact.address);
                          }}
                          minimal
                      />
                  </label>
                  
                  <div className="space-y-2">
                      <input placeholder="Nombre" value={recipientName} onChange={e => setRecipientName(e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs" />
                      <input placeholder="Cargo" value={recipientRole} onChange={e => setRecipientRole(e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs" />
                      <input placeholder="Empresa" value={recipientCompany} onChange={e => setRecipientCompany(e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs" />
                      <input placeholder="Dirección" value={recipientAddress} onChange={e => setRecipientAddress(e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs" />
                  </div>
              </div>

              {/* CC LIST */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Copia a (CC)</label>
                  <div className="flex gap-2 mb-2">
                      <input 
                          placeholder="Nombre / Cargo" 
                          value={ccInput}
                          onChange={(e) => setCcInput(e.target.value)}
                          onKeyDown={handleCcKeyDown}
                          className="flex-1 border border-slate-300 rounded px-2 py-1.5 text-xs"
                      />
                      <button 
                          onClick={() => handleAddCc(ccInput)}
                          className="bg-slate-200 hover:bg-slate-300 text-slate-600 px-2 rounded text-xs font-bold"
                      >
                          +
                      </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                      {ccList.map((cc, idx) => (
                          <span key={idx} className="bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
                              {cc}
                              {!isReadOnly && (
                                  <button onClick={() => handleRemoveCc(cc)} className="text-red-400 hover:text-red-600 font-bold">×</button>
                              )}
                          </span>
                      ))}
                  </div>
              </div>

              {/* GENERATE BUTTON */}
              <div className="flex flex-col gap-2">
                  <button 
                      onClick={handleCreateOrUpdate}
                      className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                  >
                      <span>{activeDoc ? '💾 Guardar Cambios' : '⚡ Generar Documento'}</span>
                  </button>
                  
                  <button 
                      onClick={handlePreview}
                      className={`w-full py-2 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 text-xs ${activeDoc ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                      title={activeDoc ? "Ver vista previa del PDF" : "Genera el documento primero para ver la vista previa"}
                  >
                      <span>👁️ Vista Previa PDF (con firma)</span>
                  </button>
              </div>
          </div>
      </div>

      {/* MAIN CONTENT: EDITOR */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-slate-100">
        
        {/* TOP BAR */}
        <div className="relative bg-white px-4 py-2 border-b border-slate-200 shadow-sm z-50 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <button 
                    onClick={() => setIsMetadataOpen(!isMetadataOpen)}
                    className={`p-2 rounded-lg transition-colors ${isMetadataOpen ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-100 text-slate-600'}`}
                    title="Configuración del Documento"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
                </button>
                
                <div>
                    <h2 className="text-sm font-bold text-slate-800 truncate max-w-[300px]">
                        {title || 'Nuevo Documento'}
                    </h2>
                    <div className="text-[10px] text-slate-500 flex items-center gap-2">
                        <span className="uppercase">{series}</span>
                        <span>•</span>
                        <span>{currentStatus}</span>
                    </div>
                </div>
            </div>
            
            <div className="flex gap-2">
                <button 
                    onClick={() => {
                        console.log("Close button clicked");
                        onCancel();
                    }} 
                    className="px-3 py-1.5 text-slate-600 text-sm font-medium hover:bg-slate-100 rounded-lg"
                >
                    Cerrar
                </button>
                
                {userRole === 'ENGINEER' && currentStatus === DocumentStatus.DRAFT && (
                    <button 
                        onClick={() => {
                            if (confirm('¿Enviar a revisión?')) handleSave({ forceStatus: DocumentStatus.PENDING_APPROVAL });
                        }}
                        className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center gap-1"
                    >
                        <span>📤</span> Enviar
                    </button>
                )}
                
                {/* Director Actions */}
                {userRole === 'DIRECTOR' && currentStatus === DocumentStatus.PENDING_APPROVAL && (
                    <>
                        <button onClick={handleRejectWithReason} className="bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-red-200">Rechazar</button>
                        <button onClick={handleApproveWithAudit} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-green-700">Aprobar</button>
                    </>
                )}

                {/* Radication */}
                {userRole === 'DIRECTOR' && currentStatus === DocumentStatus.APPROVED && (
                    <button onClick={() => setShowRadicationModal(true)} className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-purple-700">Radicar</button>
                )}
            </div>
        </div>

        {/* EDITOR AREA */}
        <div className="flex-1 relative bg-slate-200">
            {activeDoc || existingDoc ? (
                <OnlyOfficeEditor 
                    ref={editorRef}
                    config={onlyOfficeConfig} 
                    documentServerUrl="http://localhost:8080" 
                    onLoadError={handleOnlyOfficeError}
                />
            ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                    <div className="w-16 h-16 mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="18"></line></svg>
                    </div>
                    <p className="font-medium">Configure los datos a la izquierda para generar el documento</p>
                </div>
            )}
        </div>

      </div>

      {/* RADICATION MODAL */}
      {showRadicationModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
                  <h3 className="text-xl font-bold mb-4">Firmar y Radicar</h3>
                  <p className="text-slate-600 mb-4 text-sm">Ingrese su PIN de firma para proceder.</p>
                  <input 
                      type="password" 
                      placeholder="PIN de 4 dígitos"
                      className="w-full text-center text-2xl tracking-widest border border-slate-300 rounded-lg py-3 mb-6"
                      maxLength={4}
                      value={signaturePin}
                      onChange={e => setSignaturePin(e.target.value)}
                  />
                  <div className="flex gap-3">
                      <button onClick={() => setShowRadicationModal(false)} className="flex-1 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-lg">Cancelar</button>
                      <button onClick={() => handleSign(SignatureMethod.DIGITAL)} className="flex-1 py-2.5 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700">Confirmar</button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default DocumentEditor;
