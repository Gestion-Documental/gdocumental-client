import React, { useEffect, useRef, useState } from 'react';

interface OnlyOfficeEditorProps {
  documentServerUrl: string;
  config: any;
  onLoadComponentError?: (errorCode: number, errorDescription: string) => void;
}

const loadScript = (url: string, id: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.id = id;
    script.src = url;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = (e) => reject(e);
    document.body.appendChild(script);
  });
};

export interface OnlyOfficeEditorRef {
  forceSave: () => void;
}

const OnlyOfficeEditor = React.forwardRef<OnlyOfficeEditorRef, OnlyOfficeEditorProps>(({ documentServerUrl, config, onLoadComponentError }, ref) => {
  const [editorId] = useState(() => `docxEditor-${Math.random().toString(36).substring(7)}`);
  const containerRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    console.log("OnlyOfficeEditor Effect Triggered. Dependencies:", {
        serverUrl: documentServerUrl,
        configChanged: config,
        editorId,
        hasOnError: !!onLoadComponentError
    });
    
    let docEditor: any = null;
    let isMounted = true;

    const init = async () => {
      try {
        await loadScript(`${documentServerUrl}/web-apps/apps/api/documents/api.js`, 'onlyoffice-api-script');
        
        if (!isMounted) return;

        // Poll for DocsAPI
        let attempts = 0;
        const maxAttempts = 20; // 10 seconds (500ms * 20)
        
        const checkDocsAPI = () => {
            const w = window as any;
            if (w.DocsAPI) {
                // Clean up any existing instance with this ID just in case
                if (w.DocEditor && w.DocEditor.instances && w.DocEditor.instances[editorId]) {
                    console.log("Cleaning up existing instance before init:", editorId);
                    w.DocEditor.instances[editorId].destroyEditor();
                }

                console.log("Initializing OnlyOffice Editor:", editorId);
                // OnlyOffice replaces the element with the given ID.
                // We must ensure the element exists.
                if (!containerRef.current) {
                    console.error("Container ref is null!");
                    if (onLoadComponentError) onLoadComponentError(0, "Editor container not found in DOM");
                    return;
                }
                
                // Assign the ID to the ref element just before init to be sure
                containerRef.current.id = editorId;

                docEditor = new w.DocsAPI.DocEditor(editorId, {
                    ...config,
                    events: {
                        onAppReady: () => console.log("OnlyOffice App Ready"),
                        onError: (event: any) => {
                            console.error("OnlyOffice Error:", event);
                            if (onLoadComponentError) {
                                onLoadComponentError(event.data?.errorCode || 0, event.data?.errorDescription || "Unknown error");
                            }
                        },
                        ...config.events // Preserve other events if any
                    }
                });
            } else {
                attempts++;
                if (attempts < maxAttempts) {
                    console.log(`Waiting for DocsAPI... (${attempts}/${maxAttempts})`);
                    setTimeout(checkDocsAPI, 500);
                } else {
                    console.error("DocsAPI not found on window after timeout");
                    if (onLoadComponentError) onLoadComponentError(0, "DocsAPI could not be loaded (timeout)");
                }
            }
        };

        checkDocsAPI();

      } catch (error) {
        console.error("Failed to load OnlyOffice script:", error);
        if (onLoadComponentError) onLoadComponentError(0, "Failed to load script");
      }
    };

    init();

    // Remove debug interval
  
    return () => {
      isMounted = false;
      if (docEditor) {
        console.log("Destroying OnlyOffice Editor:", editorId);
        docEditor.destroyEditor();
        docEditor = null;
      }
      // Also check global instances to be safe
      const w = window as any;
      if (w.DocEditor && w.DocEditor.instances && w.DocEditor.instances[editorId]) {
         w.DocEditor.instances[editorId].destroyEditor();
         delete w.DocEditor.instances[editorId];
      }
    };
  }, [documentServerUrl, config, editorId, onLoadComponentError]);

  React.useImperativeHandle(ref, () => ({
    forceSave: () => {
      const w = window as any;
      if (w.DocEditor && w.DocEditor.instances && w.DocEditor.instances[editorId]) {
          console.log("Force saving OnlyOffice editor...");
          try {
            w.DocEditor.instances[editorId].serviceCommand("forceSave");
          } catch (e) {
            console.warn("Force save command failed", e);
          }
      }
    }
  }));

  return (
    <div className="w-full h-full relative">
      <style>{`
        #${editorId} {
            height: 100% !important;
            width: 100% !important;
            display: block;
        }
        #${editorId} iframe {
            height: 100% !important;
            width: 100% !important;
            display: block;
            position: absolute;
            top: 0;
            left: 0;
        }
      `}</style>
      <div 
        ref={containerRef}
        id={editorId} 
        style={{ height: '100%', width: '100%' }}
      >
        {!loadedRef.current && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        )}
      </div>
    </div>
  );
});

export default OnlyOfficeEditor;
