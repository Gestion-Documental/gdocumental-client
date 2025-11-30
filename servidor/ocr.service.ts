import vision from '@google-cloud/vision';

interface OcrResult {
  text: string;
  detectedDate: Date | null;
}

const client = process.env.GOOGLE_APPLICATION_CREDENTIALS
  ? new vision.ImageAnnotatorClient()
  : null;

export async function runOcr(buffer: Buffer): Promise<OcrResult> {
  // Fallback mock if no credentials
  if (!client) {
    const mockText = `MINISTERIO DE TRANSPORTE
Bogotá, 2025-11-25
Asunto: Ajuste de cronograma`;
    return {
      text: mockText,
      detectedDate: new Date('2025-11-25')
    };
  }

  const [result] = await client.textDetection({ image: { content: buffer } });
  const annotations = result.textAnnotations;
  const fullText = annotations && annotations.length > 0 ? annotations[0].description || '' : '';

  // Simple date regex (YYYY-MM-DD or DD/MM/YYYY)
  const match = fullText.match(/\b(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})\b/);
  let detectedDate: Date | null = null;
  if (match) {
    const raw = match[1];
    detectedDate = raw.includes('/') ? parseDMY(raw) : new Date(raw);
    if (Number.isNaN(detectedDate.getTime())) {
      detectedDate = null;
    }
  }

  return {
    text: fullText,
    detectedDate
  };
}

function parseDMY(val: string): Date {
  const [d, m, y] = val.split('/').map(Number);
  return new Date(y, m - 1, d);
}
