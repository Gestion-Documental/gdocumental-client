import { Router, Response } from 'express';
import { PrismaClient, DocumentStatus, UserRole, DocumentType } from '@prisma/client';
import { AuthenticatedRequest } from './auth.middleware';
import { checkRole } from './rbac.middleware';
import { generateRadicado } from './radication.service';
import { upload } from './upload.middleware';
import { getStorage, getStorageDriver } from './storage/index';
import path from 'path';
import fs from 'fs';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import fetch from 'node-fetch';
import sanitizeHtml from 'sanitize-html';
import multer from 'multer';
import { runOcr } from './ocr.service';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { convertToPdf } from './services/conversion.service';
import { stampPdf } from './services/stamping.service';
import { Document as WordDocument, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, Header, Footer, BorderStyle } from "docx";

const prisma = new PrismaClient();
const router = Router();

const deliveryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes o PDF'));
    }
  },
});

const contentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.mimetype === 'application/msword'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos Word (.docx)'));
    }
  },
});

function computeDeadlineFromTrd(metadata: any, projectTrd: any[] | null | undefined): string | null {
  const trdCode = metadata?.trdCode;
  const dateBase = metadata?.documentDate ? new Date(metadata.documentDate) : new Date();
  if (trdCode && Array.isArray(projectTrd)) {
    const entry = projectTrd.find((t: any) => (t.code || '').toLowerCase() === trdCode.toLowerCase());
    const days = entry?.responseDays;
    if (typeof days === 'number' && days > 0) {
      const final = new Date(dateBase.getTime() + days * 86400000);
      return final.toISOString();
    }
  }
  // fallback: solo si se explicitó requiresResponse
  if (metadata?.requiresResponse) {
    const final = new Date(dateBase.getTime() + 15 * 86400000);
    return final.toISOString();
  }
  return null;
}

async function logAudit(userId: string | undefined, action: string, entityType?: string, entityId?: string, details?: string) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || 'system',
        action,
        entityType,
        entityId,
        details: details || '',
        actor: userId || 'system',
        actorEmail: '',
      },
    });
  } catch (e) {
    console.warn('Audit log error', e);
  }
}

// List documents for a project (basic)
router.get(
  '/',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { projectId } = req.query;
      const docs = await prisma.document.findMany({
        where: projectId ? { projectId: projectId as string } : undefined,
        orderBy: { createdAt: 'desc' },
        include: { 
          attachments: true,
          author: { select: { fullName: true, email: true, role: true } },
          assignedToUser: { select: { id: true, fullName: true, email: true, role: true } },
          physicalLocation: true
        },
      });
      return res.json(docs);
    } catch (err) {
      console.error('List documents error:', err);
      return res.status(500).json({ error: 'Failed to list documents' });
    }
  }
);

// Export CSV with client-specific headers
router.get(
  '/export/csv',
  checkRole([UserRole.ENGINEER, UserRole.DIRECTOR, UserRole.SUPER_ADMIN]),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const docs = await prisma.document.findMany({
        orderBy: { createdAt: 'asc' },
        include: { attachments: true },
      });

      const headers = [
        'CÓDIGO CONSECUTIVO',
        'DÍA',
        'MES',
        'AÑO',
        'ANEXOS SI/NO',
        'No. FOLIOS',
        'TIPO DE ANEXO',
        'EMPRESA',
        'NOMBRE O CARGO',
        'CON COPIA',
        'ASUNTO',
        'RESPONSABLE ENVÍO',
        'FECHA RECIBIDO DESTINATARIO',
        'No. RECIBIDO DESTINATARIO',
        'FECHA RECIBIDO COPIA',
        'No. RECIBIDO COPIA',
      ];

      const rows = docs.map((d) => {
        const m: any = d.metadata || {};
        const created = d.createdAt ? new Date(d.createdAt) : new Date();
        const delivery = m.delivery || {};
        const annexYes = (d.attachments?.length || 0) > 0 ? 'SI' : 'NO';
        const annexPages = m.annexPages || '';
        const annexType = m.annexType || '';
        const recipientCompany = m.recipientCompany || '';
        const recipientName = m.recipientName || m.recipient || '';
        const cc = Array.isArray(m.ccList) ? m.ccList.join('; ') : '';
        const subject = d.title || '';
        const sentBy = m.sentBy || m.author || '';
        const recvDate = delivery.receivedAt || '';
        const recvNumber = delivery.receiptNumber || '';
        const copyDate = delivery.copyReceivedAt || '';
        const copyNumber = delivery.copyReceiptNumber || '';

        return [
          d.radicadoCode || '',
          created.getDate(),
          created.getMonth() + 1,
          created.getFullYear(),
          annexYes,
          annexPages,
          annexType,
          recipientCompany,
          recipientName,
          cc,
          subject,
          sentBy,
          recvDate,
          recvNumber,
          copyDate,
          copyNumber,
        ]
          .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
          .join(',');
      });

      const csv = [headers.join(','), ...rows].join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="correspondencia.csv"');
      return res.send('\uFEFF' + csv); // BOM for Excel
    } catch (error) {
      console.error('Export CSV error:', error);
      return res.status(500).json({ error: 'No se pudo exportar el CSV' });
    }
  }
);

// Export etiqueta PDF con QR
router.get(
  '/:id/label',
  checkRole([UserRole.ENGINEER, UserRole.DIRECTOR, UserRole.SUPER_ADMIN]),
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const logoQuery = req.query.logo as string | undefined;
    const headerText = (req.query.header as string | undefined) || 'Radika • Etiqueta de Radicado';
    try {
      const doc = await prisma.document.findUnique({
        where: { id },
        include: { project: true },
      });
      if (!doc) return res.status(404).json({ error: 'Documento no encontrado' });
      if (!doc.radicadoCode) return res.status(400).json({ error: 'Documento aún no radicado' });

      const qrPayload = {
        radicado: doc.radicadoCode,
        project: doc.project?.code,
        id: doc.id,
        hash: (doc.metadata as any)?.securityHash || null,
      };
      const qrDataUrl = await QRCode.toDataURL(JSON.stringify(qrPayload), { margin: 1, width: 300 });
      const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');

      // Try to fetch logo (query param, doc metadata, env)
      const logoUrl =
        logoQuery ||
        (doc.metadata as any)?.logoUrl ||
        process.env.RADIKA_LOGO_URL;
      let logoBuffer: Buffer | null = null;
      if (logoUrl) {
        try {
          const resp = await fetch(logoUrl);
          if (resp.ok) {
            const arr = await resp.arrayBuffer();
            logoBuffer = Buffer.from(arr);
          }
        } catch (e) {
          console.warn('No se pudo cargar logo para etiqueta', e);
        }
      }

      const pdf = new PDFDocument({ size: 'A6', margin: 16 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${doc.radicadoCode}.pdf"`);
      pdf.pipe(res);

      // Logo y encabezado
      if (logoBuffer) {
        pdf.image(logoBuffer, pdf.x, pdf.y, { fit: [64, 32] });
        pdf.moveDown(0.8);
      }

      pdf.fontSize(12).fillColor('#0f172a').text(headerText, { align: 'left' });
      pdf.moveDown(0.5);
      pdf.fontSize(10).fillColor('#1f2937');
      pdf.text(`Radicado: ${doc.radicadoCode}`);
      pdf.text(`Proyecto: ${doc.project?.name || doc.projectId} (${doc.project?.code || ''})`);
      pdf.text(`Serie: ${doc.series} • Tipo: ${doc.type}`);
      pdf.text(`Estado: ${doc.status}`);
      pdf.text(`Fecha: ${new Date(doc.createdAt).toLocaleString()}`);
      if ((doc.metadata as any)?.deadline) {
        pdf.text(`Deadline: ${new Date((doc.metadata as any).deadline).toLocaleDateString()}`);
      }
      if ((doc.metadata as any)?.trdCode) {
        pdf.text(`TRD: ${(doc.metadata as any).trdCode}`);
      }
      pdf.text(`Asunto: ${doc.title}`, { width: 250 });

      const qrX = pdf.page.width - 110;
      const qrY = pdf.y - 80 > 16 ? pdf.y - 80 : pdf.y + 8;
      pdf.image(qrBuffer, qrX, qrY, { fit: [90, 90] });

      pdf.end();
    } catch (err) {
      console.error('Label export error:', err);
      return res.status(500).json({ error: 'No se pudo generar la etiqueta' });
    }
  }
);

// Get single document
router.get(
  '/:id',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const doc = await prisma.document.findUnique({
        where: { id },
        include: { 
          attachments: true,
          author: { select: { fullName: true, email: true, role: true } },
          assignedToUser: { select: { id: true, fullName: true, email: true, role: true } },
          physicalLocation: true
        },
      });
      if (!doc) return res.status(404).json({ error: 'Documento no encontrado' });
      res.json(doc);
    } catch (err) {
      console.error('Get document error:', err);
      res.status(500).json({ error: 'Failed to fetch document' });
    }
  }
);

// Update draft document
router.put(
  '/:id',
  checkRole([UserRole.ENGINEER, UserRole.DIRECTOR]),
  contentUpload.single('file'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { title, content, series, retentionDate, isPhysicalOriginal, physicalLocationId, replyToId } = req.body;
      const file = req.file;

      let metadata = req.body.metadata;
      if (typeof metadata === 'string') {
        try {
          metadata = JSON.parse(metadata);
        } catch (e) {
          console.warn('Failed to parse metadata JSON', e);
        }
      }

      const doc = await prisma.document.findUnique({ where: { id } });
      if (!doc) return res.status(404).json({ error: 'Documento no encontrado' });
      if (
        doc.status === DocumentStatus.RADICADO ||
        doc.status === DocumentStatus.ARCHIVED ||
        doc.status === DocumentStatus.VOID
      ) {
        return res.status(400).json({ error: 'No se puede editar un documento finalizado/anulado' });
      }
      if (req.user?.role === UserRole.ENGINEER && doc.status !== DocumentStatus.DRAFT) {
        return res.status(403).json({ error: 'Solo directores pueden editar documentos no borrador' });
      }

      // Validar TRD contra proyecto
      if (metadata?.trdCode) {
        const project = await prisma.project.findUnique({ where: { id: doc.projectId }, select: { trd: true } as any });
        const trdList = (project as any)?.trd || [];
        const found = trdList.find((t: any) => (t.code || '').toLowerCase() === (metadata.trdCode || '').toLowerCase());
        if (!found) {
          return res.status(400).json({ error: 'TRD no válida para el proyecto' });
        }
      }

      let computedDeadline: string | null = metadata?.deadline || null;
      if (!computedDeadline && metadata?.requiresResponse) {
        const project = await prisma.project.findUnique({ where: { id: doc.projectId }, select: { trd: true } as any });
        computedDeadline = computeDeadlineFromTrd(metadata, (project as any)?.trd);
      }

      // Prepare final values for potential regeneration
      const finalTitle = title ?? doc.title;
      const finalSeries = series ?? doc.series;
      const finalMetadata = metadata 
            ? { ...(doc.metadata as any), ...metadata, deadline: computedDeadline ?? null }
            : (doc.metadata as any);

      let contentUrl = undefined;
      if (file) {
        const storage = getStorage();
        const stored = await storage.save({
          buffer: file.buffer,
          filename: `content-${id}-${Date.now()}.docx`,
          contentType: file.mimetype,
        });
        contentUrl = stored.url;
      } else if (doc.type === DocumentType.OUTBOUND || doc.type === 'OUTBOUND') {
         // REGENERATE DOCX
         try {
             console.log("Regenerating DOCX for:", finalTitle);
             const docx = new WordDocument({
                styles: {
                    default: {
                        document: { run: { font: "Ubuntu" } },
                        heading1: { run: { font: "Ubuntu" } },
                        heading2: { run: { font: "Ubuntu" } },
                    },
                },
                sections: [{
                    properties: {},
                    headers: {
                        default: new Header({
                            children: [
                                new Paragraph({
                                    children: [new TextRun({ text: "[NOMBRE DE LA EMPRESA]", bold: true, size: 28 })],
                                    alignment: AlignmentType.CENTER,
                                }),
                                new Paragraph({
                                    children: [new TextRun({ text: "[Departamento / Gerencia]", italics: true, size: 24 })],
                                    alignment: AlignmentType.CENTER,
                                }),
                                new Paragraph({
                                    text: "",
                                    border: { bottom: { color: "000000", space: 1, style: BorderStyle.SINGLE, size: 6 } },
                                }),
                            ],
                        }),
                    },
                    footers: {
                        default: new Footer({
                            children: [
                                new Paragraph({
                                    children: [new TextRun({ text: "Dirección: [DIRECCIÓN DE LA EMPRESA]", size: 20 })],
                                    alignment: AlignmentType.CENTER,
                                }),
                            ],
                        }),
                    },
                    children: [
                        // Metadata Table
                        new Table({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            rows: [
                                new TableRow({
                                    children: [
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "FECHA:", bold: true })] })], width: { size: 20, type: WidthType.PERCENTAGE } }),
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun(new Date().toLocaleDateString('es-CO'))] })] }),
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "SERIE:", bold: true })] })], width: { size: 20, type: WidthType.PERCENTAGE } }),
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun(finalSeries || 'ADM')] })] }),
                                    ],
                                }),
                                new TableRow({
                                    children: [
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "RADICADO:", bold: true })] })] }),
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun("BORRADOR")] })], columnSpan: 3 }),
                                    ],
                                }),
                            ],
                        }),
                        new Paragraph({ text: "" }), new Paragraph({ text: "" }), new Paragraph({ text: "" }), new Paragraph({ text: "" }),

                        // Recipient Block
                        new Paragraph({ children: [new TextRun({ text: "Señor(a):", bold: true })] }),
                        new Paragraph({ children: [new TextRun({ text: finalMetadata?.recipientName || '', bold: true })] }),
                        new Paragraph({ children: [new TextRun(finalMetadata?.recipientRole || '')] }),
                        new Paragraph({ children: [new TextRun(finalMetadata?.recipientCompany || '')] }),
                        new Paragraph({ children: [new TextRun(finalMetadata?.recipientAddress || '')] }),

                        new Paragraph({ text: "" }), new Paragraph({ text: "" }),

                        // Title
                        new Paragraph({
                            children: [new TextRun({ text: `REF: ${finalTitle || 'Sin Título'}`, bold: true, size: 24 })],
                            alignment: AlignmentType.RIGHT,
                        }),

                        new Paragraph({ text: "" }), new Paragraph({ text: "" }),

                        // Body Placeholder
                        new Paragraph({ children: [new TextRun("Estimado(a):")] }),
                        new Paragraph({ text: "" }),
                        new Paragraph({ children: [new TextRun("Por medio de la presente... (Escriba aquí el contenido de su carta)")] }),

                        new Paragraph({ text: "" }), new Paragraph({ text: "" }), new Paragraph({ text: "" }),

                        // Signature
                        new Paragraph({ children: [new TextRun("Atentamente,")] }),
                        new Paragraph({ text: "" }), new Paragraph({ text: "" }), new Paragraph({ text: "" }),
                        new Paragraph({ text: "" }), new Paragraph({ text: "" }), new Paragraph({ text: "" }),
                        new Paragraph({ text: "" }), new Paragraph({ text: "" }),

                        // CC List
                        ...(finalMetadata?.ccList && Array.isArray(finalMetadata.ccList) && finalMetadata.ccList.length > 0 ? [
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: "Copia: " + finalMetadata.ccList.join(", "),
                                        size: 16, // 8pt
                                    }),
                                ],
                            }),
                        ] : []),
                    ],
                }],
            });

             const buffer = await Packer.toBuffer(docx);
             const storage = getStorage();
             const stored = await storage.save({
                 buffer: buffer,
                 filename: `draft-${doc.id}-${Date.now()}.docx`,
                 contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
             });
             contentUrl = stored.url;
             console.log("Regenerated DOCX saved to:", contentUrl);
         } catch (e) {
             console.error("Error regenerating DOCX:", e);
         }
      }

      const updated = await prisma.document.update({
        where: { id },
        data: {
          title: title ?? doc.title,

          content: content ? sanitizeHtml(content, {
             allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
             allowedAttributes: { ...sanitizeHtml.defaults.allowedAttributes, img: ['src'] }
          }) : doc.content,
          contentUrl: contentUrl ?? doc.contentUrl, // Update if new file
          metadata: metadata
            ? { ...(doc.metadata as any), ...metadata, deadline: computedDeadline ?? null }
            : undefined,
          series: series ?? doc.series,
          retentionDate: retentionDate ?? doc.retentionDate,
          isPhysicalOriginal: isPhysicalOriginal ? String(isPhysicalOriginal) === 'true' : doc.isPhysicalOriginal, // Handle string from FormData
          physicalLocationId: physicalLocationId ?? doc.physicalLocationId,
          replyToId: replyToId ?? doc.replyToId,
          updatedAt: new Date(),
        },
      });

      res.json(updated);
    } catch (error) {
      console.error('Update document error:', error);
      res.status(500).json({ error: 'Failed to update document' });
    }
  }
);

// Assign document to user
router.put(
  '/:id/assign',
  checkRole([UserRole.DIRECTOR, UserRole.SUPER_ADMIN, UserRole.ENGINEER]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { userId } = req.body; // userId can be null to unassign

      const doc = await prisma.document.update({
        where: { id },
        data: { assignedToUserId: userId },
        include: { assignedToUser: true }
      });

      await logAudit(req.user?.id, 'DOCUMENT_ASSIGN', 'Document', id, `Asignado a ${doc.assignedToUser?.fullName || 'Nadie'}`);
      res.json(doc);
    } catch (error) {
      console.error('Assignment error', error);
      res.status(500).json({ error: 'Error asignando documento' });
    }
  }
);

// Upload attachment for a document
router.post(
  '/:id/attachments',
  checkRole([UserRole.ENGINEER, UserRole.DIRECTOR]),
  upload.single('file'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const file = req.file;
      if (!file) return res.status(400).json({ error: 'Archivo requerido' });

      const doc = await prisma.document.findUnique({ where: { id } });
      if (!doc) return res.status(404).json({ error: 'Documento no encontrado' });
      if (
        doc.status === DocumentStatus.ARCHIVED ||
        doc.status === DocumentStatus.VOID
      ) {
        return res.status(400).json({ error: 'No se pueden subir adjuntos a documentos archivados o anulados' });
      }

      // --- STAMPING LOGIC ---
      let finalBuffer = file.buffer;
      if (file.mimetype === 'application/pdf') {
        try {
          const { stampPdf } = await import('./services/stamping.service');
          
          // Count existing attachments to get the correct number for the stamp
          const existingCount = await prisma.attachment.count({ where: { documentId: id } });
          
          finalBuffer = await stampPdf(file.buffer, {
            radicado: doc.radicadoCode || 'PENDIENTE',
            date: new Date().toLocaleDateString(),
            attachments: existingCount + 1,
            qrData: JSON.stringify({
              id: doc.id,
              radicado: doc.radicadoCode,
              hash: (doc.metadata as any)?.securityHash
            })
          });
        } catch (err) {
          console.warn('Failed to stamp PDF, saving original', err);
        }
      }
      // -----------------------

      const storage = getStorage();
      const stored = await storage.save({
        buffer: finalBuffer,
        filename: file.originalname,
        contentType: file.mimetype,
      });

      const attachment = await prisma.attachment.create({
        data: {
          filename: file.originalname,
          url: stored.url,
          storagePath: stored.key,
          size: finalBuffer.length, // Use stamped size
          documentId: id,
          logEntryId: null,
        },
      });

      await logAudit(req.user?.id, 'ATTACHMENT_UPLOAD', 'Document', id, `Subió ${file.originalname}`);
      res.json(attachment);
    } catch (error) {
      console.error('Attachment upload error', error);
      res.status(500).json({ error: 'No se pudo subir el archivo' });
    }
  }
);

// Download all attachments as ZIP
router.get(
  '/:id/zip',
  checkRole([UserRole.ENGINEER, UserRole.DIRECTOR, UserRole.SUPER_ADMIN]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const doc = await prisma.document.findUnique({
        where: { id },
        include: { attachments: true }
      });

      if (!doc) return res.status(404).json({ error: 'Documento no encontrado' });
      if (doc.attachments.length === 0) return res.status(400).json({ error: 'No hay adjuntos para descargar' });

      const archiver = require('archiver');
      const archive = archiver('zip', { zlib: { level: 9 } });

      res.attachment(`${doc.radicadoCode || 'documento'}_anexos.zip`);

      archive.pipe(res);

      const storage = getStorage();

      for (const att of doc.attachments) {
        // If local storage, we can append file directly
        if (process.env.STORAGE_DRIVER === 'local' || !process.env.STORAGE_DRIVER) {
           const fs = require('fs');
           const path = require('path');
           // storagePath is relative to uploads usually, or absolute?
           // LocalStorage saves as `uploads/filename`.
           // Let's check LocalStorage implementation. 
           // It returns `key` which is the relative path.
           const filePath = path.join(process.cwd(), att.storagePath || '');
           if (fs.existsSync(filePath)) {
             archive.file(filePath, { name: att.filename });
           }
        } else {
           // If S3, we need to fetch it (not implemented yet fully for stream)
           // For now assuming local as per context
        }
      }

      await archive.finalize();
      await logAudit(req.user?.id, 'ZIP_DOWNLOAD', 'Document', id, `Descargó paquete ZIP`);

    } catch (error) {
      console.error('ZIP download error', error);
      res.status(500).json({ error: 'Error generando ZIP' });
    }
  }
);

// Download attachment
router.get(
  '/attachments/:attachmentId/download',
  checkRole([UserRole.ENGINEER, UserRole.DIRECTOR]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { attachmentId } = req.params;
      const att = await prisma.attachment.findUnique({ where: { id: attachmentId } });
      if (!att) return res.status(404).json({ error: 'Adjunto no encontrado' });

      const driver = getStorageDriver();
      if (driver === 'local' && att.storagePath) {
        const filePath = path.join(process.env.LOCAL_STORAGE_PATH || path.join(process.cwd(), 'uploads'), att.storagePath);
        if (fs.existsSync(filePath)) {
          return res.download(filePath, att.filename);
        }
      }

      // Para S3 u otros, devolver URL pública
      if (att.url) {
        return res.redirect(att.url);
      }

      return res.status(404).json({ error: 'No se pudo servir el archivo' });
    } catch (error) {
      console.error('Download attachment error', error);
      res.status(500).json({ error: 'No se pudo descargar el adjunto' });
    }
  }
);

// List attachments of a document
router.get(
  '/:id/attachments',
  checkRole([UserRole.ENGINEER, UserRole.DIRECTOR]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const attachments = await prisma.attachment.findMany({
        where: { documentId: id },
        orderBy: { uploadedAt: 'desc' },
      });
      res.json(attachments);
    } catch (error) {
      console.error('List attachments error', error);
      res.status(500).json({ error: 'No se pudieron listar los adjuntos' });
    }
  }
);

// Delete attachment
router.delete(
  '/:id/attachments/:attachmentId',
  checkRole([UserRole.ENGINEER, UserRole.DIRECTOR]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id, attachmentId } = req.params;
      const att = await prisma.attachment.findUnique({ where: { id: attachmentId } });
      if (!att || att.documentId !== id) {
        return res.status(404).json({ error: 'Adjunto no encontrado' });
      }
      const doc = await prisma.document.findUnique({ where: { id } });
      if (!doc) return res.status(404).json({ error: 'Documento no encontrado' });
      if (
        doc.status === DocumentStatus.RADICADO ||
        doc.status === DocumentStatus.ARCHIVED ||
        doc.status === DocumentStatus.VOID
      ) {
        return res.status(400).json({ error: 'No se pueden eliminar adjuntos de documentos finalizados/anulados' });
      }
      const storage = getStorage();
      if (att.storagePath) {
        await storage.delete(att.storagePath);
      }
      await prisma.attachment.delete({ where: { id: attachmentId } });
      await logAudit(req.user?.id, 'ATTACHMENT_DELETE', 'Document', id, `Adjunto ${attachmentId}`);
      res.json({ ok: true });
    } catch (error) {
      console.error('Delete attachment error', error);
      res.status(500).json({ error: 'No se pudo eliminar el adjunto' });
    }
  }
);

// Update status (generic)
router.post(
  '/:id/status',
  checkRole([UserRole.DIRECTOR, UserRole.ENGINEER]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body as { status: DocumentStatus };
      const doc = await prisma.document.findUnique({ where: { id } });
      if (!doc) return res.status(404).json({ error: 'Documento no encontrado' });
      const role = req.user?.role;

      // Validaciones simples
      if (doc.status === DocumentStatus.VOID) return res.status(400).json({ error: 'Documento anulado' });
      if (doc.status === DocumentStatus.RADICADO && status === DocumentStatus.DRAFT) {
        return res.status(400).json({ error: 'No se puede regresar a borrador' });
      }
      if (doc.status === DocumentStatus.RADICADO && status === DocumentStatus.PENDING_APPROVAL) {
        return res.status(400).json({ error: 'No se puede revertir un radicado a aprobación' });
      }

      // Restricción: ENGINEER solo puede enviar a PENDING_APPROVAL
      if (role === UserRole.ENGINEER && status !== DocumentStatus.PENDING_APPROVAL) {
        return res.status(403).json({ error: 'No autorizado para esta transición' });
      }

      const validTransitions: Record<DocumentStatus, DocumentStatus[]> = {
        DRAFT: [DocumentStatus.PENDING_APPROVAL, DocumentStatus.VOID],
        PENDING_APPROVAL: [DocumentStatus.RADICADO, DocumentStatus.VOID, DocumentStatus.PENDING_SCAN, DocumentStatus.DRAFT],
        PENDING_SCAN: [DocumentStatus.RADICADO, DocumentStatus.VOID, DocumentStatus.PENDING_APPROVAL], // Allow reverting to approval if needed? Or just Radicado/Void
        RADICADO: [DocumentStatus.ARCHIVED, DocumentStatus.VOID],
        ARCHIVED: [DocumentStatus.VOID],
        VOID: [],
      };
      if (!validTransitions[doc.status]?.includes(status)) {
        return res.status(400).json({ error: 'Transición de estado no permitida' });
      }

      const updated = await prisma.document.update({
        where: { id },
        data: { status, updatedAt: new Date() },
      });
      await logAudit(req.user?.id, 'DOCUMENT_STATUS', 'Document', updated.id, `Estado ${doc.status} -> ${status}`);
      res.json(updated);
    } catch (error) {
      console.error('Update status error', error);
      res.status(500).json({ error: 'No se pudo actualizar el estado' });
    }
  }
);



// Register delivery info
router.post(
  '/:id/delivery',
  checkRole([UserRole.ENGINEER, UserRole.DIRECTOR]),
  deliveryUpload.single('file'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { receivedBy, receivedAt } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'Debe subir una evidencia (foto o PDF)' });
      }

      const doc = await prisma.document.findUnique({ where: { id } });
      if (!doc) return res.status(404).json({ error: 'Documento no encontrado' });
      if (doc.type !== DocumentType.OUTBOUND) {
        return res.status(400).json({ error: 'Entrega aplica solo a salidas (OUTBOUND)' });
      }
      if (doc.status !== DocumentStatus.RADICADO && doc.status !== DocumentStatus.PENDING_SCAN) {
        return res.status(400).json({ error: 'Solo documentos radicados pueden registrarse como entregados' });
      }

      const storage = getStorage();
      const stored = await storage.save({
        buffer: file.buffer,
        filename: `delivery-${id}-${Date.now()}-${file.originalname}`,
        contentType: file.mimetype,
      });

      const updated = await prisma.document.update({
        where: { id },
        data: {
          metadata: {
              ...(doc.metadata as any),
              delivery: { receivedBy, receivedAt, deliveryProof: stored.url },
          },
          updatedAt: new Date(),
        },
      });
      await logAudit(req.user?.id, 'DOCUMENT_DELIVERY', 'Document', updated.id, `Entrega registrada ${receivedBy || ''}`);
      res.json(updated);
    } catch (error) {
      console.error('Delivery update error', error);
      res.status(500).json({ error: 'No se pudo registrar la entrega' });
    }
  }
);

// Register inbound document (external)
router.post(
  '/inbound',
  checkRole([UserRole.ENGINEER, UserRole.DIRECTOR]),
  upload.single('file'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { projectId, series, title, metadata: metadataStr, requiresResponse, deadline, receptionMedium, replyToId, replyToRadicado } = req.body;
      const userId = req.user!.id;
      const file = req.file;

      let metadata: any = {};
      try {
        metadata = typeof metadataStr === 'string' ? JSON.parse(metadataStr) : metadataStr || {};
      } catch (e) {
        metadata = {};
      }

      // Resolve replyToRadicado if provided
      let finalReplyToId = replyToId;
      if (replyToRadicado && !finalReplyToId) {
          const parentDoc = await prisma.document.findUnique({ where: { radicadoCode: replyToRadicado } });
          if (parentDoc) {
              finalReplyToId = parentDoc.id;
          }
      }

      // OCR Processing
      let extractedContent = '';
      let detectedDate: Date | null = null;

      if (file) {
        try {
          const ocrResult = await runOcr(file.buffer);
          extractedContent = ocrResult.text;
          detectedDate = ocrResult.detectedDate;
        } catch (e) {
          console.warn('OCR failed', e);
        }
      }

      // Sanitize extracted content or provided content
      const rawContent = metadata?.content || extractedContent || '';
      const sanitizedContent = sanitizeHtml(rawContent, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
        allowedAttributes: { ...sanitizeHtml.defaults.allowedAttributes, img: ['src'] }
      });

      // Auto-fill document date if detected and not provided
      if (detectedDate && !metadata.documentDate) {
        metadata.documentDate = detectedDate.toISOString();
      }

      // Validar TRD contra proyecto
      if (metadata?.trdCode) {
        const project = await prisma.project.findUnique({ where: { id: projectId }, select: { trd: true } as any });
        const trdList = (project as any)?.trd || [];
        const found = (trdList as any[]).find((t: any) => (t.code || '').toLowerCase() === (metadata.trdCode || '').toLowerCase());
        if (!found) {
          return res.status(400).json({ error: 'TRD no válida para el proyecto' });
        }
      }

      // Generate radicado
      const radicadoCode = await generateRadicado(projectId, series as any, 'IN');
      const project = await prisma.project.findUnique({ where: { id: projectId }, select: { trd: true } as any });
      const finalDeadline = deadline || computeDeadlineFromTrd(metadata, (project as any)?.trd);

      const doc = await prisma.document.create({
        data: {
          projectId,
          type: DocumentType.INBOUND,
          series,
          title,

          content: sanitizedContent,
          status: DocumentStatus.RADICADO,

          radicadoCode,
          metadata: {
              ...metadata,
              requiresResponse: !!requiresResponse,
              deadline: finalDeadline || null,
              receptionMedium: receptionMedium || null,
              registeredBy: userId,
          },
          authorId: userId,
          replyToId: finalReplyToId || null,
          createdAt: new Date(),
        },
      });

      // If file uploaded, save as attachment
      if (file) {
        const storage = getStorage();
        const stored = await storage.save({
          buffer: file.buffer,
          filename: file.originalname,
          contentType: file.mimetype,
        });

        await prisma.attachment.create({
          data: {
            filename: file.originalname,
            url: stored.url,
            storagePath: stored.key,
            size: stored.size,
            documentId: doc.id,
          },
        });
      }

      await logAudit(req.user?.id, 'DOCUMENT_INBOUND', 'Document', doc.id, `Inbound ${doc.title}`);
      return res.status(201).json(doc);
    } catch (err) {
      console.error('Inbound register error:', err);
      return res.status(500).json({ error: 'Failed to register inbound document' });
    }
  }
);

// POST /documents/create - create draft
router.post(
  '/create',
  checkRole([UserRole.ENGINEER, UserRole.DIRECTOR]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { projectId, type, series, metadata, title, content, retentionDate, isPhysicalOriginal, physicalLocationId, replyToId } = req.body;

      if (!projectId || !type || !series) {
        return res.status(400).json({ error: 'Faltan campos obligatorios (projectId, type, series)' });
      }

      // Validar TRD contra proyecto si se envía
      if (metadata?.trdCode) {
        const project = await prisma.project.findUnique({ where: { id: projectId }, select: { trd: true } as any });
        const trdList = (project as any)?.trd || [];
        const found = trdList.find((t: any) => (t.code || '').toLowerCase() === (metadata.trdCode || '').toLowerCase());
        if (!found) {
          return res.status(400).json({ error: 'TRD no válida para el proyecto' });
        }
      }

      const doc = await prisma.document.create({
        data: {
          projectId,
          type: type as any,
          series: series as any,
          status: DocumentStatus.DRAFT,
          metadata: metadata ?? {},
          title,
          content: content ? sanitizeHtml(content, {
             allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
             allowedAttributes: { ...sanitizeHtml.defaults.allowedAttributes, img: ['src'] }
          }) : null,
          retentionDate,
          isPhysicalOriginal: !!isPhysicalOriginal,
          physicalLocationId,
          replyToId: replyToId || null,
          authorId: req.user!.id,
          createdAt: new Date()
        }
      });

      // --- TEMPLATE GENERATION ---
      // --- TEMPLATE GENERATION (DIRECT DOCX) ---
      if (type === DocumentType.OUTBOUND || type === 'OUTBOUND') {
          try {
               console.log("Generating DOCX directly for:", title);
               
               const docx = new WordDocument({
                styles: {
                    default: {
                        document: {
                            run: {
                                font: "Ubuntu",
                            },
                        },
                        heading1: {
                            run: {
                                font: "Ubuntu",
                            },
                        },
                        heading2: {
                            run: {
                                font: "Ubuntu",
                            },
                        },
                    },
                },
                sections: [{
                    properties: {},
                    headers: {
                        default: new Header({
                            children: [
                                new Paragraph({
                                    children: [
                                        new TextRun({
                                            text: "[NOMBRE DE LA EMPRESA]",
                                            bold: true,
                                            size: 28, // 14pt
                                        }),
                                    ],
                                    alignment: AlignmentType.CENTER,
                                }),
                                new Paragraph({
                                    children: [
                                        new TextRun({
                                            text: "[Departamento / Gerencia]",
                                            italics: true,
                                            size: 24, // 12pt
                                        }),
                                    ],
                                    alignment: AlignmentType.CENTER,
                                }),
                                new Paragraph({
                                    text: "", // Spacer
                                    border: {
                                        bottom: {
                                            color: "000000",
                                            space: 1,
                                            style: BorderStyle.SINGLE,
                                            size: 6,
                                        },
                                    },
                                }),
                            ],
                        }),
                    },
                    footers: {
                        default: new Footer({
                            children: [
                                new Paragraph({
                                    children: [
                                        new TextRun({
                                            text: "Dirección: [DIRECCIÓN DE LA EMPRESA]",
                                            size: 20, // 10pt
                                        }),
                                    ],
                                    alignment: AlignmentType.CENTER,
                                }),
                            ],
                        }),
                    },
                    children: [
                        // Metadata Table
                        new Table({
                            width: {
                                size: 100,
                                type: WidthType.PERCENTAGE,
                            },
                            rows: [
                                new TableRow({
                                    children: [
                                        new TableCell({
                                            children: [new Paragraph({ children: [new TextRun({ text: "FECHA:", bold: true })] })],
                                            width: { size: 20, type: WidthType.PERCENTAGE },
                                        }),
                                        new TableCell({
                                            children: [new Paragraph({ children: [new TextRun(new Date().toLocaleDateString('es-CO'))] })],
                                        }),
                                        new TableCell({
                                            children: [new Paragraph({ children: [new TextRun({ text: "SERIE:", bold: true })] })],
                                            width: { size: 20, type: WidthType.PERCENTAGE },
                                        }),
                                        new TableCell({
                                            children: [new Paragraph({ children: [new TextRun(series || 'ADM')] })],
                                        }),
                                    ],
                                }),
                                new TableRow({
                                    children: [
                                        new TableCell({
                                            children: [new Paragraph({ children: [new TextRun({ text: "RADICADO:", bold: true })] })],
                                        }),
                                        new TableCell({
                                            children: [new Paragraph({ children: [new TextRun("BORRADOR")] })],
                                            columnSpan: 3,
                                        }),
                                    ],
                                }),
                            ],
                        }),

                        new Paragraph({ text: "" }), // Spacer
                        new Paragraph({ text: "" }), // Spacer

                        new Paragraph({ text: "" }), // Spacer
                        new Paragraph({ text: "" }), // Spacer

                        // Recipient Block
                        new Paragraph({
                            children: [
                                new TextRun({ text: "Señor(a):", bold: true }),
                            ],
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({ text: metadata?.recipientName || '', bold: true }),
                            ],
                        }),
                        new Paragraph({
                            children: [
                                new TextRun(metadata?.recipientRole || ''),
                            ],
                        }),
                        new Paragraph({
                            children: [
                                new TextRun(metadata?.recipientCompany || ''),
                            ],
                        }),
                        new Paragraph({
                            children: [
                                new TextRun(metadata?.recipientAddress || ''),
                            ],
                        }),

                        new Paragraph({ text: "" }), // Spacer
                        new Paragraph({ text: "" }), // Spacer

                        // Title/Subject
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: `REF: ${title || 'Sin Título'}`,
                                    bold: true,
                                    size: 24,
                                }),
                            ],
                            alignment: AlignmentType.RIGHT,
                        }),

                        new Paragraph({ text: "" }), // Spacer
                        new Paragraph({ text: "" }), // Spacer

                        // Body Placeholder
                        new Paragraph({
                            children: [
                                new TextRun("Estimado(a):"),
                            ],
                        }),
                        new Paragraph({ text: "" }),
                        new Paragraph({
                            children: [
                                new TextRun("Por medio de la presente... (Escriba aquí el contenido de su carta)"),
                            ],
                        }),

                        new Paragraph({ text: "" }), // Spacer
                        new Paragraph({ text: "" }), // Spacer
                        new Paragraph({ text: "" }), // Spacer

                        // Signature Block
                        new Paragraph({
                            children: [
                                new TextRun("Atentamente,"),
                            ],
                        }),
                        new Paragraph({ text: "" }), // Space for signature
                        new Paragraph({ text: "" }),
                        new Paragraph({ text: "" }),
                        new Paragraph({ text: "" }),
                        new Paragraph({ text: "" }),
                        
                        // Signer Name & Role - REMOVED to avoid overlap with stampPdf
                        // The system will stamp the signature, name, and role automatically.
                        new Paragraph({ text: "" }),
                        new Paragraph({ text: "" }),
                        new Paragraph({ text: "" }),

                        new Paragraph({ text: "" }),

                        // Projected By
                        ...(metadata?.projectedBy ? [
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: `Proyectó: ${metadata.projectedBy}`,
                                        size: 16, // 8pt
                                    }),
                                ],
                            }),
                        ] : []),

                        new Paragraph({ text: "" }),
                        
                        // CC List
                        ...(metadata?.ccList && Array.isArray(metadata.ccList) && metadata.ccList.length > 0 ? [
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: "Copia: " + metadata.ccList.join(", "),
                                        size: 16, // 8pt
                                    }),
                                ],
                            }),
                        ] : []),
                        

                    ],
                }],
            });

            const buffer = await Packer.toBuffer(docx);

            // Save generated file
            const storage = getStorage();
            const stored = await storage.save({
                buffer: buffer,
                filename: `draft-${doc.id}.docx`,
                contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            });

            // Update doc with contentUrl
            console.log("Direct DOCX saved to:", stored.url);
            
            await prisma.document.update({
                where: { id: doc.id },
                data: { contentUrl: stored.url }
            });
            
            // Return the updated doc with contentUrl
            return res.status(201).json({ 
                id: doc.id, 
                status: doc.status,
                contentUrl: stored.url,
                title: doc.title,
                series: doc.series,
                metadata: doc.metadata
            });

           } catch (error) {
               console.error('Error generating DOCX:', error);
               // Even if template fails, return the doc (it will be empty/blank in OnlyOffice if url is missing)
               return res.status(201).json({ id: doc.id, status: doc.status });
           }
          }

      // ---------------------------


      await logAudit(req.user?.id, 'DOCUMENT_CREATE', 'Document', doc.id, `Borrador ${title}`);
      return res.status(201).json({ id: doc.id, status: doc.status });
    } catch (err) {
      console.error('Create draft error:', err);
      return res.status(500).json({ error: 'Failed to create draft' });
    }
  }
);

// POST /documents/:id/preview - generate preview PDF with signature
router.post(
  '/:id/preview',
  checkRole([UserRole.ENGINEER, UserRole.DIRECTOR]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const doc = await prisma.document.findUnique({ where: { id } });
      if (!doc) return res.status(404).json({ error: 'Documento no encontrado' });

      console.log(`[Preview] Generating preview for doc ${id}`);
      console.log(`[Preview] Metadata CC List:`, (doc.metadata as any)?.ccList);

      let signerId = req.user!.id;
      const meta = doc.metadata as any;
      
      // Determine correct signer for preview
      if (meta?.signatureAuthorized && meta?.signerId) {
          signerId = meta.signerId;
      } else if (doc.assignedToUserId && (doc.status === 'PENDING_APPROVAL' || doc.status === 'PENDING_SCAN')) {
          signerId = doc.assignedToUserId;
      }

      const signer = await prisma.user.findUnique({ 
          where: { id: signerId }, 
          select: { signatureImage: true, fullName: true, role: true } 
      });

      if (!doc.contentUrl) {
          return res.status(400).json({ error: 'El documento no tiene contenido generado (DOCX)' });
      }

      // 1. Convert Word to PDF via OnlyOffice
      const publicUrl = `http://host.docker.internal:4000${doc.contentUrl}`;
      console.log('[Preview] Converting to PDF:', publicUrl);
      
      let pdfBuffer: Buffer;
      try {
          const pdfUrl = await convertToPdf(publicUrl, 'docx', `preview-${doc.id}-${Date.now()}`);
          const pdfRes = await fetch(pdfUrl);
          if (!pdfRes.ok) throw new Error('Failed to download converted PDF');
          pdfBuffer = await pdfRes.buffer();
      } catch (e) {
          console.error('[Preview] Conversion failed:', e);
          return res.status(500).json({ error: 'Error convirtiendo documento a PDF' });
      }

      // 2. Stamp the PDF (Mock Radicado for Preview)
      // Pass undefined for signatureImage to avoid showing the actual signature in preview
      const stampedBuffer = await stampPdf(pdfBuffer, {
          radicado: 'BORRADOR',
          date: new Date().toISOString(),
          attachments: 0,
          qrData: JSON.stringify({ id: doc.id, preview: true }),
          signerName: signer?.fullName || 'Nombre del Firmante',
          signerRole: signer?.role || 'Cargo',
      }, undefined); // No signature image for preview security

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="preview.pdf"');
      res.send(stampedBuffer);

    } catch (err) {
      console.error('Preview error:', err);
      return res.status(500).json({ error: 'Failed to generate preview' });
    }
  }
);

// POST /documents/sign - finalize and radicate (directors or authorized engineers)
router.post(
  '/sign',
  checkRole([UserRole.DIRECTOR, UserRole.ENGINEER]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { documentId, signaturePin } = req.body;
      console.log('[Sign] Request received:', { documentId, userId: req.user!.id, role: req.user!.role });
      
      const userId = req.user!.id;
      const userRole = req.user!.role;

      // Fetch doc first to check authorization
      console.log('[Sign] Fetching document...');
      const doc = await prisma.document.findUnique({
        where: { id: documentId },
        select: { id: true, projectId: true, series: true, status: true, type: true, metadata: true, contentUrl: true, assignedToUserId: true }
      });
      if (!doc) return res.status(404).json({ error: 'Document not found' });

      // 1. Verify PIN for ALL users
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { signaturePin: true, role: true }
      });

      if (!user || !user.signaturePin || user.signaturePin !== signaturePin) {
        return res.status(400).json({ error: 'PIN de firma inválido' });
      }

      let signerId = userId;

      // 2. Authorization Logic
      if (userRole === UserRole.ENGINEER) {
          const meta = doc.metadata as any;
          
          // Case A: Authorized Signature (on behalf of Director)
          if (meta?.signatureAuthorized && doc.status === DocumentStatus.PENDING_SCAN) {
               if (meta.signerId) {
                   signerId = meta.signerId;
               } else {
                   return res.status(400).json({ error: 'Falta información del firmante autorizado.' });
               }
          } 
          // Case B: Self-Signing (Engineer signing their own doc)
          else {
               // Must be in DRAFT
               if (doc.status !== DocumentStatus.DRAFT) {
                    return res.status(400).json({ error: 'Para firmar a su nombre, el documento debe estar en Borrador.' });
               }
               signerId = userId;
          }

      } else {
          // Director Logic
          if (doc.status !== DocumentStatus.DRAFT && doc.status !== DocumentStatus.PENDING_APPROVAL) {
            return res.status(400).json({ error: 'Documento no elegible para firma (debe estar en Borrador o Por Aprobar)' });
          }
      }

      // Generate radicado atomically
      const radicadoCode = await generateRadicado(doc.projectId, doc.series as any, doc.type === 'INBOUND' ? 'IN' : 'OUT');

      const signer = await prisma.user.findUnique({ where: { id: signerId }, select: { signatureImage: true, fullName: true, role: true } });
      
      // --- PDF GENERATION & STAMPING ---
      let finalContentUrl = doc.contentUrl;
      if (doc.contentUrl) {
          try {
              // 1. Convert to PDF
              const publicUrl = `http://host.docker.internal:4000${doc.contentUrl}`;
              console.log('[Sign] Converting to PDF:', publicUrl);
              const pdfUrl = await convertToPdf(publicUrl, 'docx', `signed-${doc.id}-${Date.now()}`);
              const pdfRes = await fetch(pdfUrl);
              if (!pdfRes.ok) throw new Error('Failed to download converted PDF');
              const pdfBuffer = await pdfRes.buffer();

              // 2. Stamp PDF
              const stampedBuffer = await stampPdf(pdfBuffer, {
                  radicado: radicadoCode,
                  date: new Date().toISOString(),
                  attachments: 0, // TODO: Count attachments
                  qrData: JSON.stringify({ id: doc.id, radicado: radicadoCode }),
                  signerName: signer?.fullName || 'Firmante',
                  signerRole: signer?.role || 'Cargo',
              }, signer?.signatureImage || undefined);

              // 3. Save Stamped PDF
              const storage = getStorage();
              const stored = await storage.save({
                  buffer: stampedBuffer,
                  filename: `radicado-${radicadoCode}.pdf`,
                  contentType: 'application/pdf'
              });
              finalContentUrl = stored.url;
              console.log('[Sign] PDF Saved at:', finalContentUrl);

          } catch (e) {
              console.error('[Sign] Error generating PDF:', e);
              // We continue, but contentUrl remains the DOCX (fallback)
              // Ideally we should fail, but let's not block radication if conversion fails?
              // No, we should fail because the user expects a signed PDF.
              throw new Error('Error generando el PDF firmado. Intente nuevamente.');
          }
      }

      const updated = await prisma.document.update({
        where: { id: documentId },
        data: {
          radicadoCode,
          status: DocumentStatus.RADICADO,
          contentUrl: finalContentUrl, // Update to PDF URL
          metadata: {
              ...(doc.metadata as any),
              signatureMethod: 'DIGITAL',
              signatureImage: signer?.signatureImage || null,
              radicadoAt: new Date().toISOString(),
              radicatedBy: userId,
              originalContentUrl: doc.contentUrl // Keep reference to DOCX
            },
          updatedAt: new Date()
        }
      });

      // Record workflow entry
      await prisma.workflow.create({
        data: {
          documentId: documentId,
          userId,
          action: 'APPROVED',
          comments: userRole === 'ENGINEER' ? 'Radicado por Ingeniero (Firma Autorizada)' : 'Firmado digitalmente y radicado',
          actedAt: new Date()
        }
      });

      await logAudit(req.user?.id, 'DOCUMENT_SIGN', 'Document', updated.id, `Firmado y radicado ${updated.radicadoCode}`);
      return res.json({ radicadoCode: updated.radicadoCode, status: updated.status });
    } catch (err) {
      console.error('Sign error:', err);
      return res.status(500).json({ error: 'Failed to sign document' });
    }
  }
);

// POST /documents/:id/radicar - finalize and assign radicado (digital o físico)
router.post(
  '/:id/radicar',
  checkRole([UserRole.DIRECTOR]),
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { signatureMethod } = req.body; // DIGITAL | PHYSICAL
    try {
      const doc = await prisma.document.findUnique({ where: { id } });
      if (!doc) return res.status(404).json({ error: 'Documento no encontrado' });

      if (doc.status === DocumentStatus.RADICADO || doc.status === DocumentStatus.ARCHIVED || doc.status === DocumentStatus.VOID) {
        return res.status(400).json({ error: 'Documento no editable (radicado/archivado/anulado)' });
      }
      if (doc.status !== DocumentStatus.DRAFT && doc.status !== DocumentStatus.PENDING_APPROVAL) {
        return res.status(400).json({ error: 'Solo borradores o pendientes pueden radicarse' });
      }

      const typeCode = doc.type === DocumentType.INBOUND ? 'IN' : doc.type === DocumentType.OUTBOUND ? 'OUT' : 'INT';
      const radicadoCode = await generateRadicado(doc.projectId, doc.series as any, typeCode as any);

      let finalStatus: DocumentStatus = DocumentStatus.RADICADO;
      if (doc.type === DocumentType.OUTBOUND && signatureMethod === 'PHYSICAL') {
        finalStatus = DocumentStatus.PENDING_SCAN;
      }

      let finalDeadline = (doc.metadata as any)?.deadline || null;
      if (!finalDeadline && (doc.metadata as any)?.requiresResponse) {
        const project = await prisma.project.findUnique({ where: { id: doc.projectId }, select: { trd: true } as any });
        finalDeadline = computeDeadlineFromTrd(doc.metadata, (project as any)?.trd);
      }

      const signer = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { signatureImage: true, fullName: true, role: true } });

      if (!signer?.signatureImage) {
        return res.status(400).json({ error: 'No tienes una firma digital configurada. Ve a tu perfil y sube una.' });
      }

      // --- PDF CONVERSION & STAMPING ---
      let finalUrl = doc.contentUrl;
      
      if (signatureMethod === 'DIGITAL' && doc.contentUrl) {
          try {
              // 1. Convert Word to PDF via OnlyOffice
              // Ensure contentUrl is accessible by OnlyOffice (use host.docker.internal if needed, or public IP)
              // For local dev with docker, we might need to tweak the URL passed to OnlyOffice
              // Assuming doc.contentUrl is like /uploads/file.docx
              const publicUrl = `http://host.docker.internal:4000${doc.contentUrl}`;
              
              console.log('Converting to PDF:', publicUrl);
              const pdfUrl = await convertToPdf(publicUrl, 'docx', `${doc.id}-${Date.now()}`);
              
              // 2. Fetch the converted PDF
              const pdfRes = await fetch(pdfUrl);
              if (!pdfRes.ok) throw new Error('Failed to download converted PDF');
              const pdfBuffer = await pdfRes.buffer();

              // 3. Stamp the PDF
              const stampedBuffer = await stampPdf(pdfBuffer, {
                  radicado: radicadoCode,
                  date: new Date().toISOString(),
                  attachments: 0, // TODO: count attachments
                  qrData: JSON.stringify({ id: doc.id, radicado: radicadoCode }),
                  signerName: signer.fullName,
                  signerRole: signer.role,
              }, signer?.signatureImage || undefined);

              // 4. Save the stamped PDF
              const storage = getStorage();
              const stored = await storage.save({
                  buffer: stampedBuffer,
                  filename: `${radicadoCode}.pdf`,
                  contentType: 'application/pdf'
              });
              
              finalUrl = stored.url;
              console.log('Stamped PDF saved to:', finalUrl);

          } catch (e) {
              console.error('Conversion/Stamping failed:', e);
              // Fallback: don't fail the whole request, but log it. 
              // Or maybe we SHOULD fail? The user expects a signed PDF.
              return res.status(500).json({ error: 'Error generando el PDF firmado' });
          }
      }

      const updated = await prisma.document.update({
        where: { id },
        data: {
          radicadoCode,
          status: finalStatus,
          contentUrl: finalUrl, // Update contentUrl to the signed PDF
          metadata: {
              ...(doc.metadata as any),
              signatureMethod: signatureMethod || 'DIGITAL',
              signatureImage: signer?.signatureImage || (doc.metadata as any)?.signatureImage || null,
              radicadoAt: new Date().toISOString(),
              deadline: finalDeadline ?? null,
            },
          updatedAt: new Date(),
        },
      });

      await logAudit(req.user?.id, 'DOCUMENT_RADICAR', 'Document', updated.id, `Radicado ${updated.radicadoCode} (${finalStatus})`);
      return res.json(updated);
    } catch (err) {
      console.error('Radicar error:', err);
      return res.status(500).json({ error: 'No se pudo radicar' });
    }
  }
);

// POST /documents/void - void a document (directors only)
router.post(
  '/void',
  checkRole([UserRole.DIRECTOR]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { documentId, reason } = req.body;
      if (!reason || reason.trim().length < 3) {
        return res.status(400).json({ error: 'Void reason is required' });
      }

      const doc = await prisma.document.findUnique({
        where: { id: documentId },
        select: { status: true }
      });
      if (!doc) return res.status(404).json({ error: 'Document not found' });
      if (doc.status === DocumentStatus.VOID) {
        return res.status(400).json({ error: 'Document already void' });
      }

      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: DocumentStatus.VOID,
          metadata: {
              // append void info; merge existing metadata
              voidReason: reason,
              voidedAt: new Date().toISOString()
            },
          updatedAt: new Date()
        }
      });

      await prisma.workflow.create({
        data: {
          documentId,
          userId: req.user!.id,
          action: 'REJECTED',
          comments: `Documento anulado: ${reason}`,
          actedAt: new Date()
        }
      });

      return res.json({ status: 'VOID' });
    } catch (err) {
      console.error('Void error:', err);
      return res.status(500).json({ error: 'Failed to void document' });
    }
  }
);

export default router;
