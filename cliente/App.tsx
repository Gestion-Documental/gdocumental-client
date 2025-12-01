
import React, { useState, useMemo } from 'react';
import { 
  Project, Document, DocumentType, DocumentStatus, 
  SignatureMethod, ViewState, User
} from './types';
import { login as apiLogin, fetchDocuments, createInboundDocument, radicarDocument, fetchProjects, createDocument, uploadAttachment, fetchDocument, deleteAttachment, updateDelivery, updateDocument, updateStatus, API_URL, fetchProjectTrd, refreshAccessToken } from './services/api';

import LoginPage from './components/LoginPage';
import AdminDashboard from './components/AdminDashboard';
import UserProfile from './components/UserProfile';
import Navbar from './components/Navbar';
import DocumentList from './components/DocumentList';
import DocumentEditor from './components/DocumentEditor';
import TraceabilityTimeline from './components/TraceabilityTimeline';
import SignatureModal from './components/SignatureModal';
import SignedDocumentView from './components/SignedDocumentView';
import AlertBanner from './components/AlertBanner';
import DashboardStats from './components/DashboardStats';
import DossierView from './components/DossierView';
import ArchiveManager from './components/ArchiveManager';
import InboundRegistration from './components/InboundRegistration';
import { useToast } from './components/ToastProvider';

const App: React.FC = () => {
  const { addToast } = useToast();
  // --- AUTH STATE ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // --- APP STATE ---
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [currentView, setCurrentView] = useState<ViewState>('LOGIN');
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);

  // Editor State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorDoc, setEditorDoc] = useState<Document | null>(null);
  const [replyToDoc, setReplyToDoc] = useState<Document | null>(null);

  // Inbound Registration State
  const [isInboundRegistering, setIsInboundRegistering] = useState(false);

  // Transfer Management State
  const [showTransferReady, setShowTransferReady] = useState(false);

  // Viewer/Modal States
  const [threadDoc, setThreadDoc] = useState<Document | null>(null);
  const [finalizeDoc, setFinalizeDoc] = useState<Document | null>(null);
  const [signedDocView, setSignedDocView] = useState<Document | null>(null);
  const [dossierDoc, setDossierDoc] = useState<Document | null>(null);
  const [showAttentionList, setShowAttentionList] = useState(false);

  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];

  const projectDocuments = useMemo(() => 
    documents.filter(d => d.projectId === activeProjectId),
  [documents, activeProjectId]);

  // Build thread for timeline using current document list (avoids mock data)
  const computeDocumentThread = React.useCallback((rootId: string): Document[] => {
    const current = documents.find(d => d.id === rootId);
    if (!current) return [];

    const visited = new Set<string>();
    const thread: Document[] = [];

    // Walk backwards using relatedDocId
    let ptr: Document | undefined = current;
    while (ptr?.relatedDocId) {
      const parent = documents.find(d => d.id === ptr.relatedDocId);
      if (!parent || visited.has(parent.id)) break;
      thread.unshift(parent);
      visited.add(parent.id);
      ptr = parent;
    }

    // Add current doc
    if (!visited.has(current.id)) {
      thread.push(current);
      visited.add(current.id);
    }

    // Add direct children
    const children = documents.filter(d => d.relatedDocId === rootId);
    children.forEach(child => {
      if (!visited.has(child.id)) {
        thread.push(child);
        visited.add(child.id);
      }
    });

    return thread.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [documents]);

  // Fetch projects on login
  React.useEffect(() => {
    if (!token) return;
    fetchProjects(token)
      .then(async (p) => {
        const withTrd = await Promise.all(
          p.map(async (proj) => {
            try {
              const trd = await fetchProjectTrd(token, proj.id);
              return { ...proj, trd };
            } catch {
              return proj;
            }
          })
        );
        setProjects(withTrd);
        if (withTrd.length > 0) {
          setActiveProjectId(withTrd[0].id);
        }
      })
      .catch(() => {});
  }, [token]);

  // Fetch documents when login/project changes
  React.useEffect(() => {
    if (!token || !activeProjectId) return;
    fetchDocuments(token, activeProjectId)
      .then(setDocuments)
      .catch(() => {});
  }, [token, activeProjectId]);

  // --- AUTH HANDLERS ---
  const handleLogin = (user: User, authToken: string, refresh?: string) => {
      setCurrentUser(user);
      setToken(authToken);
      if (refresh) {
        setRefreshToken(refresh);
        localStorage.setItem('radika_refresh', refresh);
      }
      setCurrentView(user.role === 'SUPER_ADMIN' ? 'ADMIN_DASHBOARD' : 'DASHBOARD');
  };

  const handleLogout = () => {
      setCurrentUser(null);
      setToken(null);
      setRefreshToken(null);
      setDocuments([]);
      setCurrentView('LOGIN');
      localStorage.removeItem('radika_refresh');
  };

  // --- DOCUMENT HANDLERS ---

 const handleSaveDocument = async (data: any) => {
     if (!token) {
        addToast('Necesitas iniciar sesión', 'error');
        return;
    }

    try {
      const attachmentsToUpload = (data.metadata?.attachments || []).filter((att: any) => att.file);
      const metadataClean = {
         ...(data.metadata || {}),
         attachments: (data.metadata?.attachments || []).map((att: any) => ({
           id: att.id,
           name: att.name,
           type: att.type,
           size: att.size,
           url: att.url,
         }))
       };

       // Crear o actualizar borrador
       let docId = editorDoc?.id;
       if (!docId) {
         const created = await createDocument(token, {
           projectId: activeProjectId,
           type: data.type,
           series: data.series,
           title: data.title,
           content: data.content,
           metadata: metadataClean,
           retentionDate: data.retentionDate,
           isPhysicalOriginal: data.isPhysicalOriginal,
           physicalLocationId: data.physicalLocationId,
         });
         docId = created.id;
       } else {
         await updateDocument(token, docId, {
           title: data.title,
           content: data.content,
           metadata: {
              ...(editorDoc?.metadata || {}),
             ...(metadataClean || {}),
           },
         });
       }

       // Subir adjuntos nuevos (solo los que tengan file)
       if (attachmentsToUpload.length && docId) {
         for (const att of attachmentsToUpload) {
           await uploadAttachment(token, docId, att.file);
         }
       }

       // Cambiar estado si aplica
       if (data.forceStatus && docId) {
         await updateStatus(token, docId, data.forceStatus);
       }

       // Si hay que finalizar, radicar
       let updatedDoc: Document | null = null;
       if (data.shouldFinalize && docId) {
         updatedDoc = await radicarDocument(token, docId, SignatureMethod.DIGITAL);
         setSignedDocView(updatedDoc);
      } else if (docId) {
        updatedDoc = await fetchDocument(token, docId);
      }

       if (updatedDoc) {
         setDocuments(docs => {
           const exists = docs.some(d => d.id === updatedDoc!.id);
           return exists ? docs.map(d => d.id === updatedDoc!.id ? updatedDoc! : d) : [updatedDoc!, ...docs];
         });
      } else {
        fetchDocuments(token, activeProjectId).then(setDocuments).catch(() => {});
      }
    } catch (err: any) {
       if (err.code === 401 || err.code === 403) return handleLogout();
       addToast(err.message || 'No se pudo guardar el documento', 'error');
    } finally {
      setIsEditorOpen(false);
      setEditorDoc(null);
      setReplyToDoc(null);
    }
  };

  const handleSignatureConfirm = async (method: SignatureMethod, _signatureImage?: string) => {
      if (!finalizeDoc || !token) return;
      try {
        const updated = await radicarDocument(token, finalizeDoc.id, method);
        setDocuments(docs => docs.map(d => d.id === updated.id ? updated : d));
        setSignedDocView(updated);
      } catch (err: any) {
        if (err.code === 401 || err.code === 403) return handleLogout();
        addToast(err.message || 'No se pudo radicar', 'error');
      } finally {
        setFinalizeDoc(null);
      }
  };

  const handleSaveInbound = async (data: any) => {
      if (!token) return addToast('Necesitas iniciar sesión', 'error');
      try {
        const defaultDeadline = new Date(Date.now() + 15 * 86400000).toISOString();
        const payload = {
          projectId: activeProjectId,
          series: data.series,
          title: data.title,
          metadata: data.metadata,
          requiresResponse: true,
          deadline: data.metadata?.deadline || data.metadata?.documentDate || defaultDeadline,
          receptionMedium: data.receptionMedium,
        };
        const created = await createInboundDocument(token, payload);
        if (data.file) {
          await uploadAttachment(token, created.id, data.file);
        }
        const refreshed = await fetchDocument(token, created.id);
        setDocuments([refreshed, ...documents]);
        setIsInboundRegistering(false);
        setDossierDoc(refreshed);
        addToast('Entrada radicada correctamente', 'success');
      } catch (error: any) {
        if (error.code === 401 || error.code === 403) return handleLogout();
        addToast(error.message || 'No se pudo registrar la entrada', 'error');
      }
  };
  
  const handleRegisterDelivery = (docId: string, data: { receivedBy: string; receivedAt: string; proof: string }) => {
      if (!token) return;
      updateDelivery(token, docId, data)
        .then(async () => {
          const updated = await fetchDocument(token, docId);
          setDocuments(docs => docs.map(d => d.id === updated.id ? updated : d));
          if (dossierDoc && dossierDoc.id === docId) {
               setDossierDoc(updated);
          }
        })
        .catch(err => addToast(err.message || 'No se pudo registrar la entrega', 'error'));
  };

  const handleAssignLocation = (docId: string, locationId: string) => {
      const updatedDocs = documents.map(d => {
          if (d.id === docId) {
              return { ...d, physicalLocationId: locationId };
          }
          return d;
      });
      setDocuments(updatedDocs);
      if (dossierDoc && dossierDoc.id === docId) {
          setDossierDoc(updatedDocs.find(d => d.id === docId) || null);
      }
  }

  const handleVoidDocument = (docId: string, reason: string) => {
      if (!token) return;
      (async () => {
        try {
          await updateDocument(token, docId, {
            metadata: {
              ...(documents.find(d => d.id === docId)?.metadata || {}),
              voidReason: reason,
              voidedBy: currentUser?.fullName,
              voidedAt: new Date().toISOString()
            }
          });
          await updateStatus(token, docId, DocumentStatus.VOID);
          const updated = await fetchDocument(token, docId);
          setDocuments(docs => docs.map(d => d.id === updated.id ? updated : d));
          if (dossierDoc && dossierDoc.id === docId) {
              setDossierDoc(updated);
          }
          addToast('Documento anulado con éxito', 'success');
       } catch (err: any) {
         if (err.code === 401 || err.code === 403) return handleLogout();
         addToast(err.message || 'No se pudo anular el documento', 'error');
        }
      })();
  };

  const handleTransferBatch = (docIds: string[]) => {
      const updatedDocs = documents.map(d => {
          if (docIds.includes(d.id)) {
              // Simulate Transfer to Central Archive
              return { 
                  ...d, 
                  physicalLocationId: 'loc-central', // Central Archive ID
                  metadata: {
                      ...d.metadata,
                      transferredAt: new Date().toISOString()
                  }
              };
          }
          return d;
      });
      setDocuments(updatedDocs);
      setShowTransferReady(false);
      addToast(`Transferencia exitosa: ${docIds.length} expedientes movidos al Archivo Central.`, 'success');
  };

  const handleDispatchUpdate = (docId: string, payload: { method: 'NEXUS_MAIL' | 'EXTERNAL_CLIENT'; dispatchDate: string; emailTrackingStatus: 'SENT' | 'OPENED' | 'CLICKED'; dispatchUser?: string; trackingId?: string; }) => {
      const updatedDocs = documents.map(d => {
          if (d.id === docId) {
              return {
                  ...d,
                  dispatchMethod: payload.method,
                  dispatchDate: payload.dispatchDate,
                  emailTrackingStatus: payload.emailTrackingStatus,
                  metadata: {
                      ...d.metadata,
                      dispatchUser: payload.dispatchUser,
                      dispatchTrackingId: payload.trackingId
                  }
              } as Document;
          }
          return d;
      });
      setDocuments(updatedDocs);
      if (dossierDoc && dossierDoc.id === docId) {
          setDossierDoc(updatedDocs.find(d => d.id === docId) || null);
      }
  };

  const handleDeleteAttachment = async (docId: string, attachmentId: string) => {
    if (!token) return;
    try {
      await deleteAttachment(token, docId, attachmentId);
      const updated = await fetchDocument(token, docId);
      setDocuments(docs => docs.map(d => d.id === updated.id ? updated : d));
      if (dossierDoc && dossierDoc.id === docId) setDossierDoc(updated);
    } catch (err: any) {
      if (err.code === 401 || err.code === 403) return handleLogout();
      addToast(err.message || 'No se pudo eliminar el adjunto', 'error');
    }
  };

  const handleExportClientCsv = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/documents/export/csv`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('No se pudo exportar');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'correspondencia_cliente.csv';
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      addToast(err.message || 'No se pudo exportar el Excel', 'error');
    }
  };

  const handleChangeStatus = async (docId: string, status: DocumentStatus) => {
    if (!token) return;
    try {
      await updateStatus(token, docId, status);
      const refreshed = await fetchDocument(token, docId);
      setDocuments(docs => docs.map(d => d.id === refreshed.id ? refreshed : d));
      if (dossierDoc && dossierDoc.id === docId) setDossierDoc(refreshed);
    } catch (err: any) {
      if (err.code === 401 || err.code === 403) return handleLogout();
      addToast(err.message || 'No se pudo actualizar el estado', 'error');
    }
  };

  // --- RENDER LOGIC ---

  // Intentar sesión desde refresh token almacenado
  React.useEffect(() => {
    if (token || currentUser) return;
    const stored = localStorage.getItem('radika_refresh');
    if (!stored) return;
    refreshAccessToken(stored)
      .then((data) => {
        handleLogin(data.user, data.token, stored);
      })
      .catch(() => {
        localStorage.removeItem('radika_refresh');
      });
  }, [token, currentUser]);

  if (!currentUser) {
      return <LoginPage onLogin={(user, t, r) => handleLogin(user, t, r || undefined)} />;
  }

  if (currentView === 'ADMIN_DASHBOARD' && currentUser.role === 'SUPER_ADMIN') {
      return <AdminDashboard onLogout={handleLogout} />;
  }

  if (currentView === 'USER_PROFILE') {
      return <UserProfile user={currentUser} onBack={() => setCurrentView('DASHBOARD')} />;
  }

  const renderContent = () => {
    if (isInboundRegistering) {
        return (
            <InboundRegistration 
                activeProject={activeProject}
                onCancel={() => setIsInboundRegistering(false)}
                onSave={handleSaveInbound}
            />
        );
    }

    if (currentView === 'ARCHIVE_MANAGER') {
        return <ArchiveManager documents={projectDocuments} />;
    }

    if (signedDocView) {
        return <SignedDocumentView document={signedDocView} onClose={() => setSignedDocView(null)} />;
    }

    if (dossierDoc) {
        return <DossierView 
            document={dossierDoc} 
            userRole={currentUser.role === 'SUPER_ADMIN' ? 'DIRECTOR' : currentUser.role as any}
            onClose={() => setDossierDoc(null)} 
            onRegisterDelivery={handleRegisterDelivery}
            onAssignLocation={handleAssignLocation}
            onVoidDocument={handleVoidDocument}
            onDispatchUpdate={(payload) => handleDispatchUpdate(dossierDoc.id, payload)}
            currentUserName={currentUser.fullName}
            onDeleteAttachment={(attId) => handleDeleteAttachment(dossierDoc.id, attId)}
            apiBaseUrl={API_URL}
            onChangeStatus={(status) => handleChangeStatus(dossierDoc.id, status)}
        />;
    }

    if (isEditorOpen) {
        return (
            <DocumentEditor 
                activeProject={activeProject}
                replyToDoc={replyToDoc}
                existingDoc={editorDoc}
                userRole={currentUser.role === 'SUPER_ADMIN' ? 'DIRECTOR' : currentUser.role as any}
                onCancel={() => {
                    setIsEditorOpen(false);
                    setEditorDoc(null);
                    setReplyToDoc(null);
                }}
                onSave={handleSaveDocument}
                onDeleteAttachment={(attId) => editorDoc?.id && handleDeleteAttachment(editorDoc.id, attId)}
                apiBaseUrl={API_URL}
                forceReadOnly={!!editorDoc && (editorDoc.status === DocumentStatus.PENDING_SCAN || editorDoc.status === DocumentStatus.ARCHIVED || editorDoc.status === DocumentStatus.VOID)}
            />
        );
    }
    
    return (
        <div className="flex flex-col gap-6 pb-12">
             <div className="flex-1 flex flex-col">
                 <div className="flex flex-col gap-3 mb-6">
                   <div className="flex flex-col sm:flex-row gap-2 justify-start">
                     <button 
                        onClick={() => {
                            setEditorDoc(null);
                            setReplyToDoc(null);
                            setIsEditorOpen(true);
                        }}
                        disabled={!activeProject}
                        className={`flex items-center gap-2 px-5 py-3 min-w-[180px] max-w-[200px] justify-center rounded-lg shadow-md transition-all font-semibold text-sm ${activeProject ? 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-700/40' : 'bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed'}`}
                     >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Nuevo Documento
                     </button>
                     <button 
                        onClick={() => setIsInboundRegistering(true)}
                        disabled={!activeProject}
                        className={`flex items-center gap-2 px-5 py-3 min-w-[180px] max-w-[200px] justify-center rounded-lg shadow-md transition-all font-semibold text-sm ${activeProject ? 'bg-orange-500 hover:bg-orange-600 text-white border border-orange-600/40' : 'bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed'}`}
                     >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Radicar Entrada
                     </button>
                   </div>
                 </div>

                 <DashboardStats 
                    documents={projectDocuments} 
                    onShowTransfers={() => setShowTransferReady(true)}
                    onExportClientCsv={handleExportClientCsv}
                 />
                 
                 <AlertBanner 
                    documents={projectDocuments} 
                    onReviewAll={() => {
                        setShowTransferReady(false);
                        setCurrentView('DASHBOARD');
                        setShowAttentionList(true);
                        setTimeout(() => {
                          const anchor = document.getElementById('document-list-anchor');
                          anchor?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 0);
                    }}
                 />

                 <DocumentList 
                    documents={projectDocuments}
                    userRole={currentUser.role === 'SUPER_ADMIN' ? 'DIRECTOR' : currentUser.role as any}
                    attentionFilter={showAttentionList}
                    onClearAttentionFilter={() => setShowAttentionList(false)}
                    isTransferView={showTransferReady}
                    onCloseTransferView={() => setShowTransferReady(false)}
                    onTransferBatch={handleTransferBatch}
                    onOpenFinalizeModal={(doc) => setFinalizeDoc(doc)}
                    onViewThread={(doc) => setThreadDoc(doc)}
                    onReply={(doc) => {
                        setReplyToDoc(doc);
                        setEditorDoc(null);
                        setIsEditorOpen(true);
                    }}
                    onEdit={async (doc) => {
                        if (!token) return;
                        try {
                          const fullDoc = await fetchDocument(token, doc.id);
                          setEditorDoc(fullDoc);
                        } catch {
                          setEditorDoc(doc);
                        }
                        setReplyToDoc(null);
                        setIsEditorOpen(true);
                    }}
                 onViewDossier={async (doc) => {
                     if (!token) return;
                     try {
                       const fullDoc = await fetchDocument(token, doc.id);
                       setDossierDoc(fullDoc);
                     } catch {
                       setDossierDoc(doc);
                     }
                 }}
                    onVoid={(doc) => handleVoidDocument(doc.id, window.prompt("⚠️ Motivo de la anulación (Obligatorio ISO 9001):") || "")}
                    token={token || undefined}
                    onReplaceDoc={(updated) => {
                      setDocuments(prev => prev.map(d => d.id === updated.id ? updated : d));
                    }}
                 />
             </div>
        </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
       <Navbar 
         currentUser={currentUser}
         projects={projects}
         activeProjectId={activeProjectId}
         onSelectProject={setActiveProjectId}
         onToggleSchema={() => {}}
         onNavigate={setCurrentView}
         currentView={currentView}
         onLogout={handleLogout}
       />

       <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 min-h-screen">
          {renderContent()}
       </main>

       {threadDoc && (
           <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-end">
               <div className="w-full max-w-2xl h-full animate-slide-in-right">
                   <TraceabilityTimeline 
                    documents={computeDocumentThread(threadDoc.id)}
                    onClose={() => setThreadDoc(null)}
                  />
               </div>
           </div>
       )}

       {finalizeDoc && (
           <SignatureModal 
             document={finalizeDoc}
             user={currentUser}
             onClose={() => setFinalizeDoc(null)}
             onConfirm={handleSignatureConfirm}
           />
       )}
    </div>
  );
};

export default App;
