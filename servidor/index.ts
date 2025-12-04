import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import documentRouter from './document.controller';
import { authMiddleware } from './auth.middleware';
import authRouter from './auth.controller';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import projectRouter from './project.controller';
import userRouter from './user.controller';
import onlyofficeRouter from './onlyoffice.controller';
import path from 'path';

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 4000;
const prisma = new PrismaClient();

app.use(cors());
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});
app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use('/auth', authRouter);
app.use('/projects', authMiddleware, projectRouter);
app.use('/users', authMiddleware, userRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Rutas protegidas
app.use('/documents', authMiddleware, documentRouter);
app.use('/onlyoffice', onlyofficeRouter);

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

async function ensureSeedData() {
  // Proyectos base para que el front pueda referenciar IDs/prefix
  const projects = [
    { id: 'p1', code: 'PTE01', name: 'Puente Norte Construction' },
    { id: 'p2', code: 'ADM', name: 'Corporate HQ Administration' },
    { id: 'p3', code: 'RH', name: 'HR Department' },
  ];
  for (const p of projects) {
    await prisma.project.upsert({
      where: { id: p.id },
      update: { code: p.code, name: p.name },
      create: { id: p.id, code: p.code, name: p.name, seriesConfig: { adm: true, tec: true } as any },
    });
  }

  // Usuarios base (demo)
  const users = [
    { email: 'admin@radika.local', fullName: 'Admin Radika', role: 'SUPER_ADMIN' },
    { email: 'director@radika.local', fullName: 'Director Radika', role: 'DIRECTOR' },
    { email: 'user@radika.local', fullName: 'Ingeniero Radika', role: 'ENGINEER' },
  ];
  const passwordHash = await bcrypt.hash('123456', 10);
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { fullName: u.fullName, role: u.role as any },
      create: {
        email: u.email,
        fullName: u.fullName,
        role: u.role as any,
        passwordHash,
        status: 'ACTIVE',
      },
    });
  }
}

if (process.env.NODE_ENV !== 'production') {
  ensureSeedData().catch((err) => console.error('Seed error:', err));
}

app.listen(port, '0.0.0.0', () => {
  console.log(`Gestion documental API corriendo en el puerto ${port}`);
});
