import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from './auth.middleware';
import { getStorage } from './storage';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';

import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const router = Router();

// Change Password
router.put(
  '/me/password',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Faltan campos requeridos' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
      }

      const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
      if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

      const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValid) {
        return res.status(400).json({ error: 'La contraseña actual es incorrecta' });
      }

      const newHash = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newHash }
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ error: 'No se pudo cambiar la contraseña' });
    }
  }
);

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
      const { pin, currentPin } = req.body;
      let signatureUrl: string | undefined;

      // Verify current PIN if setting a new one
      if (pin) {
          const currentUser = await prisma.user.findUnique({
              where: { id: userId },
              select: { signaturePin: true }
          });
          
          if (currentUser?.signaturePin) {
              if (!currentPin) {
                  return res.status(400).json({ error: 'Debe ingresar su PIN actual para cambiarlo' });
              }
              if (currentUser.signaturePin !== currentPin) {
                  return res.status(400).json({ error: 'El PIN actual es incorrecto' });
              }
          }
      }

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

// Get current user profile
router.get(
  '/me',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'No autenticado' });

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { 
            id: true, 
            email: true, 
            fullName: true, 
            role: true, 
            signatureImage: true, 
            signaturePin: true, 
            avatarUrl: true,
            projectRoles: {
                select: { projectId: true }
            },
            status: true
        },
      });

      if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

      // Map to frontend User interface
      const mappedUser = {
          ...user,
          signatureUrl: user.signatureImage || undefined,
          securityPin: user.signaturePin || undefined,
          assignedProjectIds: user.projectRoles.map(r => r.projectId),
          isActive: user.status === 'ACTIVE'
      };
      
      console.log('Serving /me for user:', userId, mappedUser);

      res.json(mappedUser);
    } catch (error) {
      console.error('Fetch me error', error);
      res.status(500).json({ error: 'Error obteniendo perfil' });
    }
  }
);

// Get all users (for assignment)
router.get(
  '/',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const users = await prisma.user.findMany({
        select: { id: true, fullName: true, role: true, email: true },
        orderBy: { fullName: 'asc' }
      });
      res.json(users);
    } catch (error) {
      console.error('Fetch users error', error);
      res.status(500).json({ error: 'Error obteniendo usuarios' });
    }
  }
);

export default router;
