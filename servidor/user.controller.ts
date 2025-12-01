import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from './auth.middleware';
import { getStorage } from './storage';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';

const prisma = new PrismaClient();
const router = Router();

const signatureUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.includes('png')) {
      return cb(new Error('Solo se permite PNG para la firma'));
    }
    cb(null, true);
  },
});

// Actualiza firma y/o PIN del usuario autenticado
router.post(
  '/me/signature',
  authMiddleware,
  signatureUpload.single('file'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'No autenticado' });

      const file = req.file;
      const { pin } = req.body;
      let signatureUrl: string | undefined;

      if (file) {
        const storage = getStorage();
        const stored = await storage.save({
          buffer: file.buffer,
          filename: file.originalname,
          contentType: file.mimetype || 'image/png',
        });
        signatureUrl = stored.url;
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          signatureImage: signatureUrl || undefined,
          signaturePin: pin || undefined,
        },
        select: { id: true, email: true, fullName: true, role: true, signatureImage: true, signaturePin: true, avatarUrl: true },
      });

      return res.json({ user: updated });
    } catch (err: any) {
      console.error('Signature update error', err);
      return res.status(500).json({ error: err.message || 'No se pudo actualizar la firma' });
    }
  }
);

export default router;
