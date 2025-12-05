import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

type SeriesCode = 'ADM' | 'TEC';
type TypeCode = 'IN' | 'OUT';

/**
 * Transactional Radicado generator
 * - Atomic per (projectId, series)
 * - Safe against concurrent calls using SELECT ... FOR UPDATE via update on Sequence row
 */
export async function generateRadicado(projectId: string, series: SeriesCode, type: TypeCode): Promise<string> {
  const radicado = await prisma.$transaction(async (tx) => {
    // 1) Lock/create sequence for this project + series + type
    const sequence = await tx.radicadoSequence.upsert({
      where: { projectId_series_type: { projectId, series, type } },
      update: { value: { increment: 1 } },
      create: { projectId, series, type, value: 1 },
      select: { value: true }
    });

    const currentValue = sequence.value;

    // 2) Get project code
    const project = await tx.project.findUnique({
      where: { id: projectId },
      select: { code: true }
    });
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    // 3) Build radicado code
    const year = new Date().getFullYear();
    const seqStr = currentValue.toString().padStart(4, '0');
    const radicadoCode = `${project.code}-${series}-${type}-${year}-${seqStr}`;

    return radicadoCode;
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable
  });

  return radicado;
}

export default {
  generateRadicado
};
