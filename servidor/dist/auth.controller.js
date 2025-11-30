"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma = new client_1.PrismaClient();
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('JWT secret is not configured. Set JWT_ACCESS_SECRET or JWT_SECRET.');
}
// Simple login/auto-provision for demo/dev
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
    }
    try {
        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            // Auto-provision user with DIRECTOR role for demo purposes
            const passwordHash = await bcryptjs_1.default.hash(password, 10);
            user = await prisma.user.create({
                data: {
                    email,
                    passwordHash,
                    fullName: email.split('@')[0],
                    role: 'DIRECTOR',
                },
            });
        }
        else {
            const ok = await bcryptjs_1.default.compare(password, user.passwordHash);
            if (!ok) {
                return res.status(401).json({ error: 'Credenciales inválidas' });
            }
        }
        const token = jsonwebtoken_1.default.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
        return res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
            },
        });
    }
    catch (error) {
        console.error('Login error', error);
        return res.status(500).json({ error: 'No se pudo iniciar sesión' });
    }
});
router.get('/me', async (req, res) => {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Falta token' });
    }
    const token = auth.replace('Bearer ', '').trim();
    try {
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const user = await prisma.user.findUnique({
            where: { id: payload.sub },
            select: { id: true, email: true, fullName: true, role: true },
        });
        if (!user)
            return res.status(401).json({ error: 'Usuario no encontrado' });
        res.json(user);
    }
    catch (error) {
        return res.status(401).json({ error: 'Token inválido' });
    }
});
exports.default = router;
