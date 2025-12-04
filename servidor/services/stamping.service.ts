import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';

interface StampData {
  radicado: string;
  date: string;
  attachments: number;
  qrData: string; // JSON string for QR
  signerName?: string;
  signerRole?: string;
}

export async function stampPdf(pdfBuffer: Buffer, data: StampData, signatureImage?: string): Promise<Buffer> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();

    // Embed content
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Generate QR
    const qrBuffer = await QRCode.toBuffer(data.qrData, { margin: 1, width: 100 });
    const qrImage = await pdfDoc.embedPng(qrBuffer);

    // Stamp dimensions
    const stampWidth = 220;
    const stampHeight = 70;
    const margin = 20;
    
    // Position: Top Right
    const x = width - stampWidth - margin;
    const y = height - stampHeight - margin;

    // Draw Border
    firstPage.drawRectangle({
      x,
      y,
      width: stampWidth,
      height: stampHeight,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
      color: undefined, // Transparent fill
    });

    // Draw Logo/Header Text
    firstPage.drawText('RADIKA FIXED', {
      x: x + 10,
      y: y + stampHeight - 15,
      size: 10,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });
    
    firstPage.drawText('GESTIÓN DOCUMENTAL', {
      x: x + 10,
      y: y + stampHeight - 22,
      size: 5,
      font: helveticaFont,
      color: rgb(0.5, 0.5, 0.5),
    });

    // Draw Info
    const fontSize = 8;
    const labelX = x + 10;
    const valueX = x + 60;
    const startY = y + stampHeight - 35;
    const lineHeight = 10;

    // Radicado
    firstPage.drawText('RADICADO:', { x: labelX, y: startY, size: 5, font: helveticaBold, color: rgb(0.5, 0.5, 0.5) });
    firstPage.drawText(data.radicado, { x: valueX, y: startY, size: fontSize, font: helveticaBold, color: rgb(0, 0, 0) });

    // Fecha
    firstPage.drawText('FECHA:', { x: labelX, y: startY - lineHeight, size: 5, font: helveticaBold, color: rgb(0.5, 0.5, 0.5) });
    firstPage.drawText(data.date, { x: valueX, y: startY - lineHeight, size: fontSize, font: helveticaFont, color: rgb(0, 0, 0) });

    // Anexos
    firstPage.drawText('ANEXOS:', { x: labelX, y: startY - lineHeight * 2, size: 5, font: helveticaBold, color: rgb(0.5, 0.5, 0.5) });
    firstPage.drawText(String(data.attachments), { x: valueX, y: startY - lineHeight * 2, size: fontSize, font: helveticaFont, color: rgb(0, 0, 0) });

    // Draw QR
    const qrSize = 50;
    firstPage.drawImage(qrImage, {
      x: x + stampWidth - qrSize - 10,
      y: y + 10,
      width: qrSize,
      height: qrSize,
    });

    // --- PATCH "BORRADOR" IN TABLE ---
    // The table is at the top. "RADICADO:" is in the second row.
    // We assume standard position.
    // Let's cover the area where "BORRADOR" usually is.
    // Coordinates need to be adjusted based on the DOCX template layout.
    // Assuming the table is near the top, e.g., y = height - 150 approx.
    // We can try to cover a specific area.
    // This is a hack, but safer than regenerating DOCX.
    
    // Let's try to cover the cell next to "RADICADO:".
    // x approx 150, y approx height - 130?
    // We'll draw a white box and text.
    
    // --- PATCH "BORRADOR" IN TABLE ---
    const patchX = 150; 
    const patchY = height - 115;
    const patchWidth = 220;
    const patchHeight = 25;
    
    firstPage.drawRectangle({
        x: patchX,
        y: patchY,
        width: patchWidth,
        height: patchHeight,
        color: rgb(1, 1, 1),
        borderColor: undefined,
        borderWidth: 0
    });
    
    firstPage.drawText(data.radicado, {
        x: patchX + 5,
        y: patchY + 8,
        size: 10,
        font: helveticaBold,
        color: rgb(0, 0, 0),
    });
    // ---------------------------------

    // Draw Signature Block if provided
    // Draw Signature Block if provided (Image OR Name)
    if (signatureImage || data.signerName) {
        try {
            let embeddedSig: any = null;
            
            // 1. Embed Image if provided
            if (signatureImage) {
                let sigBuffer: Buffer | null = null;
                if (signatureImage.startsWith('http')) {
                    const res = await fetch(signatureImage);
                    if (res.ok) sigBuffer = Buffer.from(await res.arrayBuffer());
                } else {
                     const fs = require('fs');
                     const path = require('path');
                     const relativePath = signatureImage.startsWith('/') ? signatureImage.slice(1) : signatureImage;
                     const fullPath = path.join(process.cwd(), relativePath);
                     if (fs.existsSync(fullPath)) {
                         sigBuffer = fs.readFileSync(fullPath);
                     }
                }

                if (sigBuffer) {
                    embeddedSig = await pdfDoc.embedPng(sigBuffer);
                }
            }

            // 2. Find Position (Always needed)
            let sigPage = pages[pages.length - 1];
            let baseY = 200; // Default fallback
            let baseX = 60;
            let pos: { pageIndex: number, x: number, y: number, type: 'KEYWORD' | 'LAST_TEXT' | 'PLACEHOLDER' } | null = null;

            try {
                pos = await findSignaturePosition(pdfBuffer);
                if (pos) {
                    console.log(`[Signature] Positioning based on ${pos.type} at y=${pos.y}`);
                    
                    let targetPageIndex = pages.length - 1;
                    if (pos.pageIndex >= 0 && pos.pageIndex < pages.length) {
                        targetPageIndex = pos.pageIndex;
                    }
                    sigPage = pages[targetPageIndex];

                    if (pos.type === 'PLACEHOLDER') {
                        baseY = pos.y;
                        baseX = pos.x || 60;
                    } else {
                        const gap = pos.type === 'KEYWORD' ? 60 : 60; 
                        baseY = pos.y - gap;
                        baseX = 60; 
                    }
                    
                    if (baseY < 50) baseY = 50; 
                } else {
                    console.log('[Signature] No position found, using default y=200');
                }
            } catch (err) {
                console.warn('Error finding signature position:', err);
            }
            
            // 3. Draw Image (if exists)
            if (embeddedSig) {
                const sigWidth = 120;
                const sigHeight = 60;
                sigPage.drawImage(embeddedSig, {
                    x: baseX + 10, 
                    y: baseY + 2, 
                    width: sigWidth,
                    height: sigHeight,
                });
            }

            // 4. Draw Line/Name/Role (if not placeholder)
            if (!pos || pos.type !== 'PLACEHOLDER') {
                // Draw Line
                sigPage.drawLine({
                    start: { x: baseX, y: baseY },
                    end: { x: baseX + 200, y: baseY },
                    thickness: 1,
                    color: rgb(0, 0, 0),
                });
                
                // Draw Name
                if (data.signerName) {
                    sigPage.drawText(data.signerName, {
                        x: baseX,
                        y: baseY - 15,
                        size: 10,
                        font: helveticaBold,
                        color: rgb(0, 0, 0),
                    });
                }
                
                // Draw Role
                if (data.signerRole) {
                    sigPage.drawText(data.signerRole, {
                        x: baseX,
                        y: baseY - 25,
                        size: 9,
                        font: helveticaFont,
                        color: rgb(0.3, 0.3, 0.3),
                    });
                }
            }
        } catch (e) {
            console.warn('Failed to stamp signature block', e);
        }
    }

    const savedBytes = await pdfDoc.save();
    return Buffer.from(savedBytes);

  } catch (error) {
    console.error('Error stamping PDF:', error);
    return pdfBuffer; // Return original on error
  }
}

// Helper to find text position
async function findSignaturePosition(pdfBuffer: Buffer): Promise<{ pageIndex: number, x: number, y: number, type: 'KEYWORD' | 'LAST_TEXT' | 'PLACEHOLDER' } | null> {
    try {
        let pdfParseLib = require('pdf-parse');
        // Handle ESM/CommonJS interop robustly
        if (typeof pdfParseLib !== 'function' && pdfParseLib.default) {
            pdfParseLib = pdfParseLib.default;
        }

        let found: { pageIndex: number, x: number, y: number, type: 'KEYWORD' | 'LAST_TEXT' | 'PLACEHOLDER' } | null = null;
        let lastPageLowestY: number | null = null;
        let lastPageTextX: number = 60;
        let maxPageIndex = -1;

        const renderPage = (pageData: any) => {
            if (!pageData || !pageData.getTextContent) return "";

            const render_options = {
                normalizeWhitespace: false,
                disableCombineTextItems: false
            };
    
            return pageData.getTextContent(render_options)
            .then(function(textContent: any) {
                // Try to get page index
                const pageIndex = pageData.pageIndex !== undefined ? pageData.pageIndex : 0;
                
                // If we moved to a new page (higher index), reset the "last page" tracker
                if (pageIndex > maxPageIndex) {
                    maxPageIndex = pageIndex;
                    lastPageLowestY = null; // Reset because we are on a new, lower page (visually subsequent)
                }

                for (let item of textContent.items) {
                    const tx = item.transform; // [scaleX, skewY, skewX, scaleY, x, y]
                    const x = tx[4];
                    const y = tx[5];
                    const str = item.str;

                    // Track lowest text on the current "last" page
                    if (pageIndex === maxPageIndex) {
                        if (str.trim().length > 0) {
                             // In PDF, y=0 is bottom. So smaller Y is lower.
                             if (lastPageLowestY === null || y < lastPageLowestY) {
                                 lastPageLowestY = y;
                                 lastPageTextX = x;
                             }
                        }
                    }

                    // Look for Placeholder Line (_____)
                    if (str.includes('____')) {
                        console.log(`[Signature] Found '____' placeholder at page ${pageIndex}, x=${x}, y=${y}`);
                        found = {
                            pageIndex: pageIndex,
                            x: x,
                            y: y,
                            type: 'PLACEHOLDER'
                        };
                    }
                    // Look for "Atentamente" (Case Insensitive)
                    else if (str.toLowerCase().includes('atentamente')) {
                        console.log(`[Signature] Found 'Atentamente' candidate at page ${pageIndex}, x=${x}, y=${y}`);
                        
                        // Logic:
                        // 1. If we haven't found any "Atentamente" yet, take this one.
                        // 2. If we HAVE found one, but this one is on a LATER page, take this one.
                        // 3. If we HAVE found one on the SAME page, but this one is LOWER (smaller Y), take this one.
                        
                        let shouldUpdate = false;
                        if (!found || found.type !== 'KEYWORD') {
                            shouldUpdate = true;
                        } else {
                            if (pageIndex > found.pageIndex) {
                                shouldUpdate = true;
                            } else if (pageIndex === found.pageIndex && y < found.y) {
                                shouldUpdate = true;
                            }
                        }

                        // Don't overwrite PLACEHOLDER if it exists (placeholder has priority? User said "system has to put the line", so maybe placeholder is manual override?)
                        // If user puts placeholder, we use it.
                        if (found && found.type === 'PLACEHOLDER') shouldUpdate = false;

                        if (shouldUpdate) {
                             console.log(`[Signature] Updating best 'Atentamente' to page ${pageIndex}, y=${y}`);
                             found = {
                                pageIndex: pageIndex, 
                                x: x,
                                y: y,
                                type: 'KEYWORD'
                            };
                        }
                    }
                }

                return '';
            });
        };

        await pdfParseLib(pdfBuffer, { pagerender: renderPage });
        
        if (found) return found;
        
        // If keyword not found, return the lowest text position of the last page
        if (lastPageLowestY !== null) {
            console.log(`[Signature] Keyword not found. Using last text at y=${lastPageLowestY}`);
            return {
                pageIndex: maxPageIndex, // Best guess
                x: lastPageTextX,
                y: lastPageLowestY,
                type: 'LAST_TEXT'
            };
        }

        return null;
    } catch (e) {
        console.warn('pdf-parse failed:', e);
        return null;
    }
}


