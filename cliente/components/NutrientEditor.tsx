import React, { useEffect, useRef, useState } from 'react';
import DocAuth from '@nutrient-sdk/document-authoring';

interface NutrientEditorProps {
  initialFileUrl?: string | null;
  onSave?: (file: File) => void;
}

const NutrientEditor: React.FC<NutrientEditorProps> = ({ initialFileUrl, onSave }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [system, setSystem] = useState<any>(null);
  const [editor, setEditor] = useState<any>(null);

  useEffect(() => {
    async function init() {
      if (!editorRef.current) return;

      try {
        const sys = await DocAuth.createDocAuthSystem();
        setSystem(sys);
        
        // Load the sample document or initial file
        const urlToLoad = initialFileUrl || '/example.docx';
        const response = await fetch(urlToLoad);
        if (!response.ok) throw new Error(`Failed to load ${urlToLoad}`);
        
        const arrayBuffer = await response.arrayBuffer();
        const document = await sys.importDOCX(arrayBuffer);
        
        const ed = await sys.createEditor(editorRef.current, { document });
        setEditor(ed);
      } catch (error) {
        console.error("Failed to initialize Nutrient Editor:", error);
      }
    }

    init();
    
    // Cleanup
    return () => {
        // if (editor) editor.destroy(); // Check SDK docs if destroy exists
    };
  }, [initialFileUrl]);

  const handleSave = async () => {
    if (!editor || !onSave) return;
    try {
      const buffer = await editor.currentDocument().exportDOCX();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      const file = new File([blob], "document.docx", { type: blob.type });
      onSave(file);
    } catch (e) {
      console.error("Error exporting DOCX:", e);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 p-4">
      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4 flex justify-between items-center" role="alert">
        <div>
            <p className="font-bold">Modo de Prueba (Nutrient SDK)</p>
            <p>Este es un editor comercial. Los archivos se guardan como .docx (binario).</p>
        </div>
        {onSave && (
            <button 
                onClick={handleSave}
                className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded"
            >
                Guardar Cambios
            </button>
        )}
      </div>
      <div 
        ref={editorRef} 
        style={{ height: '800px', border: '1px solid #ccc', background: 'white' }} 
      />
    </div>
  );
};

export default NutrientEditor;
