import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import documentRouter from './document.controller';
import { authMiddleware } from './auth.middleware';
import authRouter from './auth.controller';
import { PrismaClient } from '@prisma/client';
import projectRouter from './project.controller';

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 4000;
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

app.use('/auth', authRouter);
app.use('/projects', authMiddleware, projectRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Rutas protegidas
app.use('/documents', authMiddleware, documentRouter);

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
}

ensureSeedData()
  .catch((err) => console.error('Seed error:', err))
  .finally(() => {
    app.listen(port, () => {
      console.log(`Gestion documental API corriendo en el puerto ${port}`);
    });
  });
