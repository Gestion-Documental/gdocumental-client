
import React, { useState, useMemo } from 'react';
import { 
  Project, Document, DocumentType, DocumentStatus, 
  SignatureMethod, ViewState, User
} from './types';
import { 
  MOCK_PROJECTS, MOCK_DOCUMENTS, simulateRadication, getDocumentThread 
} from './services/mockData';

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
  const [projects] = useState<Project[]>(MOCK_PROJECTS);
  const [activeProjectId, setActiveProjectId] = useState<string>(projects[0].id);
  const [documents, setDocuments] = useState<Document[]>(MOCK_DOCUMENTS);
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');

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

  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];

  const projectDocuments = useMemo(() => 
    documents.filter(d => d.projectId === activeProjectId),
  [documents, activeProjectId]);

  // --- AUTH HANDLERS ---
  const handleLogin = (user: User) => {
      setCurrentUser(user);
      if (user.role === 'SUPER_ADMIN') {
          setCurrentView('ADMIN_DASHBOARD');
      } else {
          setCurrentView('DASHBOARD');
      }
  };

  const handleLogout = () => {
      setCurrentUser(null);
      setCurrentView('LOGIN');
  };

  // --- DOCUMENT HANDLERS ---

  const handleSaveDocument = (data: any) => {
     if (editorDoc) {
         const updatedDocs = documents.map(d => {
             if (d.id === editorDoc.id) {
                 const updated = { ...d, ...data };
                 updated.updatedAt = new Date().toISOString();
                 return updated;
             }
             return d;
         });
         setDocuments(updatedDocs);
     } else {
         const newDoc: Document = {
             id: `new-${Date.now()}`,
             projectId: activeProjectId,
             type: data.type,
             series: data.series,
             title: data.title,
             status: data.forceStatus || DocumentStatus.DRAFT,
             metadata: data.metadata,
             content: data.content,
             createdAt: new Date().toISOString(),
             updatedAt: new Date().toISOString(),
             relatedDocId: replyToDoc?.id,
             requiresResponse: false, 
             signatureMethod: SignatureMethod.DIGITAL,
             author: currentUser?.fullName || 'Usuario'
         };
         
         setDocuments([newDoc, ...documents]);
     }

     setIsEditorOpen(false);
     setEditorDoc(null);
     setReplyToDoc(null);
  };

  const handleSignatureConfirm = (method: SignatureMethod, signatureImage?: string) => {
      if (!finalizeDoc) return;
      
      const radicatedDoc = simulateRadication(finalizeDoc, activeProject, method);
      if (signatureImage) {
          radicatedDoc.signatureImage = signatureImage;
      }
      
      const updatedDocs = documents.map(d => d.id === finalizeDoc.id ? radicatedDoc : d);
      setDocuments(updatedDocs);
      setFinalizeDoc(null);
      setSignedDocView(radicatedDoc);
  };

  const handleSaveInbound = (data: any) => {
      const newDoc: Document = {
          id: `in-${Date.now()}`,
          projectId: activeProjectId,
          type: DocumentType.INBOUND,
          series: data.series,
          title: data.title,
          status: DocumentStatus.RADICADO, 
          metadata: data.metadata,
          content: data.content,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          requiresResponse: true,
          deadline: new Date(Date.now() + 15 * 86400000).toISOString(),
          
          receptionMedium: data.receptionMedium,
          isPhysicalOriginal: data.receptionMedium === 'PHYSICAL',
          author: currentUser?.fullName || 'Recepción'
      };

      const radicatedDoc = simulateRadication(newDoc, activeProject, SignatureMethod.PHYSICAL);

      setDocuments([radicatedDoc, ...documents]);
      setIsInboundRegistering(false);
      setDossierDoc(radicatedDoc);
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
             <div className="w-64 flex-shrink-0 overflow-y-auto hidden lg:block pr-2">
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
                            className="flex items-center gap-2 w-full p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md transition-all font-medium text-sm"
                         >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            Nuevo Documento
                         </button>
                         <button 
                            onClick={() => setIsInboundRegistering(true)}
                            className="flex items-center gap-2 w-full p-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg shadow-md transition-all font-medium text-sm"
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
                 
                 <AlertBanner documents={projectDocuments} />

                 <DocumentList 
                    documents={projectDocuments}
                    userRole={currentUser.role === 'SUPER_ADMIN' ? 'DIRECTOR' : currentUser.role as any}
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
