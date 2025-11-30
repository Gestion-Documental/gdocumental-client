
import React, { useState, useMemo } from 'react';
import { 
  Project, Document, DocumentType, DocumentStatus, 
  SignatureMethod, ViewState, User
} from './types';
import { 
  getDocumentThread 
} from './services/mockData';
import { login as apiLogin, fetchDocuments, createInboundDocument, radicarDocument, fetchProjects, createDocument, uploadAttachment } from './services/api';

import LoginPage from './components/LoginPage';
import AdminDashboard from './components/AdminDashboard';
import UserProfile from './components/UserProfile';
import Navbar from './components/Navbar';
import ProjectSelector from './components/ProjectSelector';
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

const App: React.FC = () => {
  // --- AUTH STATE ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // --- APP STATE ---
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [currentView, setCurrentView] = useState<ViewState>('LOGIN');
  const [token, setToken] = useState<string | null>(null);

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

  // Fetch projects on login
  React.useEffect(() => {
    if (!token) return;
    fetchProjects(token)
      .then((p) => {
        setProjects(p);
        if (p.length > 0) {
          setActiveProjectId(p[0].id);
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
  const handleLogin = (user: User, authToken: string) => {
      setCurrentUser(user);
      setToken(authToken);
      setCurrentView(user.role === 'SUPER_ADMIN' ? 'ADMIN_DASHBOARD' : 'DASHBOARD');
  };

  const handleLogout = () => {
      setCurrentUser(null);
      setToken(null);
      setDocuments([]);
      setCurrentView('LOGIN');
  };

  // --- DOCUMENT HANDLERS ---

 const handleSaveDocument = async (data: any) => {
     if (!token) {
        alert('Necesitas iniciar sesión');
        return;
     }

     try {
       // Crear borrador (nuevo)
       let docId = editorDoc?.id;
       if (!docId) {
         const created = await createDocument(token, {
           projectId: activeProjectId,
           type: data.type,
           series: data.series,
           title: data.title,
           content: data.content,
           metadata: data.metadata,
           retentionDate: data.retentionDate,
           isPhysicalOriginal: data.isPhysicalOriginal,
           physicalLocationId: data.physicalLocationId,
         });
         docId = created.id;
       }

       // Si hay que finalizar, radicar
       if (data.shouldFinalize && docId) {
         const updated = await radicarDocument(token, docId, SignatureMethod.DIGITAL);
         setDocuments(docs => {
           const existing = docs.some(d => d.id === updated.id);
           return existing ? docs.map(d => d.id === updated.id ? updated : d) : [updated, ...docs];
         });
         setSignedDocView(updated);
       } else {
         // Subir adjuntos si hay
         if (data.metadata?.attachments?.length && docId) {
           for (const att of data.metadata.attachments) {
             if (att.file) {
               await uploadAttachment(token, docId, att.file);
             }
           }
         }
         // refresca lista después de crear/actualizar
         fetchDocuments(token, activeProjectId).then(setDocuments).catch(() => {});
       }
     } catch (err: any) {
       alert(err.message || 'No se pudo guardar el documento');
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
        alert(err.message || 'No se pudo radicar');
      } finally {
        setFinalizeDoc(null);
      }
  };

  const handleSaveInbound = async (data: any) => {
      if (!token) return alert('Necesitas iniciar sesión');
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
        setDocuments([created, ...documents]);
        setIsInboundRegistering(false);
        setDossierDoc(created);
      } catch (error: any) {
        alert(error.message || 'No se pudo registrar la entrada');
      }
  };
  
  const handleRegisterDelivery = (docId: string, data: { receivedBy: string; receivedAt: string; proof: string }) => {
      const updatedDocs = documents.map(d => {
          if (d.id === docId) {
              return {
                  ...d,
                  deliveryStatus: 'DELIVERED',
                  receivedBy: data.receivedBy,
                  receivedAt: data.receivedAt,
                  deliveryProof: data.proof
              } as Document;
          }
          return d;
      });
      setDocuments(updatedDocs);
      if (dossierDoc && dossierDoc.id === docId) {
           setDossierDoc(updatedDocs.find(d => d.id === docId) || null);
      }
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
      const updatedDocs = documents.map(d => {
          if (d.id === docId) {
              return { 
                  ...d, 
                  status: DocumentStatus.VOID,
                  metadata: {
                      ...d.metadata,
                      voidReason: reason,
                      voidedBy: currentUser?.role,
                      voidedAt: new Date().toISOString()
                  }
              } as Document;
          }
          return d;
      });
      setDocuments(updatedDocs);
      
      // Update local view states if necessary
      if (dossierDoc && dossierDoc.id === docId) {
          const updatedDoc = updatedDocs.find(d => d.id === docId);
          setDossierDoc(updatedDoc || null);
      }
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
      alert(`Transferencia Primaria exitosa. ${docIds.length} expedientes movidos al Archivo Central.\n\nSe ha generado el Acta de Transferencia en PDF (Simulado).`);
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

  // --- RENDER LOGIC ---

  if (!currentUser) {
      return <LoginPage onLogin={handleLogin} />;
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
            />
        );
    }
    
    return (
        <div className="flex gap-6 h-[calc(100vh-140px)]">
             <div className="w-64 flex-shrink-0 overflow-y-auto pr-2">
                 <ProjectSelector 
                    projects={projects}
                    activeProjectId={activeProjectId}
                    onSelectProject={setActiveProjectId}
                 />
                 
                 <div className="mb-6">
                     <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Quick Actions</h3>
                     <div className="flex flex-col gap-2">
                         <button 
                            onClick={() => {
                                setEditorDoc(null);
                                setReplyToDoc(null);
                                setIsEditorOpen(true);
                            }}
                            disabled={!activeProject}
                            className={`flex items-center gap-2 w-full p-3 rounded-lg shadow-md transition-all font-medium text-sm ${activeProject ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}
                         >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            Nuevo Documento
                         </button>
                         <button 
                            onClick={() => setIsInboundRegistering(true)}
                            disabled={!activeProject}
                            className={`flex items-center gap-2 w-full p-3 rounded-lg shadow-md transition-all font-medium text-sm ${activeProject ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}
                         >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Radicar Entrada
                         </button>
                     </div>
                 </div>

             </div>
             
             <div className="flex-1 flex flex-col overflow-hidden">
                 <DashboardStats 
                    documents={projectDocuments} 
                    onShowTransfers={() => setShowTransferReady(true)}
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
                    onEdit={(doc) => {
                        setEditorDoc(doc);
                        setReplyToDoc(null);
                        setIsEditorOpen(true);
                    }}
                    onViewDossier={(doc) => setDossierDoc(doc)}
                    onVoid={(doc) => handleVoidDocument(doc.id, window.prompt("⚠️ Motivo de la anulación (Obligatorio ISO 9001):") || "")}
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

       <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-[calc(100vh-64px)] overflow-hidden">
          {renderContent()}
       </main>

       {threadDoc && (
           <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-end">
               <div className="w-full max-w-2xl h-full animate-slide-in-right">
                   <TraceabilityTimeline 
                     documents={getDocumentThread(threadDoc.id, documents)}
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
