import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const router = Router();

const JWT_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'dev-secret';
const JWT_ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || '8h';
// Fallback to JWT_SECRET to avoid crash in dev if not provided
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'dev-refresh-secret';
const JWT_REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '7d';

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Usuario no encontrado' });

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return res.status(403).json({ error: 'Account locked. Try again later.' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      const attempts = user.failedLoginAttempts + 1;
      let lockedUntil: Date | null = null;
      if (attempts >= 5) {
        lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 minutes
      }
      await prisma.user.update({
        where: { email },
        data: { failedLoginAttempts: attempts, lockedUntil },
      });
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    await prisma.user.update({
      where: { email },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });

    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_ACCESS_EXPIRES },
    );
    const refreshToken = jwt.sign(
      { sub: user.id, tokenVersion: user.tokenVersion || 0 },
      JWT_REFRESH_SECRET,
      { expiresIn: JWT_REFRESH_EXPIRES },
    );

    return res.json({
      token,
      refreshToken,
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

// Refresh access token
router.post('/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Falta refreshToken' });
  try {
    const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { sub: string; tokenVersion: number };
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, tokenVersion: true, fullName: true },
    });
    if (!user) return res.status(401).json({ error: 'Usuario no encontrado' });
    if ((user.tokenVersion || 0) !== payload.tokenVersion) {
      return res.status(401).json({ error: 'Refresh token inválido' });
    }
    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_ACCESS_EXPIRES },
    );
    return res.json({ token, user });
  } catch (err) {
    return res.status(401).json({ error: 'Refresh token inválido' });
  }
});

// Logout: bump tokenVersion to invalidate refresh tokens
router.post('/logout', async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.json({ ok: true });
  try {
    const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { sub: string };
    await prisma.user.update({
      where: { id: payload.sub },
      data: { tokenVersion: { increment: 1 } },
    });
  } catch (err) {
    // ignore invalid token
  }
  return res.json({ ok: true });
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
