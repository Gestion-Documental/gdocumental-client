import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock Prisma Client
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
  UserRole: {
    ENGINEER: 'ENGINEER',
    DIRECTOR: 'DIRECTOR',
    SUPER_ADMIN: 'SUPER_ADMIN'
  },
  DocumentType: {
    INBOUND: 'INBOUND',
    OUTBOUND: 'OUTBOUND',
    INTERNAL: 'INTERNAL'
  },
  DocumentStatus: {
    DRAFT: 'DRAFT',
    PENDING_APPROVAL: 'PENDING_APPROVAL',
    PENDING_SCAN: 'PENDING_SCAN',
    RADICADO: 'RADICADO',
    ARCHIVED: 'ARCHIVED',
    VOID: 'VOID'
  }
}));

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

// Mock jwt
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
}));

// Import app AFTER mocks are defined
import { app } from '../app';

describe('Auth Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/login', () => {
    it('should return 400 if email or password is missing', async () => {
      const res = await request(app).post('/auth/login').send({ email: 'test@example.com' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Email y contraseña son obligatorios');
    });

    it('should return 401 if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const res = await request(app).post('/auth/login').send({ email: 'test@example.com', password: 'password' });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Usuario no encontrado');
    });

    it('should return 401 if password does not match', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
        failedLoginAttempts: 0,
        lockedUntil: null,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const res = await request(app).post('/auth/login').send({ email: 'test@example.com', password: 'wrongpassword' });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Credenciales inválidas');
      expect(mockPrisma.user.update).toHaveBeenCalled(); // Should increment failed attempts
    });

    it('should return tokens and user if login is successful', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
        fullName: 'Test User',
        role: 'ENGINEER',
        failedLoginAttempts: 0,
        lockedUntil: null,
        tokenVersion: 1,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue('mock-token');

      const res = await request(app).post('/auth/login').send({ email: 'test@example.com', password: 'password' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token', 'mock-token');
      expect(res.body).toHaveProperty('refreshToken', 'mock-token');
      expect(res.body.user).toHaveProperty('email', 'test@example.com');
      expect(mockPrisma.user.update).toHaveBeenCalled(); // Should reset failed attempts
    });
  });

  describe('GET /auth/me', () => {
    it('should return 401 if no token provided', async () => {
      const res = await request(app).get('/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Falta token');
    });

    it('should return user info if token is valid', async () => {
      (jwt.verify as jest.Mock).mockReturnValue({ sub: '1' });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'test@example.com',
        fullName: 'Test User',
        role: 'ENGINEER',
        signatureImage: null,
        signaturePin: null
      });

      const res = await request(app).get('/auth/me').set('Authorization', 'Bearer valid-token');
      expect(res.status).toBe(200);
      expect(res.body.email).toBe('test@example.com');
    });

    it('should return 401 if token is invalid', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const res = await request(app).get('/auth/me').set('Authorization', 'Bearer invalid-token');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Token inválido');
    });
  });
});
