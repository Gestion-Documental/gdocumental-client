"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRadicado = generateRadicado;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
/**
 * Transactional Radicado generator
 * - Atomic per (projectId, series)
 * - Safe against concurrent calls using SELECT ... FOR UPDATE via update on Sequence row
 */
async function generateRadicado(projectId, series, type) {
    const radicado = await prisma.$transaction(async (tx) => {
        // 1) Lock/create sequence for this project + series
        const sequence = await tx.sequence.upsert({
            where: { projectId_series: { projectId, series } },
            update: { value: { increment: 1 } },
            create: { projectId, series, value: 1 },
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
        isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable
    });
    return radicado;
}
exports.default = {
    generateRadicado
};
