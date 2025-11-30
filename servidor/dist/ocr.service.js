"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runOcr = runOcr;
const vision_1 = __importDefault(require("@google-cloud/vision"));
const client = process.env.GOOGLE_APPLICATION_CREDENTIALS
    ? new vision_1.default.ImageAnnotatorClient()
    : null;
async function runOcr(buffer) {
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
    let detectedDate = null;
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
function parseDMY(val) {
    const [d, m, y] = val.split('/').map(Number);
    return new Date(y, m - 1, d);
}
