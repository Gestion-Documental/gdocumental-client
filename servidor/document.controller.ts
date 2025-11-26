import { Router, Response } from 'express';
import { PrismaClient, DocumentStatus, UserRole } from '@prisma/client';
import { AuthenticatedRequest } from './auth.middleware';
import { checkRole } from './rbac.middleware';
import { generateRadicado } from './radication.service';

const prisma = new PrismaClient();
const router = Router();

// POST /documents/create - create draft
router.post(
  '/create',
  checkRole([UserRole.ENGINEER, UserRole.DIRECTOR]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { projectId, type, series, metadata, title, content, retentionDate, isPhysicalOriginal, physicalLocationId } = req.body;

      const doc = await prisma.document.create({
        data: {
          projectId,
          type,
          series,
          status: DocumentStatus.DRAFT,
          metadata,
          title,
          retentionDate,
          isPhysicalOriginal: !!isPhysicalOriginal,
          physicalLocationId,
          authorId: req.user!.id,
          createdAt: new Date()
        }
      });

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

      return res.json({ radicadoCode: updated.radicadoCode, status: updated.status });
    } catch (err) {
      console.error('Sign error:', err);
      return res.status(500).json({ error: 'Failed to sign document' });
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
