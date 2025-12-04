import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding base data (dev/test)...');

  const projects = [
    {
      id: 'p1',
      code: 'PTE01',
      name: 'Puente Norte Construction',
      seriesConfig: { adm: true, tec: true },
      trd: [
        { code: 'ADM-1001', seriesName: 'ADM', subseriesName: 'Correspondencia', retentionGestion: 5, retentionCentral: 5, disposition: 'Conservar', responseDays: 15 },
        { code: 'TEC-2001', seriesName: 'TEC', subseriesName: 'Informes Técnicos', retentionGestion: 5, retentionCentral: 10, disposition: 'Conservar', responseDays: 10 },
      ],
    },
    {
      id: 'p2',
      code: 'ADM',
      name: 'Corporate HQ Administration',
      seriesConfig: { adm: true, tec: true },
      trd: [
        { code: 'ADM-1002', seriesName: 'ADM', subseriesName: 'Cartas Administrativas', retentionGestion: 5, retentionCentral: 5, disposition: 'Conservar', responseDays: 10 },
      ],
    },
    {
      id: 'p3',
      code: 'RH',
      name: 'HR Department',
      seriesConfig: { adm: true },
      trd: [
        { code: 'ADM-1003', seriesName: 'ADM', subseriesName: 'Memorandos', retentionGestion: 5, retentionCentral: 5, disposition: 'Conservar', responseDays: 5 },
      ],
    },
  ];

  for (const p of projects) {
    await prisma.project.upsert({
      where: { id: p.id },
      update: { code: p.code, name: p.name, seriesConfig: p.seriesConfig, trd: p.trd },
      create: { id: p.id, code: p.code, name: p.name, seriesConfig: p.seriesConfig, trd: p.trd },
    });
  }

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

  console.log('Seed completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
