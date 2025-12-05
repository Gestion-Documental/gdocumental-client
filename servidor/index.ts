import { app } from './app';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const port = Number(process.env.PORT) || 4000;
const prisma = new PrismaClient();

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

if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
  ensureSeedData().catch((err) => console.error('Seed error:', err));
}

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, '0.0.0.0', () => {
    console.log(`Gestion documental API corriendo en el puerto ${port}`);
  });
}
