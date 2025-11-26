
import { Request, Response } from 'express';
// In a real project: import { ImageAnnotatorClient } from '@google-cloud/vision';

// Mocking the type for the purpose of this file without npm install
type VisionClient = any;

export class OCRController {
  private client: VisionClient;

  constructor() {
    // In production: this.client = new ImageAnnotatorClient();
    this.client = null; 
  }

  /**
   * POST /api/ocr/extract
   * Expects 'file' in multipart/form-data
   */
  async extractText(req: any, res: Response) {
    try {
      const fileBuffer = req.file?.buffer;
      
      if (!fileBuffer) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // CHECK: API Credentials
      if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        console.warn("⚠️ GOOGLE_APPLICATION_CREDENTIALS missing. Returning Mock Data.");
        return res.json(this.getMockOCRData());
      }

      // 1. Call Google Cloud Vision API
      // const [result] = await this.client.textDetection(fileBuffer);
      // const detections = result.textAnnotations;
      // const fullText = detections ? detections[0].description : '';
      
      // Simulating API Call for this file structure
      const fullText = "Simulated raw text from Google Vision API..."; 

      // 2. Intelligent Extraction (Regex Pattern Matching)
      const extractedData = this.parseText(fullText);

      return res.json({
        success: true,
        fullText,
        metadata: extractedData
      });

    } catch (error) {
      console.error('OCR Error:', error);
      return res.status(500).json({ error: 'Failed to process image with Google Cloud Vision' });
    }
  }

  /**
   * Parses raw text to find structured metadata using RegEx
   */
  private parseText(text: string) {
    // 1. Date Extraction (DD/MM/YYYY or YYYY-MM-DD)
    const dateRegex = /\b(\d{2}[-/]\d{2}[-/]\d{4}|\d{4}[-/]\d{2}[-/]\d{2})\b/;
    const dateMatch = text.match(dateRegex);

    // 2. Email Extraction
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const emailMatch = text.match(emailRegex);

    // 3. Keyword / Type Detection
    let detectedType = 'OFICIO'; // Default
    if (/resoluci[oó]n/i.test(text)) detectedType = 'RESOLUCION';
    if (/circular/i.test(text)) detectedType = 'CIRCULAR';
    if (/factura/i.test(text)) detectedType = 'FACTURA';
    if (/acta/i.test(text)) detectedType = 'ACTA';

    // 4. Reference Number (Heuristic: "Ref:" or "No.")
    const refRegex = /(?:ref|referencia|radicado|no\.?)\s*[:.]?\s*([A-Z0-9-]+)/i;
    const refMatch = text.match(refRegex);

    return {
      detectedDate: dateMatch ? dateMatch[0] : null,
      detectedEmail: emailMatch ? emailMatch[0] : null,
      detectedType,
      detectedReference: refMatch ? refMatch[1] : null
    };
  }

  private getMockOCRData() {
    return {
      success: true,
      fullText: "MINISTERIO DE TRANSPORTE\nRESOLUCIÓN No. 00123\nBogotá D.C., 25/11/2025\n\nAsunto: Actualización de tarifas.\n\nCordial saludo...",
      metadata: {
        detectedDate: "2025-11-25",
        detectedType: "RESOLUCION",
        detectedEmail: "contacto@minstransporte.gov.co",
        detectedReference: "00123",
        suggestedSubject: "Actualización de tarifas de peaje vigencia 2026",
        suggestedSender: "MINISTERIO DE TRANSPORTE"
      }
    };
  }
}
