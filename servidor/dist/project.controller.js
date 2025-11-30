"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
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
exports.default = router;
