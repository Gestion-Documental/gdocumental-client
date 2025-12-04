import { Router, Response } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';
import { AuthenticatedRequest } from './auth.middleware';
import { checkRole } from './rbac.middleware';

const prisma = new PrismaClient();
const router = Router();

// List projects
router.get('/', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(projects);
  } catch (error) {
    console.error('List projects error:', error);
    res.status(500).json({ error: 'Failed to list projects' });
  }
});

// Create project
router.post('/', checkRole(['SUPER_ADMIN', 'DIRECTOR'] as any), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, code, name, seriesConfig, trd } = req.body;
    const project = await prisma.project.create({
      data: {
        id,
        code,
        name,
        seriesConfig: seriesConfig || {},
        trd: trd ?? undefined,
      },
    });
    res.status(201).json(project);
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Update project
router.put('/:id', checkRole(['SUPER_ADMIN', 'DIRECTOR'] as any), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { code, name, seriesConfig, trd } = req.body;
    const project = await prisma.project.update({
      where: { id },
      data: {
        code: code ?? undefined,
        name: name ?? undefined,
        seriesConfig: seriesConfig ?? undefined,
        trd: trd ?? undefined,
      },
    });
    res.json(project);
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Delete project
router.delete('/:id', checkRole(['SUPER_ADMIN'] as any), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.project.delete({ where: { id } });
    res.json({ ok: true });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// TRD endpoints (per project)
router.get('/:id/trd', checkRole([UserRole.ENGINEER, UserRole.DIRECTOR, UserRole.SUPER_ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const project = await prisma.project.findUnique({ where: { id }, select: { trd: true } as any });
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });
    res.json((project as any).trd ?? []);
  } catch (error) {
    console.error('Get TRD error:', error);
    res.status(500).json({ error: 'Failed to get TRD' });
  }
});

router.put('/:id/trd', checkRole([UserRole.DIRECTOR, UserRole.SUPER_ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const trd = req.body?.trd;
    if (!Array.isArray(trd)) {
      return res.status(400).json({ error: 'TRD debe ser un array' });
    }
    const updated = await prisma.project.update({
      where: { id },
      data: { trd } as any,
      select: { id: true, trd: true } as any,
    });
    res.json((updated as any).trd ?? []);
  } catch (error) {
    console.error('Update TRD error:', error);
    res.status(500).json({ error: 'Failed to update TRD' });
  }
});

export default router;
