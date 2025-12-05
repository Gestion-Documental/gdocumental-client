import request from 'supertest';
import { PrismaClient, DocumentType, DocumentStatus, UserRole } from '@prisma/client';

// Mock Prisma Client
const mockPrisma = {
  document: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  project: {
    findUnique: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
  attachment: {
    create: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  }
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
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
  },
  UserRole: {
    ENGINEER: 'ENGINEER',
    DIRECTOR: 'DIRECTOR',
    SUPER_ADMIN: 'SUPER_ADMIN'
  }
}));

// Mock authentication middleware
jest.mock('../auth.middleware', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    // Default mock user, can be overridden in tests if needed by mocking this module again or using spyOn
    req.user = { id: 'user-1', role: 'ENGINEER', email: 'test@example.com' };
    next();
  },
  AuthenticatedRequest: jest.requireActual('../auth.middleware').AuthenticatedRequest
}));

// Mock RBAC middleware
jest.mock('../rbac.middleware', () => ({
  checkRole: (roles: any[]) => (req: any, res: any, next: any) => {
    // Basic mock: allow everything
    next();
  }
}));

// Mock services
jest.mock('../radication.service', () => ({
  generateRadicado: jest.fn().mockResolvedValue('MOCKED-RADICADO-001'),
}));

jest.mock('../storage/index', () => ({
  getStorage: () => ({
    save: jest.fn().mockResolvedValue({ url: '/uploads/file.docx', key: 'file.docx', size: 100 }),
    delete: jest.fn(),
  }),
  getStorageDriver: () => 'local',
}));

jest.mock('docx', () => ({
    Document: jest.fn(),
    Packer: { toBuffer: jest.fn().mockResolvedValue(Buffer.from('mock-docx')) },
    Paragraph: jest.fn(),
    TextRun: jest.fn(),
    Table: jest.fn(),
    TableRow: jest.fn(),
    TableCell: jest.fn(),
    Header: jest.fn(),
    Footer: jest.fn(),
    WidthType: {},
    AlignmentType: {},
    BorderStyle: {}
}));

import { app } from '../app';

describe('Document Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /documents', () => {
    it('should list documents', async () => {
      mockPrisma.document.findMany.mockResolvedValue([
        { id: '1', title: 'Test Doc', status: 'DRAFT' }
      ]);

      const res = await request(app).get('/documents');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('Test Doc');
    });
  });

  describe('GET /documents/:id', () => {
    it('should return 404 if document not found', async () => {
      mockPrisma.document.findUnique.mockResolvedValue(null);
      const res = await request(app).get('/documents/999');
      expect(res.status).toBe(404);
    });

    it('should return document if found', async () => {
      mockPrisma.document.findUnique.mockResolvedValue({ id: '1', title: 'Test Doc' });
      const res = await request(app).get('/documents/1');
      expect(res.status).toBe(200);
      expect(res.body.id).toBe('1');
    });
  });

  describe('POST /documents/create', () => {
    it('should create a draft document', async () => {
      mockPrisma.document.create.mockResolvedValue({
        id: '1',
        title: 'New Doc',
        status: 'DRAFT',
        type: 'OUTBOUND',
        series: 'ADM',
        projectId: 'p1'
      });
      // Mock template generation logic
      mockPrisma.document.update.mockResolvedValue({
          id: '1',
          title: 'New Doc',
          status: 'DRAFT',
          contentUrl: '/uploads/file.docx'
      });

      const res = await request(app).post('/documents/create').send({
        projectId: 'p1',
        type: 'OUTBOUND',
        series: 'ADM',
        title: 'New Doc',
        content: 'Some content'
      });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe('1');
      expect(mockPrisma.document.create).toHaveBeenCalled();
    });

    it('should return 400 if missing fields', async () => {
      const res = await request(app).post('/documents/create').send({
        title: 'Incomplete Doc'
      });
      expect(res.status).toBe(400);
    });
  });

   describe('POST /documents/inbound', () => {
    it('should register an inbound document', async () => {
      mockPrisma.document.create.mockResolvedValue({
        id: '2',
        title: 'Inbound Doc',
        status: 'RADICADO',
        radicadoCode: 'MOCKED-RADICADO-001',
        type: 'INBOUND'
      });

      const res = await request(app).post('/documents/inbound')
        .field('projectId', 'p1')
        .field('series', 'ADM')
        .field('title', 'Inbound Doc')
        .attach('file', Buffer.from('dummy pdf content'), { filename: 'test.pdf', contentType: 'application/pdf' });

      expect(res.status).toBe(201);
      expect(res.body.radicadoCode).toBe('MOCKED-RADICADO-001');
      expect(mockPrisma.document.create).toHaveBeenCalled();
      expect(mockPrisma.attachment.create).toHaveBeenCalled();
    });
  });

  describe('PUT /documents/:id', () => {
      it('should update a draft document', async () => {
          mockPrisma.document.findUnique.mockResolvedValue({
              id: '1',
              title: 'Old Title',
              status: 'DRAFT',
              type: 'OUTBOUND',
              projectId: 'p1'
          });
          mockPrisma.document.update.mockResolvedValue({
              id: '1',
              title: 'New Title',
              status: 'DRAFT'
          });

          const res = await request(app).put('/documents/1').send({
              title: 'New Title'
          });

          expect(res.status).toBe(200);
          expect(res.body.title).toBe('New Title');
          expect(mockPrisma.document.update).toHaveBeenCalled();
      });

      it('should not update if document is radicado', async () => {
        mockPrisma.document.findUnique.mockResolvedValue({
            id: '1',
            status: 'RADICADO'
        });

        const res = await request(app).put('/documents/1').send({ title: 'New Title' });
        expect(res.status).toBe(400);
        expect(res.body.error).toContain('No se puede editar');
      });
  });

  describe('PUT /documents/:id/assign', () => {
      it('should assign a user to document', async () => {
          mockPrisma.document.update.mockResolvedValue({
              id: '1',
              assignedToUserId: 'user-2'
          });

          const res = await request(app).put('/documents/1/assign').send({ userId: 'user-2' });
          expect(res.status).toBe(200);
          expect(mockPrisma.document.update).toHaveBeenCalledWith(expect.objectContaining({
              data: { assignedToUserId: 'user-2' }
          }));
      });
  });

  describe('POST /documents/:id/status', () => {
      it('should update document status', async () => {
          mockPrisma.document.findUnique.mockResolvedValue({
              id: '1',
              status: 'DRAFT'
          });
          mockPrisma.document.update.mockResolvedValue({
              id: '1',
              status: 'PENDING_APPROVAL'
          });

          const res = await request(app).post('/documents/1/status').send({ status: 'PENDING_APPROVAL' });
          expect(res.status).toBe(200);
          expect(mockPrisma.document.update).toHaveBeenCalled();
      });

      it('should prevent invalid transitions', async () => {
          mockPrisma.document.findUnique.mockResolvedValue({
              id: '1',
              status: 'RADICADO'
          });

          const res = await request(app).post('/documents/1/status').send({ status: 'DRAFT' });
          expect(res.status).toBe(400);
          expect(res.body.error).toContain('No se puede regresar a borrador');
      });
  });
});
