"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const rbac_middleware_1 = require("./rbac.middleware");
const radication_service_1 = require("./radication.service");
const prisma = new client_1.PrismaClient();
const router = (0, express_1.Router)();
// List documents for a project (basic)
router.get('/', async (req, res) => {
    try {
        const { projectId } = req.query;
        const docs = await prisma.document.findMany({
            where: projectId ? { projectId: projectId } : undefined,
            orderBy: { createdAt: 'desc' },
        });
        return res.json(docs);
    }
    catch (err) {
        console.error('List documents error:', err);
        return res.status(500).json({ error: 'Failed to list documents' });
    }
});
// Register inbound document (external)
router.post('/inbound', (0, rbac_middleware_1.checkRole)([client_1.UserRole.ENGINEER, client_1.UserRole.DIRECTOR]), async (req, res) => {
    try {
        const { projectId, series, title, metadata, requiresResponse, deadline, receptionMedium } = req.body;
        const userId = req.user.id;
        // Generate radicado
        const radicadoCode = await (0, radication_service_1.generateRadicado)(projectId, series, 'IN');
        const doc = await prisma.document.create({
            data: {
                projectId,
                type: client_1.DocumentType.INBOUND,
                series,
                title,
                content: metadata?.content || null,
                status: client_1.DocumentStatus.RADICADO,
                radicadoCode,
                metadata: {
                    set: {
                        ...metadata,
                        requiresResponse: !!requiresResponse,
                        deadline: deadline || null,
                        receptionMedium: receptionMedium || null,
                        registeredBy: userId,
                    },
                },
                authorId: userId,
                createdAt: new Date(),
            },
        });
        return res.status(201).json(doc);
    }
    catch (err) {
        console.error('Inbound register error:', err);
        return res.status(500).json({ error: 'Failed to register inbound document' });
    }
});
// POST /documents/create - create draft
router.post('/create', (0, rbac_middleware_1.checkRole)([client_1.UserRole.ENGINEER, client_1.UserRole.DIRECTOR]), async (req, res) => {
    try {
        const { projectId, type, series, metadata, title, content, retentionDate, isPhysicalOriginal, physicalLocationId } = req.body;
        const doc = await prisma.document.create({
            data: {
                projectId,
                type,
                series,
                status: client_1.DocumentStatus.DRAFT,
                metadata,
                title,
                retentionDate,
                isPhysicalOriginal: !!isPhysicalOriginal,
                physicalLocationId,
                authorId: req.user.id,
                createdAt: new Date()
            }
        });
        return res.status(201).json({ id: doc.id, status: doc.status });
    }
    catch (err) {
        console.error('Create draft error:', err);
        return res.status(500).json({ error: 'Failed to create draft' });
    }
});
// POST /documents/sign - finalize and radicate (directors only)
router.post('/sign', (0, rbac_middleware_1.checkRole)([client_1.UserRole.DIRECTOR]), async (req, res) => {
    try {
        const { documentId, signaturePin } = req.body;
        const userId = req.user.id;
        // Validate pin
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { signaturePin: true, role: true }
        });
        if (!user || !user.signaturePin || user.signaturePin !== signaturePin) {
            return res.status(400).json({ error: 'Invalid signature PIN' });
        }
        // Fetch doc
        const doc = await prisma.document.findUnique({
            where: { id: documentId },
            select: { id: true, projectId: true, series: true, status: true, type: true }
        });
        if (!doc)
            return res.status(404).json({ error: 'Document not found' });
        if (doc.status !== client_1.DocumentStatus.DRAFT && doc.status !== client_1.DocumentStatus.PENDING_APPROVAL) {
            return res.status(400).json({ error: 'Document not eligible for signing' });
        }
        // Generate radicado atomically
        const radicadoCode = await (0, radication_service_1.generateRadicado)(doc.projectId, doc.series, doc.type === 'INBOUND' ? 'IN' : 'OUT');
        const updated = await prisma.document.update({
            where: { id: documentId },
            data: {
                radicadoCode,
                status: client_1.DocumentStatus.RADICADO,
                updatedAt: new Date()
            }
        });
        // Record workflow entry
        await prisma.workflow.create({
            data: {
                documentId: documentId,
                userId,
                action: 'APPROVED',
                comments: 'Firmado digitalmente y radicado',
                actedAt: new Date()
            }
        });
        return res.json({ radicadoCode: updated.radicadoCode, status: updated.status });
    }
    catch (err) {
        console.error('Sign error:', err);
        return res.status(500).json({ error: 'Failed to sign document' });
    }
});
// POST /documents/:id/radicar - finalize and assign radicado (digital o físico)
router.post('/:id/radicar', (0, rbac_middleware_1.checkRole)([client_1.UserRole.DIRECTOR]), async (req, res) => {
    const { id } = req.params;
    const { signatureMethod } = req.body; // DIGITAL | PHYSICAL
    try {
        const doc = await prisma.document.findUnique({ where: { id } });
        if (!doc)
            return res.status(404).json({ error: 'Documento no encontrado' });
        if (doc.status === client_1.DocumentStatus.RADICADO) {
            return res.status(400).json({ error: 'Ya está radicado' });
        }
        const typeCode = doc.type === client_1.DocumentType.INBOUND ? 'IN' : doc.type === client_1.DocumentType.OUTBOUND ? 'OUT' : 'INT';
        const radicadoCode = await (0, radication_service_1.generateRadicado)(doc.projectId, doc.series, typeCode);
        let finalStatus = client_1.DocumentStatus.RADICADO;
        if (doc.type === client_1.DocumentType.OUTBOUND && signatureMethod === 'PHYSICAL') {
            finalStatus = client_1.DocumentStatus.PENDING_SCAN;
        }
        const updated = await prisma.document.update({
            where: { id },
            data: {
                radicadoCode,
                status: finalStatus,
                metadata: {
                    set: {
                        ...doc.metadata,
                        signatureMethod: signatureMethod || 'DIGITAL',
                        radicadoAt: new Date().toISOString(),
                    },
                },
                updatedAt: new Date(),
            },
        });
        return res.json(updated);
    }
    catch (err) {
        console.error('Radicar error:', err);
        return res.status(500).json({ error: 'No se pudo radicar' });
    }
});
// POST /documents/void - void a document (directors only)
router.post('/void', (0, rbac_middleware_1.checkRole)([client_1.UserRole.DIRECTOR]), async (req, res) => {
    try {
        const { documentId, reason } = req.body;
        if (!reason || reason.trim().length < 3) {
            return res.status(400).json({ error: 'Void reason is required' });
        }
        const doc = await prisma.document.findUnique({
            where: { id: documentId },
            select: { status: true }
        });
        if (!doc)
            return res.status(404).json({ error: 'Document not found' });
        if (doc.status === client_1.DocumentStatus.VOID) {
            return res.status(400).json({ error: 'Document already void' });
        }
        await prisma.document.update({
            where: { id: documentId },
            data: {
                status: client_1.DocumentStatus.VOID,
                metadata: {
                    // append void info; merge existing metadata
                    set: {
                        voidReason: reason,
                        voidedAt: new Date().toISOString()
                    }
                },
                updatedAt: new Date()
            }
        });
        await prisma.workflow.create({
            data: {
                documentId,
                userId: req.user.id,
                action: 'REJECTED',
                comments: `Documento anulado: ${reason}`,
                actedAt: new Date()
            }
        });
        return res.json({ status: 'VOID' });
    }
    catch (err) {
        console.error('Void error:', err);
        return res.status(500).json({ error: 'Failed to void document' });
    }
});
exports.default = router;
