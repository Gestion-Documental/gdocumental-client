

import { Project, ProjectType, Document, DocumentType, DocumentStatus, SignatureMethod, DocumentTemplate, SeriesType, ArchiveLocation, ArchiveType, TRDEntry, User, AdminAuditLog } from '../types';

// --- MOCK USERS ---
export const MOCK_USERS: User[] = [
  {
    id: 'u1',
    email: 'admin@nexus.com',
    fullName: 'System Administrator',
    role: 'SUPER_ADMIN',
    avatarUrl: 'https://ui-avatars.com/api/?name=System+Admin&background=0f172a&color=fff',
    assignedProjectIds: ['p1', 'p2', 'p3'],
    isActive: true
  },
  {
    id: 'u2',
    email: 'director@nexus.com',
    fullName: 'Carlos Gutierrez',
    role: 'DIRECTOR',
    avatarUrl: 'https://ui-avatars.com/api/?name=Carlos+Gutierrez&background=6366f1&color=fff',
    signatureUrl: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMDAgNjAiPjxwYXRoIGQ9Ik0xMCw1MCBDMjAsNDAgNDAsMTAgNjAsMjAgUzgwLDgwIDEwMCw1MCBTMTUwLDIwIDE5MCw1MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjMiLz48L3N2Zz4=",
    securityPin: '1234',
    assignedProjectIds: ['p1'],
    isActive: true
  },
  {
    id: 'u3',
    email: 'user@nexus.com',
    fullName: 'Maria Rodriguez',
    role: 'ENGINEER',
    avatarUrl: 'https://ui-avatars.com/api/?name=Maria+Rodriguez&background=22c55e&color=fff',
    assignedProjectIds: ['p1'],
    isActive: true
  }
];

export const MOCK_AUDIT_LOGS: AdminAuditLog[] = [
  { id: 'l1', userId: 'u2', userEmail: 'director@nexus.com', action: 'LOGIN', timestamp: '2023-11-26T08:00:00Z', details: 'Success from IP 192.168.1.1' },
  { id: 'l2', userId: 'u3', userEmail: 'user@nexus.com', action: 'CREATE_DOC', timestamp: '2023-11-26T09:30:00Z', details: 'Draft ID: new-123' },
  { id: 'l3', userId: 'u1', userEmail: 'admin@nexus.com', action: 'UPDATE_PROJECT', timestamp: '2023-11-26T10:00:00Z', details: 'Modified TRD for Project P1' },
];

// --- ADDRESS BOOK MOCK DATA ---
export interface Contact {
  id: string;
  entityName: string; // The main organization name
  attention: string; // Specific person
  position: string;
  address: string;
}

export const MOCK_CONTACTS: Contact[] = [
  {
    id: 'c1',
    entityName: 'ALCALDIA MUNICIPAL DE JINOTEPE',
    attention: 'Lic. Elda Marina Ramos',
    position: 'Alcaldesa Municipal',
    address: 'Frente al Parque Central, Jinotepe, Carazo'
  },
  {
    id: 'c2',
    entityName: 'ENACAL - DELEGACION DEPARTAMENTAL',
    attention: 'Ing. Juan Pérez',
    position: 'Delegado Departamental',
    address: 'Km 45 Carretera Panamericana Sur, Jinotepe'
  },
  {
    id: 'c3',
    entityName: 'DISNORTE-DISSUR',
    attention: 'Gerencia Comercial',
    position: '',
    address: 'De la Parroquia Santiago 1c al Sur, Jinotepe'
  },
  {
    id: 'c4',
    entityName: 'MINISTERIO DE TRANSPORTE E INFRAESTRUCTURA (MTI)',
    attention: 'Arq. María Rodríguez',
    position: 'Directora de Proyectos',
    address: 'Frente al Estadio Nacional, Managua'
  },
  {
    id: 'c5',
    entityName: 'CEMENTOS ARGOS S.A.',
    attention: 'Lic. Carlos Gutiérrez',
    position: 'Gerente de Ventas Corporativas',
    address: 'Carretera a Masaya Km 14'
  }
];

export const MOCK_PROJECTS: Project[] = [
  {
    id: 'p1',
    name: 'Puente Norte Construction',
    prefix: 'PTE01',
    type: ProjectType.CLIENT,
    isActive: true
  },
  {
    id: 'p2',
    name: 'Corporate HQ Administration',
    prefix: 'ADM',
    type: ProjectType.INTERNAL,
    isActive: true
  },
  {
    id: 'p3',
    name: 'HR Department',
    prefix: 'RH',
    type: ProjectType.INTERNAL,
    isActive: true
  }
];

// --- TRD (RETENTION SCHEDULE) MOCK DATA ---
export const MOCK_TRD_SERIES: TRDEntry[] = [
  // ADM SERIES
  { code: '100.10', seriesName: 'ACTAS', subseriesName: 'Actas de Comité', retentionGestion: 2, retentionCentral: 10, disposition: 'CONSERVACION_TOTAL' },
  { code: '100.20', seriesName: 'CONTRATOS', subseriesName: 'Contratos de Obra', retentionGestion: 5, retentionCentral: 20, disposition: 'DIGITALIZACION' },
  { code: '100.25', seriesName: 'INFORMES', subseriesName: 'Informes de Gestión', retentionGestion: 2, retentionCentral: 5, disposition: 'SELECCION' },
  { code: '100.30', seriesName: 'CORRESPONDENCIA', subseriesName: 'Correspondencia General', retentionGestion: 1, retentionCentral: 3, disposition: 'ELIMINACION' },
  
  // TEC SERIES
  { code: '200.05', seriesName: 'PLANOS', subseriesName: 'Planos As-Built', retentionGestion: 5, retentionCentral: 50, disposition: 'CONSERVACION_TOTAL' },
  { code: '200.10', seriesName: 'BITACORA', subseriesName: 'Bitácora de Obra', retentionGestion: 5, retentionCentral: 20, disposition: 'DIGITALIZACION' },
  { code: '200.20', seriesName: 'LICENCIAS', subseriesName: 'Licencias de Construcción', retentionGestion: 5, retentionCentral: 10, disposition: 'DIGITALIZACION' }
];

// Helper to get Series Name from Code
export const getSeriesName = (code: string | undefined): string => {
    if (!code) return 'Sin Clasificar';
    const trd = MOCK_TRD_SERIES.find(t => t.code === code);
    return trd ? `${trd.seriesName} / ${trd.subseriesName}` : code;
};

// --- ARCHIVE MOCK DATA ---
export const MOCK_ARCHIVE_LOCATIONS: ArchiveLocation[] = [
  { id: 'loc-1', name: 'Oficina Central (Bogotá)', type: ArchiveType.BUILDING },
  { id: 'loc-2', name: 'Sala de Archivo 101', type: ArchiveType.ROOM, parentId: 'loc-1' },
  { id: 'loc-3', name: 'Estante Metálico A', type: ArchiveType.SHELF, parentId: 'loc-2' },
  { id: 'loc-4', name: 'Estante Metálico B', type: ArchiveType.SHELF, parentId: 'loc-2' },
  { id: 'loc-5', name: 'Caja ADM-2023-A', type: ArchiveType.BOX, parentId: 'loc-3' },
  { id: 'loc-6', name: 'Caja TEC-2023-A', type: ArchiveType.BOX, parentId: 'loc-3' },
  { id: 'loc-7', name: 'Caja TEC-2023-B', type: ArchiveType.BOX, parentId: 'loc-4' },
  { id: 'loc-8', name: 'Caja ADM-2025-Pendientes', type: ArchiveType.BOX, parentId: 'loc-3' },
  { id: 'loc-central', name: 'ARCHIVO CENTRAL (Bodega)', type: ArchiveType.ROOM, parentId: 'loc-1' }, // Target for transfers
];

export const getArchivePath = (locationId: string | undefined): ArchiveLocation[] => {
  if (!locationId) return [];
  const path: ArchiveLocation[] = [];
  let current = MOCK_ARCHIVE_LOCATIONS.find(l => l.id === locationId);
  
  while (current) {
    path.unshift(current);
    if (current.parentId) {
      current = MOCK_ARCHIVE_LOCATIONS.find(l => l.id === current?.parentId);
    } else {
      current = undefined;
    }
  }
  return path;
};

// Helper to get dates relative to today
const getRelativeDate = (daysOffset: number) => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString();
};

export const MOCK_DOCUMENTS: Document[] = [
  {
    id: 'd1',
    projectId: 'p1',
    type: DocumentType.INBOUND,
    series: 'TEC', 
    sequenceNumber: 101,
    radicadoCode: 'PTE01-TEC-IN-2023-00101',
    title: 'Initial Blueprint Submission',
    status: DocumentStatus.RADICADO,
    metadata: { sender: 'Architects Co.', date: '2023-10-01', trdCode: '200.05', transferDate: '2028-10-01' },
    createdAt: '2023-10-01T10:00:00Z',
    securityHash: 'a1b2c3d4e5...',
    requiresResponse: true,
    isCompleted: true, 
    deadline: getRelativeDate(-10),
    physicalLocationId: 'loc-6', // Assigned to Caja TEC-2023-A
    author: 'Admin System'
  },
  {
    id: 'd5',
    projectId: 'p1',
    type: DocumentType.INTERNAL,
    series: 'TEC',
    sequenceNumber: 1,
    radicadoCode: 'PTE01-TEC-INT-2023-00001',
    title: 'Review Assignment: Blueprint Check',
    status: DocumentStatus.RADICADO,
    metadata: { assignee: 'Chief Engineer', trdCode: '200.05' },
    relatedDocId: 'd1', 
    createdAt: '2023-10-01T14:00:00Z',
    receptionMedium: 'DIGITAL_PORTAL',
    author: 'Ing. Maria R.'
  },
  // --- EXPIRED DOC FOR TRANSFER TEST ---
  {
    id: 'd2',
    projectId: 'p1',
    type: DocumentType.OUTBOUND,
    series: 'ADM', 
    sequenceNumber: 45,
    radicadoCode: 'PTE01-ADM-OUT-2023-00045',
    title: 'Budget Approval Request',
    status: DocumentStatus.RADICADO,
    metadata: { recipient: 'City Planning', trdCode: '100.30', transferDate: '2024-10-02' }, // Expired!
    signatureMethod: SignatureMethod.DIGITAL,
    relatedDocId: 'd5', 
    createdAt: '2023-10-02T14:30:00Z',
    securityHash: 'f9e8d7c6...',
    deliveryStatus: 'DELIVERED', 
    receivedBy: 'Secretaria General - M. Lopez',
    receivedAt: '2023-10-03T09:00:00Z',
    physicalLocationId: 'loc-5', // Assigned to Caja ADM-2023-A
    author: 'Dir. Carlos G.'
  },
  // --- NEW DEADLINE TEST CASES ---
  {
    id: 'deadline-1',
    projectId: 'p1',
    type: DocumentType.INBOUND,
    series: 'ADM',
    sequenceNumber: 155,
    radicadoCode: 'PTE01-ADM-IN-2023-00155',
    title: 'URGENT: Regulatory Compliance Notice',
    status: DocumentStatus.RADICADO,
    metadata: { sender: 'Ministry of Transport', trdCode: '100.30' },
    createdAt: getRelativeDate(-5),
    requiresResponse: true,
    isCompleted: false,
    deadline: getRelativeDate(-1),
    receptionMedium: 'DIGITAL_EMAIL',
    author: 'Recepcion'
  },
  {
    id: 'reply-draft-1',
    projectId: 'p1',
    type: DocumentType.OUTBOUND,
    series: 'ADM',
    title: 'Ref: Response to Regulatory Notice',
    status: DocumentStatus.DRAFT,
    metadata: { recipient: 'Ministry of Transport', template: DocumentTemplate.FORMAL_LETTER },
    relatedDocId: 'deadline-1', 
    createdAt: getRelativeDate(0),
    receptionMedium: 'DIGITAL_PORTAL',
    author: 'Ing. Juan P.'
  },
  {
    id: 'deadline-2',
    projectId: 'p1',
    type: DocumentType.INBOUND,
    series: 'TEC',
    sequenceNumber: 156,
    radicadoCode: 'PTE01-TEC-IN-2023-00156',
    title: 'Material Supply Contract Renewal',
    status: DocumentStatus.RADICADO,
    metadata: { sender: 'Cementos Argos', trdCode: '100.20' },
    createdAt: getRelativeDate(-2),
    requiresResponse: true,
    isCompleted: false,
    deadline: getRelativeDate(2),
    receptionMedium: 'DIGITAL_EMAIL',
    author: 'Recepcion'
  },
  {
    id: 'deadline-3',
    projectId: 'p1',
    type: DocumentType.INBOUND,
    series: 'ADM',
    sequenceNumber: 157,
    radicadoCode: 'PTE01-ADM-IN-2023-00157',
    title: 'Invitation to Annual Gala',
    status: DocumentStatus.RADICADO,
    metadata: { sender: 'Chamber of Commerce', trdCode: '100.30', transferDate: '2024-01-01' }, // Expired!
    createdAt: getRelativeDate(-1),
    requiresResponse: true,
    isCompleted: false,
    deadline: getRelativeDate(20),
    receptionMedium: 'DIGITAL_EMAIL',
    author: 'Recepcion'
  },
  {
    id: 'd3',
    projectId: 'p2',
    type: DocumentType.INTERNAL,
    series: 'ADM',
    sequenceNumber: 12,
    radicadoCode: 'ADM-ADM-INT-2023-00012',
    title: 'Q4 Strategy Memo',
    status: DocumentStatus.RADICADO,
    metadata: { priority: 'High' },
    createdAt: '2023-10-05T09:15:00Z',
    author: 'CEO'
  },
  {
    id: 'd4',
    projectId: 'p1',
    type: DocumentType.INBOUND,
    series: 'ADM',
    sequenceNumber: undefined,
    radicadoCode: undefined,
    title: 'Pending Supplier Invoice',
    status: DocumentStatus.DRAFT,
    metadata: { supplier: 'Cementos Argos' },
    createdAt: '2023-10-06T11:00:00Z',
    receptionMedium: 'DIGITAL_PORTAL',
    author: 'Recepcion'
  }
];

const SEQUENCE_STORE: Record<string, number> = {
  'p1-ADM-INBOUND': 157,
  'p1-ADM-OUTBOUND': 45,
  'p1-ADM-INTERNAL': 1,
  'p1-TEC-INBOUND': 101,
  'p1-TEC-OUTBOUND': 0,
  'p1-TEC-INTERNAL': 1,
};

const generateMockHash = (input: string) => {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; 
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
};

export const simulateRadication = (doc: Document, project: Project, method: SignatureMethod): Document => {
  const key = `${project.id}-${doc.series}-${doc.type}`;
  const nextSeq = (SEQUENCE_STORE[key] || 0) + 1;
  SEQUENCE_STORE[key] = nextSeq;

  let typeCode = 'INT';
  if (doc.type === DocumentType.INBOUND) typeCode = 'IN';
  if (doc.type === DocumentType.OUTBOUND) typeCode = 'OUT';

  const year = new Date().getFullYear();
  const seqStr = nextSeq.toString().padStart(5, '0');
  
  const radicadoCode = `${project.prefix}-${doc.series}-${typeCode}-${year}-${seqStr}`;

  const securityHash = generateMockHash(doc.id + radicadoCode + 'SECRET');
  const qrData = JSON.stringify({ r: radicadoCode, id: doc.id, h: securityHash.substring(0,8) });

  let finalStatus = DocumentStatus.RADICADO;
  if (doc.type === DocumentType.OUTBOUND && method === SignatureMethod.PHYSICAL) {
    finalStatus = DocumentStatus.PENDING_SCAN;
  }

  // Initialize delivery status for Outbound
  let deliveryStatus: 'PENDING' | 'DELIVERED' | undefined = undefined;
  if (doc.type === DocumentType.OUTBOUND && finalStatus === DocumentStatus.RADICADO) {
      deliveryStatus = 'PENDING';
  }

  return {
    ...doc,
    status: finalStatus,
    sequenceNumber: nextSeq,
    radicadoCode: radicadoCode,
    securityHash: securityHash,
    qrCodeData: qrData,
    signatureMethod: method,
    updatedAt: new Date().toISOString(),
    deliveryStatus: deliveryStatus // New Field
  };
};

export const getDocumentThread = (rootId: string, allDocs: Document[]): Document[] => {
  const thread: Document[] = [];
  const current = allDocs.find(d => d.id === rootId);
  if (!current) return [];
  
  let ptr = current;
  while (ptr.relatedDocId) {
    const parent = allDocs.find(d => d.id === ptr.relatedDocId);
    if (parent) {
      thread.unshift(parent);
      ptr = parent;
    } else {
      break;
    }
  }

  thread.push(current);

  const children = allDocs.filter(d => d.relatedDocId === rootId);
  thread.push(...children);
  
  const uniqueThread = Array.from(new Set(thread.map(d => d.id)))
    .map(id => thread.find(d => d.id === id)!);

  return uniqueThread.sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}