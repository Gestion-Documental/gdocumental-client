import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const router = Router();

const JWT_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT secret is not configured. Set JWT_ACCESS_SECRET or JWT_SECRET.');
}

// Simple login/auto-provision for demo/dev
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
  }

  try {
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Auto-provision user with DIRECTOR role for demo purposes
      const passwordHash = await bcrypt.hash(password, 10);
      user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          fullName: email.split('@')[0],
          role: 'DIRECTOR',
        },
      });
    } else {
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '8h' },
    );

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error', error);
    return res.status(500).json({ error: 'No se pudo iniciar sesión' });
  }
});

router.get('/me', async (req: Request, res: Response) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Falta token' });
  }
  const token = auth.replace('Bearer ', '').trim();
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, fullName: true, role: true },
    });
    if (!user) return res.status(401).json({ error: 'Usuario no encontrado' });
    res.json(user);
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
});

export default router;
