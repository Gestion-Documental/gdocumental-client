"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const document_controller_1 = __importDefault(require("./document.controller"));
const auth_middleware_1 = require("./auth.middleware");
const auth_controller_1 = __importDefault(require("./auth.controller"));
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const project_controller_1 = __importDefault(require("./project.controller"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = Number(process.env.PORT) || 4000;
const prisma = new client_1.PrismaClient();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/auth', auth_controller_1.default);
app.use('/projects', auth_middleware_1.authMiddleware, project_controller_1.default);
app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});
// Rutas protegidas
app.use('/documents', auth_middleware_1.authMiddleware, document_controller_1.default);
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
            create: { id: p.id, code: p.code, name: p.name, seriesConfig: { adm: true, tec: true } },
        });
    }
    // Usuarios base (demo)
    const users = [
        { email: 'admin@radika.local', fullName: 'Admin Radika', role: 'SUPER_ADMIN' },
        { email: 'director@radika.local', fullName: 'Director Radika', role: 'DIRECTOR' },
        { email: 'user@radika.local', fullName: 'Ingeniero Radika', role: 'ENGINEER' },
    ];
    const passwordHash = await bcryptjs_1.default.hash('123456', 10);
    for (const u of users) {
        await prisma.user.upsert({
            where: { email: u.email },
            update: { fullName: u.fullName, role: u.role },
            create: {
                email: u.email,
                fullName: u.fullName,
                role: u.role,
                passwordHash,
                status: 'ACTIVE',
            },
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
