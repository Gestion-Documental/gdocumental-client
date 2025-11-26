
import { ReceptionMedium } from "../types";

export interface OCRResult {
  success: boolean;
  fullText: string;
  metadata: {
    detectedDate?: string;
    detectedType?: string;
    detectedReference?: string;
    suggestedSender?: string;
    suggestedSubject?: string;
  };
}

/**
 * Service to handle OCR interaction.
 * In a real app, this calls the Node.js backend endpoint `/api/ocr/extract`.
 */
export const analyzeDocumentWithAI = async (file: File): Promise<OCRResult> => {
  console.log(`[GoogleVisionService] Uploading ${file.name} (${file.size} bytes) to Cloud Vision...`);

  // MOCK NETWORK LATENCY
  await new Promise(resolve => setTimeout(resolve, 2500));

  // MOCK INTELLIGENT RESPONSE
  // Simulates that the AI found specific data in the PDF
  return {
    success: true,
    fullText: "CONTENIDO EXTRAÍDO...\nFECHA: 2025-11-20\nREF: MTI-EXT-2025-999...",
    metadata: {
      detectedDate: new Date().toISOString().slice(0, 10), // Today for demo
      detectedType: "OFICIO",
      detectedReference: "MTI-EXT-2025-884",
      suggestedSender: "MINISTERIO DE TRANSPORTE E INFRAESTRUCTURA (MTI)",
      suggestedSubject: "Resolución Oficial: Ajuste de Cronograma de Obra Fase 2 - Puente Norte"
    }
  };
};
