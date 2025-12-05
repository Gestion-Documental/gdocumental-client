import request from 'supertest';
import { PrismaClient, DocumentType, DocumentStatus, UserRole } from '@prisma/client';
import { generateRadicado } from '../radication.service';

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
    count: jest.fn().mockResolvedValue(0),
  },
  user: {
    findUnique: jest.fn(),
  },
  workflow: {
    create: jest.fn(),
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
    // We'll set the user role dynamically in tests if needed, but for now default to ENGINEER or DIRECTOR
    req.user = { id: 'user-1', role: req.headers['x-test-role'] || 'ENGINEER', email: 'test@example.com' };
    next();
  },
  AuthenticatedRequest: jest.requireActual('../auth.middleware').AuthenticatedRequest
}));

// Mock RBAC middleware
jest.mock('../rbac.middleware', () => ({
  checkRole: (roles: any[]) => (req: any, res: any, next: any) => {
    next();
  }
}));

// Mock services
jest.mock('../radication.service', () => ({
  generateRadicado: jest.fn().mockResolvedValue('MOCKED-RADICADO'),
}));

jest.mock('../storage/index', () => ({
  getStorage: () => ({
    save: jest.fn().mockResolvedValue({ url: '/uploads/file.pdf', key: 'file.pdf', size: 100 }),
    delete: jest.fn(),
  }),
  getStorageDriver: () => 'local',
}));

jest.mock('../services/conversion.service', () => ({
    convertToPdf: jest.fn().mockResolvedValue('http://mock-pdf-url')
}));

jest.mock('node-fetch', () => jest.fn().mockResolvedValue({
    ok: true,
    buffer: jest.fn().mockResolvedValue(Buffer.from('mock-pdf-buffer'))
}));

jest.mock('../services/stamping.service', () => ({
    stampPdf: jest.fn().mockResolvedValue(Buffer.from('stamped-pdf'))
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

describe('Bug Reproduction: Inconsistent Radication Type for Internal Documents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should use "INT" when radicating via /radicar (Director manual radication)', async () => {
    mockPrisma.document.findUnique.mockResolvedValue({
      id: 'doc-1',
      projectId: 'proj-1',
      series: 'ADM',
      type: 'INTERNAL',
      status: 'DRAFT',
      metadata: {},
      contentUrl: '/doc.docx'
    });
    mockPrisma.document.update.mockResolvedValue({
        id: 'doc-1',
        radicadoCode: 'RAD-INT',
        status: 'RADICADO'
    });
    mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        fullName: 'Director',
        role: 'DIRECTOR',
        signatureImage: 'sig.png'
    });

    const res = await request(app)
        .post('/documents/doc-1/radicar')
        .set('x-test-role', 'DIRECTOR')
        .send({ signatureMethod: 'DIGITAL' });

    expect(res.status).toBe(200);
    expect(generateRadicado).toHaveBeenCalledWith('proj-1', 'ADM', 'INT');
  });

  it('should use "INT" when radicating via /sign (Engineer/Director direct sign)', async () => {
    mockPrisma.document.findUnique.mockResolvedValue({
      id: 'doc-2',
      projectId: 'proj-1',
      series: 'ADM',
      type: 'INTERNAL',
      status: 'DRAFT',
      metadata: {},
      contentUrl: '/doc.docx'
    });
    mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        fullName: 'Engineer',
        role: 'ENGINEER',
        signaturePin: '1234',
        signatureImage: 'sig.png'
    });
    mockPrisma.document.update.mockResolvedValue({
        id: 'doc-2',
        radicadoCode: 'RAD-?',
        status: 'RADICADO'
    });

    const res = await request(app)
        .post('/documents/sign')
        .set('x-test-role', 'ENGINEER')
        .send({ documentId: 'doc-2', signaturePin: '1234' });

    expect(res.status).toBe(200);
    expect(generateRadicado).toHaveBeenCalledWith('proj-1', 'ADM', 'INT');
  });
});
