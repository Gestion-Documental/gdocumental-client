

import React, { useState, useEffect, useRef } from 'react';
import { DocumentType, DocumentTemplate, Project, Document, DocumentStatus, Comment, Attachment, SeriesType, UserRole } from '../types';
import { MOCK_CONTACTS, MOCK_TRD_SERIES } from '../services/mockData';
import CommentSection from './CommentSection';
import FileAttachments from './FileAttachments';
import ContactSelector from './ContactSelector';
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

declare global {
  interface Window {
    tinymce: any;
  }
}

if (typeof window !== 'undefined') {
  (window as any).tinymce = tinymce;
}

// Moved outside to avoid type errors and recreation on render
const PaperContainer = ({ children, className = "" }: { children?: React.ReactNode, className?: string }) => (
  <div className={`bg-white w-full max-w-[210mm] min-h-[297mm] mx-auto shadow-[0_15px_45px_rgba(0,0,0,0.15)] text-slate-900 relative transition-all duration-500 rounded-sm outline outline-[0.5px] outline-slate-200 ${className}`}>
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

const DocumentEditor: React.FC<DocumentEditorProps> = ({ activeProject, replyToDoc, existingDoc, userRole, onCancel, onSave, onDeleteAttachment, apiBaseUrl }) => {
  // New Series State
  const [series, setSeries] = useState<SeriesType>(existingDoc?.series || 'ADM');
  const [docType, setDocType] = useState<DocumentType>(existingDoc?.type || DocumentType.OUTBOUND);
  const [template, setTemplate] = useState<DocumentTemplate>(existingDoc?.metadata?.template || DocumentTemplate.FORMAL_LETTER);
  const [title, setTitle] = useState(existingDoc?.title || '');
  
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
  const isFinalized = currentStatus === DocumentStatus.RADICADO || currentStatus === DocumentStatus.ARCHIVED;
  
  const isDirectorReviewing = userRole === 'DIRECTOR' && currentStatus === DocumentStatus.PENDING_APPROVAL;
  const isDirectorDrafting = userRole === 'DIRECTOR' && currentStatus === DocumentStatus.DRAFT;
  
  const isReadOnly = isFinalized || (userRole === 'ENGINEER' && currentStatus === DocumentStatus.PENDING_APPROVAL);
  
  const hasDirectorChanges = userRole === 'DIRECTOR' && content !== originalContent;

  const handleRemoveAttachment = async (id: string) => {
      const target = attachments.find(a => a.id === id);
      // If it's an existing attachment (no File), sync delete with backend
      if (!isReadOnly && target && !target.file && onDeleteAttachment && existingDoc?.id) {
          try {
              await onDeleteAttachment(id);
          } catch (e) {
              alert((e as any)?.message || 'No se pudo eliminar el adjunto');
          }
      }
      setAttachments(prev => prev.filter(a => a.id !== id));
  };

  // Filter TRD by selected Series
  const trdOptions = MOCK_TRD_SERIES.filter(trd => {
      // Simple heuristic for mock: 100 series = ADM, 200 series = TEC
      if (series === 'ADM') return trd.code.startsWith('100');
      if (series === 'TEC') return trd.code.startsWith('200');
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
      if (window.tinymce && window.tinymce.get(editorId)) {
          const editor = window.tinymce.get(editorId);
          if (editor.getContent() !== html) {
             editor.setContent(html);
          }
      }
      if (fallbackRef.current) {
          if (fallbackRef.current.innerHTML !== html) {
              fallbackRef.current.innerHTML = html;
          }
      }
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

  useEffect(() => {
    if (isPreviewMode) return;

    if (typeof window.tinymce === 'undefined' || document.compatMode === 'BackCompat') {
        setUseFallback(true);
        setEditorReady(true);
        return;
    }

    try {
        if (window.tinymce.get(editorId)) {
            window.tinymce.remove(`#${editorId}`);
        }

        window.tinymce.init({
            selector: `#${editorId}`,
            height: 860,
            menubar: 'file edit view insert format tools table help',
            statusbar: true,
            skin: 'oxide',
            icons: 'default',
            resize: false,
            readonly: isReadOnly ? 1 : 0, 
            toolbar_sticky: true,
            toolbar_sticky_offset: 65,
            plugins: [
            'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
            'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
            'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
            ],
            toolbar: isReadOnly ? false : 'undo redo | blocks fontfamily fontsize | bold italic underline forecolor backcolor | ' +
            'alignleft aligncenter alignright alignjustify | lineheight | bullist numlist outdent indent | ' +
            'table | removeformat | preview',
            font_family_formats: "Calibri=Calibri,Segoe UI,sans-serif;Times New Roman=Times New Roman,serif;Arial=Arial,Helvetica,sans-serif;Courier New=Courier New,monospace",
            font_size_formats: "10pt 11pt 12pt 14pt 16pt",
            line_height_formats: "1 1.15 1.5 2",
            content_style: `
            body {
                font-family: 'Calibri', 'Segoe UI', sans-serif;
                font-size: 11pt;
                color: #1f2937;
                line-height: 1.5;
                max-width: 170mm;
                margin: 0 auto;
                padding: 25mm 25mm 30mm 25mm;
                background: #fff;
            }
            p { margin: 0 0 12pt 0; }
            h1,h2,h3,h4 { font-family: 'Calibri', 'Segoe UI', sans-serif; margin: 12pt 0 6pt 0; }
            table { border-collapse: collapse; width: 100%; }
            td, th { padding: 4px; }
            `,
            setup: (editor: any) => {
                editor.on('Init', () => {
                    setEditorReady(true);
                    if (content) editor.setContent(content);
                });
                editor.on('Change KeyUp Input', () => {
                    handleManualEdit(editor.getContent());
                });
            }
        }).catch((err: any) => {
            setUseFallback(true);
            setEditorReady(true);
        });
    } catch (e) {
        setUseFallback(true);
        setEditorReady(true);
    }

    return () => {
      if (window.tinymce) {
        try { window.tinymce.remove(`#${editorId}`); } catch(e) {}
        setEditorReady(false);
      }
    };
  }, [isPreviewMode, isReadOnly]);
  
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

  const handleSave = (options: { shouldFinalize?: boolean, forceStatus?: DocumentStatus, customComments?: Comment[] }) => {
    let finalContent = content;
    if (!useFallback && window.tinymce && window.tinymce.get(editorId)) {
       finalContent = window.tinymce.get(editorId).getContent();
    } else if (useFallback && fallbackRef.current) {
       finalContent = fallbackRef.current.innerHTML;
    }

    onSave({
      series, // Passed to save logic
      type: docType,
      title,
      content: finalContent,
      shouldFinalize: options.shouldFinalize,
      forceStatus: options.forceStatus,
      metadata: {
        template,
        trdCode, // SAVE TRD CODE
        recipientName,
        recipientRole,
        recipientCompany,
        recipientAddress,
        comments: options.customComments || comments,
        attachments,
        ccList, // Save Copies
      }
    });
  };

  const execCmd = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (fallbackRef.current) fallbackRef.current.focus();
  };

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

  return (
    <div className="flex flex-row h-full gap-0 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-inner animate-fade-in relative">
      
      <div className="flex-1 flex flex-col h-full relative border-r border-slate-200 overflow-hidden">
        
        <div className="bg-white px-6 py-4 border-b border-slate-200 shadow-sm z-30 flex justify-between items-center sticky top-0">
            <div>
            <h2 className="text-lg font-bold text-slate-800">
                {existingDoc ? `Editando: ${existingDoc.radicadoCode || 'Borrador'}` : (replyToDoc ? 'Redactar Respuesta' : 'Nuevo Documento')}
            </h2>
            <div className="text-xs flex items-center gap-2">
                <span className={`px-1.5 py-0.5 rounded font-bold ${series === 'ADM' ? 'bg-slate-200 text-slate-700' : 'bg-indigo-100 text-indigo-700'}`}>
                    SERIE: {series}
                </span>
                <span className="text-slate-300">|</span>
                <span className={`text-[10px] uppercase font-bold tracking-wider ${currentStatus === DocumentStatus.PENDING_APPROVAL ? 'text-orange-600' : 'text-slate-500'}`}>
                    {currentStatus}
                </span>
            </div>
            </div>
            
            <div className="flex gap-2">
                <button onClick={onCancel} className="text-slate-500 hover:text-slate-800 px-3 py-1.5 text-sm font-medium transition-colors">
                    Cancelar
                </button>
                
                {userRole === 'ENGINEER' && (
                    <>
                        <button 
                            onClick={() => handleSave({})} 
                            className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-1.5 rounded-lg text-sm font-medium shadow-sm transition-all"
                        >
                            Guardar Borrador
                        </button>
                        <button 
                            onClick={() => handleSave({ forceStatus: DocumentStatus.PENDING_APPROVAL })} 
                            className="bg-yellow-500 hover:bg-yellow-400 text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow-md shadow-yellow-500/20 transition-colors flex items-center gap-2"
                        >
                            Solicitar Revisión
                        </button>
                    </>
                )}

                {userRole === 'DIRECTOR' && (
                    <>
                        {currentStatus === DocumentStatus.PENDING_APPROVAL && (
                            <>
                                <button onClick={handleRejectWithReason} className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-4 py-1.5 rounded-lg text-sm font-medium shadow-sm">
                                    Rechazar
                                </button>
                                <button onClick={handleApproveWithAudit} className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow-md">
                                    Aprobar y Firmar
                                </button>
                            </>
                        )}

                        {currentStatus === DocumentStatus.DRAFT && (
                            <>
                                <button onClick={() => handleSave({})} className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-1.5 rounded-lg text-sm font-medium shadow-sm">
                                    Guardar
                                </button>
                                <button onClick={() => handleSave({ shouldFinalize: true })} className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow-md">
                                    Finalizar y Firmar
                                </button>
                            </>
                        )}

                        <button
                          type="button"
                          onClick={openPreview}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-200 shadow-sm"
                        >
                          Vista previa
                        </button>
                    </>
                )}
            </div>
        </div>
        
        {userRole === 'DIRECTOR' && isDirectorReviewing && (
            <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center justify-center gap-2 text-sm text-amber-800 animate-fade-in">
                <strong>Modo Revisión:</strong> Usted está revisando el trabajo de un Ingeniero. El documento es de solo lectura.
            </div>
        )}

        <div className="flex-1 overflow-y-auto p-8 relative scroll-smooth bg-slate-100">
            <div className="max-w-[210mm] mx-auto flex flex-col gap-6">
                
                <div className={`bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-opacity ${isReadOnly ? 'opacity-70 grayscale-[30%]' : ''}`}>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                        
                        {/* SERIES SELECTOR */}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Serie / Depto</label>
                            <select 
                                value={series}
                                onChange={(e) => setSeries(e.target.value as SeriesType)}
                                disabled={isReadOnly}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg text-sm p-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed font-medium"
                            >
                                <option value="ADM">🏢 Administrativa (ADM)</option>
                                <option value="TEC">👷 Técnica (TEC)</option>
                            </select>
                        </div>
                        
                        {/* TRD SELECTOR (REPLACES GENERIC TYPE SELECTOR FOR BETTER UX) */}
                        <div className="md:col-span-2">
                             <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Tabla de Retención (TRD)</label>
                             <select
                                value={trdCode}
                                onChange={(e) => {
                                    setTrdCode(e.target.value);
                                    // Logic to auto-set type based on TRD if needed, for now mostly metadata
                                }}
                                disabled={isReadOnly}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg text-sm p-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed font-medium"
                             >
                                <option value="">-- Seleccionar Serie Documental --</option>
                                {trdOptions.map(trd => (
                                    <option key={trd.code} value={trd.code}>
                                        {trd.code} - {trd.subseriesName} ({trd.retentionGestion} Años)
                                    </option>
                                ))}
                             </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Plantilla</label>
                            <select 
                                value={template}
                                onChange={(e) => handleTemplateChange(e.target.value as DocumentTemplate)}
                                disabled={isReadOnly}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg text-sm p-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed"
                            >
                                <option value={DocumentTemplate.FORMAL_LETTER}>Carta Formal</option>
                                <option value={DocumentTemplate.INTERNAL_MEMO}>Memorando Estándar</option>
                            </select>
                        </div>
                    </div>

                    <div className="border-t border-slate-100 pt-4">
                        <h3 className="text-xs font-bold text-slate-800 uppercase mb-4 flex items-center gap-2">
                            Datos del Destinatario
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            
                            {/* SMART COMBOBOX / AUTOCOMPLETE */}
                            <div className="relative col-span-1 md:col-span-2">
                                <ContactSelector 
                                    value={recipientCompany}
                                    onChange={setRecipientCompany}
                                    onSelect={selectContact}
                                    disabled={isReadOnly}
                                />
                            </div>

                            <div className="col-span-1 md:col-span-2 flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Atención A (Nombre)</label>
                                    <input disabled={isReadOnly} type="text" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Nombre Completo" maxLength={MEDIUM_TEXT_LIMIT} className="w-full p-2 border border-slate-200 rounded bg-slate-50 text-sm focus:bg-white focus:border-blue-400 outline-none disabled:bg-slate-100 disabled:text-slate-500 transition-all" />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Cargo</label>
                                    <input disabled={isReadOnly} type="text" value={recipientRole} onChange={(e) => setRecipientRole(e.target.value)} placeholder="Cargo" maxLength={MEDIUM_TEXT_LIMIT} className="w-full p-2 border border-slate-200 rounded bg-slate-50 text-sm focus:bg-white focus:border-blue-400 outline-none disabled:bg-slate-100 disabled:text-slate-500 transition-all" />
                                </div>
                            </div>
                            
                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Dirección Física</label>
                                <input disabled={isReadOnly} type="text" value={recipientAddress} onChange={(e) => setRecipientAddress(e.target.value)} placeholder="Dirección Física" maxLength={LONG_TEXT_LIMIT} className="w-full p-2 border border-slate-200 rounded bg-slate-50 text-sm focus:bg-white focus:border-blue-400 outline-none disabled:bg-slate-100 disabled:text-slate-500 transition-all" />
                            </div>

                            {/* CARBON COPY (CC) SECTION */}
                            <div className="col-span-1 md:col-span-2 border-t border-slate-100 pt-3 mt-1">
                                <div className="mb-2">
                                    <ContactSelector 
                                        label="Con Copia A (Cc):"
                                        placeholder="Buscar y Agregar..."
                                        value={ccInput}
                                        onChange={setCcInput}
                                        onSelect={(c) => handleAddCc(c.entityName)}
                                        disabled={isReadOnly}
                                        onKeyDown={handleCcKeyDown}
                                    />
                                    {/* Manual Add Trigger (Enter key handled in future or simple blur logic) */}
                                    <div className="flex justify-end mt-1">
                                        <button 
                                            type="button"
                                            onClick={() => handleAddCc(ccInput)} 
                                            disabled={!ccInput || isReadOnly}
                                            className="text-[10px] font-bold text-blue-600 hover:text-blue-800 disabled:opacity-50"
                                        >
                                            + Agregar Manualmente
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="flex flex-wrap gap-2">
                                    {ccList.map((cc, idx) => (
                                        <div key={idx} className="bg-slate-100 border border-slate-200 rounded-full px-3 py-1 flex items-center gap-2 shadow-sm">
                                            <span className="text-xs text-slate-700 font-medium">{cc}</span>
                                            {!isReadOnly && (
                                                <button onClick={() => handleRemoveCc(cc)} className="text-slate-400 hover:text-red-500 rounded-full">
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    {ccList.length === 0 && <span className="text-xs text-slate-400 italic">Sin copias.</span>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {useFallback && !isReadOnly && <FallbackToolbar onExecCmd={execCmd} />}

                <div className={`transition-opacity duration-300 ${editorReady ? 'opacity-100' : 'opacity-0'}`}>
                    <PaperContainer className="p-0 relative group !min-h-[800px] overflow-hidden" >
                        <div className="px-[20mm] pt-[20mm] mb-0 print-hidden-controls">
                            <div className="mb-2 border-b border-transparent group-hover:border-slate-100 transition-colors pb-2">
                                <input 
                                    disabled={isReadOnly}
                                    type="text" 
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    maxLength={LONG_TEXT_LIMIT}
                                    className="w-full text-lg font-bold text-slate-800 placeholder:text-slate-300 outline-none bg-transparent disabled:text-slate-600"
                                    placeholder="Escriba la Referencia del Asunto..." 
                                />
                            </div>
                            </div>

                        <div className="relative min-h-[600px]">
                            {useFallback ? (
                                <div 
                                    ref={fallbackRef}
                                    contentEditable={!isReadOnly}
                                    className="w-full h-full min-h-[600px] outline-none px-[20mm] py-[20mm] font-sans text-[11pt] leading-[1.5] text-slate-800 bg-white"
                                    onInput={(e) => handleManualEdit(e.currentTarget.innerHTML)}
                                    dangerouslySetInnerHTML={{ __html: content }}
                                />
                            ) : (
                                <textarea 
                                    id={editorId}
                                    className="w-full h-full border-none outline-none resize-none bg-transparent"
                                ></textarea>
                            )}
                        </div>
                    </PaperContainer>
                    
                    <FileAttachments 
                        attachments={attachments}
                        onChange={setAttachments}
                        readOnly={isReadOnly}
                        onDeleteAttachment={handleRemoveAttachment}
                        apiBaseUrl={apiBaseUrl}
                    />
                </div>
                <div className="h-20"></div>
            </div>
        </div>

      </div>

      <CommentSection 
        comments={comments}
        currentUserRole={userRole}
        onAddComment={handleAddComment}
      />

      {isPreviewMode && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-start justify-center overflow-auto py-10 px-6">
          <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 relative animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800">Preview</h3>
              <button
                onClick={closePreview}
                className="text-slate-400 hover:text-slate-800 rounded-full p-2 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>
            <div className="p-8 bg-slate-50">
              <div className="bg-white shadow-[0_15px_45px_rgba(0,0,0,0.08)] border border-slate-100 max-w-[210mm] mx-auto min-h-[297mm] p-[20mm] text-slate-900 prose prose-slate">
                <div dangerouslySetInnerHTML={{ __html: previewHtml || '<p><em>No hay contenido para mostrar.</em></p>' }} />
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DocumentEditor;
