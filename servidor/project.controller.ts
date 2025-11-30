import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from './auth.middleware';

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

export default router;
