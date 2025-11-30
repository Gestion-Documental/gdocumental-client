"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const JWT_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('JWT secret is not configured. Set JWT_ACCESS_SECRET or JWT_SECRET.');
}
async function authMiddleware(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing or invalid Authorization header' });
        }
        const token = authHeader.replace('Bearer ', '').trim();
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        // Optional: hydrate from DB to ensure user still exists/active
        const user = await prisma.user.findUnique({
            where: { id: payload.sub },
            select: { id: true, email: true, role: true }
        });
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }
        req.user = user;
        return next();
    }
    catch (err) {
        console.error('Auth error:', err);
        return res.status(401).json({ error: 'Unauthorized' });
    }
}
