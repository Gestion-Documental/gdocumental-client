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

const prisma = new PrismaClient();
const router = Router();

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
        include: { attachments: true },
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
        include: { attachments: true },
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
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { title, content, metadata, series, retentionDate, isPhysicalOriginal, physicalLocationId } = req.body;

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
        const project = await prisma.project.findUnique({ where: { id: doc.projectId }, select: { trd: true } });
        const trdList = project?.trd || [];
        const found = trdList.find((t: any) => (t.code || '').toLowerCase() === (metadata.trdCode || '').toLowerCase());
        if (!found) {
          return res.status(400).json({ error: 'TRD no válida para el proyecto' });
        }
      }

      let computedDeadline: string | null = metadata?.deadline || null;
      if (!computedDeadline && metadata?.requiresResponse) {
        const project = await prisma.project.findUnique({ where: { id: doc.projectId }, select: { trd: true } });
        computedDeadline = computeDeadlineFromTrd(metadata, project?.trd);
      }

      const updated = await prisma.document.update({
        where: { id },
        data: {
          title: title ?? doc.title,
          content: content ?? doc.content,
          metadata: metadata
            ? { set: { ...(doc.metadata as any), ...metadata, deadline: computedDeadline ?? null } }
            : undefined,
          series: series ?? doc.series,
          retentionDate: retentionDate ?? doc.retentionDate,
          isPhysicalOriginal: isPhysicalOriginal ?? doc.isPhysicalOriginal,
          physicalLocationId: physicalLocationId ?? doc.physicalLocationId,
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
        doc.status === DocumentStatus.RADICADO ||
        doc.status === DocumentStatus.ARCHIVED ||
        doc.status === DocumentStatus.VOID
      ) {
        return res.status(400).json({ error: 'No se pueden subir adjuntos a documentos finalizados/anulados' });
      }

      const storage = getStorage();
      const stored = await storage.save({
        buffer: file.buffer,
        filename: file.originalname,
        contentType: file.mimetype,
      });

      const attachment = await prisma.attachment.create({
        data: {
          filename: file.originalname,
          url: stored.url,
          storagePath: stored.key,
          size: stored.size,
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
        PENDING_APPROVAL: [DocumentStatus.RADICADO, DocumentStatus.VOID],
        PENDING_SCAN: [DocumentStatus.RADICADO, DocumentStatus.VOID],
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
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { receivedBy, receivedAt, deliveryProof } = req.body;
      const doc = await prisma.document.findUnique({ where: { id } });
      if (!doc) return res.status(404).json({ error: 'Documento no encontrado' });
      if (doc.type !== DocumentType.OUTBOUND) {
        return res.status(400).json({ error: 'Entrega aplica solo a salidas (OUTBOUND)' });
      }
      if (doc.status !== DocumentStatus.RADICADO && doc.status !== DocumentStatus.PENDING_SCAN) {
        return res.status(400).json({ error: 'Solo documentos radicados pueden registrarse como entregados' });
      }

      const updated = await prisma.document.update({
        where: { id },
        data: {
          metadata: {
            set: {
              ...(doc.metadata as any),
              delivery: { receivedBy, receivedAt, deliveryProof },
            },
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
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { projectId, series, title, metadata, requiresResponse, deadline, receptionMedium } = req.body;
      const userId = req.user!.id;

      // Validar TRD contra proyecto
      if (metadata?.trdCode) {
        const project = await prisma.project.findUnique({ where: { id: projectId }, select: { trd: true } });
        const trdList = project?.trd || [];
        const found = trdList.find((t: any) => (t.code || '').toLowerCase() === (metadata.trdCode || '').toLowerCase());
        if (!found) {
          return res.status(400).json({ error: 'TRD no válida para el proyecto' });
        }
      }

      // Generate radicado
      const radicadoCode = await generateRadicado(projectId, series as any, 'IN');
      const project = await prisma.project.findUnique({ where: { id: projectId }, select: { trd: true } });
      const finalDeadline = deadline || computeDeadlineFromTrd(metadata, project?.trd);

      const doc = await prisma.document.create({
        data: {
          projectId,
          type: DocumentType.INBOUND,
          series,
          title,
          content: metadata?.content || null,
          status: DocumentStatus.RADICADO,
          radicadoCode,
          metadata: {
            set: {
              ...metadata,
              requiresResponse: !!requiresResponse,
              deadline: finalDeadline || null,
              receptionMedium: receptionMedium || null,
              registeredBy: userId,
            },
          },
          authorId: userId,
          createdAt: new Date(),
        },
      });

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
      const { projectId, type, series, metadata, title, content, retentionDate, isPhysicalOriginal, physicalLocationId } = req.body;

      if (!projectId || !type || !series) {
        return res.status(400).json({ error: 'Faltan campos obligatorios (projectId, type, series)' });
      }

      // Validar TRD contra proyecto si se envía
      if (metadata?.trdCode) {
        const project = await prisma.project.findUnique({ where: { id: projectId }, select: { trd: true } });
        const trdList = project?.trd || [];
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
          content: content || null,
          retentionDate,
          isPhysicalOriginal: !!isPhysicalOriginal,
          physicalLocationId,
          authorId: req.user!.id,
          createdAt: new Date()
        }
      });

      await logAudit(req.user?.id, 'DOCUMENT_CREATE', 'Document', doc.id, `Borrador ${title}`);
      return res.status(201).json({ id: doc.id, status: doc.status });
    } catch (err) {
      console.error('Create draft error:', err);
      return res.status(500).json({ error: 'Failed to create draft' });
    }
  }
);

// POST /documents/sign - finalize and radicate (directors only)
router.post(
  '/sign',
  checkRole([UserRole.DIRECTOR]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { documentId, signaturePin } = req.body;
      const userId = req.user!.id;

      // Validate pin
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { signaturePin: true, role: true }
      });

      if (!user || !user.signaturePin || user.signaturePin !== signaturePin) {
        return res.status(400).json({ error: 'Invalid signature PIN' });
      }

      // Fetch doc
      const doc = await prisma.document.findUnique({
        where: { id: documentId },
        select: { id: true, projectId: true, series: true, status: true, type: true }
      });
      if (!doc) return res.status(404).json({ error: 'Document not found' });
      if (doc.status !== DocumentStatus.DRAFT && doc.status !== DocumentStatus.PENDING_APPROVAL) {
        return res.status(400).json({ error: 'Document not eligible for signing' });
      }

      // Generate radicado atomically
      const radicadoCode = await generateRadicado(doc.projectId, doc.series as any, doc.type === 'INBOUND' ? 'IN' : 'OUT');

      const updated = await prisma.document.update({
        where: { id: documentId },
        data: {
          radicadoCode,
          status: DocumentStatus.RADICADO,
          updatedAt: new Date()
        }
      });

      // Record workflow entry
      await prisma.workflow.create({
        data: {
          documentId: documentId,
          userId,
          action: 'APPROVED',
          comments: 'Firmado digitalmente y radicado',
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
        const project = await prisma.project.findUnique({ where: { id: doc.projectId }, select: { trd: true } });
        finalDeadline = computeDeadlineFromTrd(doc.metadata, project?.trd);
      }

      const updated = await prisma.document.update({
        where: { id },
        data: {
          radicadoCode,
          status: finalStatus,
          metadata: {
            set: {
              ...(doc.metadata as any),
              signatureMethod: signatureMethod || 'DIGITAL',
              radicadoAt: new Date().toISOString(),
              deadline: finalDeadline ?? null,
            },
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
            set: {
              voidReason: reason,
              voidedAt: new Date().toISOString()
            }
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
