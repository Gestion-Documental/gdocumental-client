"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const rbac_middleware_1 = require("./rbac.middleware");
const prisma = new client_1.PrismaClient();
const router = (0, express_1.Router)();
// List projects
router.get('/', async (_req, res) => {
    try {
        const projects = await prisma.project.findMany({
            orderBy: { name: 'asc' },
        });
        res.json(projects);
    }
    catch (error) {
        console.error('List projects error:', error);
        res.status(500).json({ error: 'Failed to list projects' });
    }
});
// Create project
router.post('/', (0, rbac_middleware_1.checkRole)(['SUPER_ADMIN', 'DIRECTOR']), async (req, res) => {
    try {
        const { id, code, name, seriesConfig } = req.body;
        const project = await prisma.project.create({
            data: {
                id,
                code,
                name,
                seriesConfig: seriesConfig || {},
            },
        });
        res.status(201).json(project);
    }
    catch (error) {
        console.error('Create project error:', error);
        res.status(500).json({ error: 'Failed to create project' });
    }
});
// Update project
router.put('/:id', (0, rbac_middleware_1.checkRole)(['SUPER_ADMIN', 'DIRECTOR']), async (req, res) => {
    try {
        const { id } = req.params;
        const { code, name, seriesConfig } = req.body;
        const project = await prisma.project.update({
            where: { id },
            data: {
                code: code ?? undefined,
                name: name ?? undefined,
                seriesConfig: seriesConfig ?? undefined,
            },
        });
        res.json(project);
    }
    catch (error) {
        console.error('Update project error:', error);
        res.status(500).json({ error: 'Failed to update project' });
    }
});
// Delete project
router.delete('/:id', (0, rbac_middleware_1.checkRole)(['SUPER_ADMIN']), async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.project.delete({ where: { id } });
        res.json({ ok: true });
    }
    catch (error) {
        console.error('Delete project error:', error);
        res.status(500).json({ error: 'Failed to delete project' });
    }
});
exports.default = router;
