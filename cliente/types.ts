


export enum ProjectType {
  INTERNAL = 'INTERNAL',
  CLIENT = 'CLIENT'
}

export enum DocumentType {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
  INTERNAL = 'INTERNAL'
}

export type SeriesType = 'ADM' | 'TEC'; 

export enum DocumentTemplate {
  FORMAL_LETTER = 'FORMAL_LETTER',
  INTERNAL_MEMO = 'INTERNAL_MEMO',
  COVER_LETTER = 'COVER_LETTER',
  NONE = 'NONE'
}

export enum DocumentStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  PENDING_SCAN = 'PENDING_SCAN', 
  RADICADO = 'RADICADO',
  ARCHIVED = 'ARCHIVED',
  VOID = 'VOID' // New Status for Annulled Documents
}

export enum SignatureMethod {
  DIGITAL = 'DIGITAL',
  PHYSICAL = 'PHYSICAL'
}

export type DateRangeOption = 'ALL' | '7D' | '30D';

export type ReceptionMedium = 'PHYSICAL' | 'DIGITAL_EMAIL' | 'DIGITAL_PORTAL';

// --- AUTH & USER TYPES ---
export type SystemRole = 'SUPER_ADMIN' | 'DIRECTOR' | 'ENGINEER';
export type UserRole = SystemRole;

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: SystemRole;
  avatarUrl?: string;
  signatureUrl?: string; // The official PNG signature
  securityPin?: string; // The 4 digit PIN
  assignedProjectIds: string[]; // Scope of access
  isActive: boolean;
}

export interface AdminAuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string; // e.g. "LOGIN", "CREATE_USER", "VOID_DOC"
  timestamp: string;
  details?: string;
}

// --- ARCHIVE TOPOGRAPHY TYPES ---
export enum ArchiveType {
  BUILDING = 'BUILDING',
  ROOM = 'ROOM',
  SHELF = 'SHELF',
  BOX = 'BOX',
  BINDER = 'BINDER'
}

export interface ArchiveLocation {
  id: string;
  name: string; // e.g., "Caja TEC-2025-A"
  type: ArchiveType;
  parentId?: string; // For hierarchy
  qrCode?: string;
}

export interface TRDEntry {
  code: string;
  seriesName: string;
  subseriesName: string;
  retentionGestion: number;
  retentionCentral: number;
  disposition: string;
  responseDays?: number; // opcional para SLA de respuesta
}

export interface Comment {
  id: string;
  author: string;
  role: SystemRole | 'SYSTEM';
  text: string;
  createdAt: string;
  changes?: {
    original: string;
    modified: string;
  };
}

export interface Attachment {
  id: string;
  name: string;
  type: 'PDF' | 'EXCEL' | 'IMAGE' | 'EMAIL' | 'OTHER';
  size?: string | number;
  url?: string;
  file?: File; // solo en cliente antes de subir
}

export interface Project {
  id: string;
  name: string;
  prefix: string; 
  type: ProjectType;
  isActive: boolean;
  trd?: TRDEntry[];
}

export interface Document {
  id: string;
  projectId: string;
  type: DocumentType;
  series: SeriesType; 
  sequenceNumber?: number; 
  radicadoCode?: string;   
  title: string;
  status: DocumentStatus;
  
  metadata: {
    template?: DocumentTemplate;
    
    // Outbound Recipient
    recipientName?: string;
    recipientRole?: string;
    recipientCompany?: string;
    recipientAddress?: string;
    
    // Inbound Sender
    sender?: string;
    externalReference?: string; // e.g. "Oficio-2023-500" from the client
    documentDate?: string; // Date on the physical paper
    
    // Copies
    ccList?: string[]; // New Field: Carbon Copies
    
    comments?: Comment[];
    attachments?: Attachment[];

    // Void Logic
    voidReason?: string;
    voidedBy?: string;
    voidedAt?: string;

    [key: string]: any;
  };
  
  content?: string; 

  securityHash?: string;
  qrCodeData?: string;
  signatureMethod?: SignatureMethod;
  signatureImage?: string; 

  relatedDocId?: string; 

  requiresResponse?: boolean;
  deadline?: string; 
  isCompleted?: boolean; 

  // --- DELIVERY TRACKING ---
  deliveryStatus?: 'PENDING' | 'DELIVERED';
  receivedBy?: string;
  receivedAt?: string;
  deliveryProof?: string; // URL to image/scan

  // --- EMAIL DISPATCH TRACKING ---
  dispatchMethod?: 'NEXUS_MAIL' | 'EXTERNAL_CLIENT' | null;
  dispatchDate?: string | null;
  emailTrackingStatus?: 'SENT' | 'OPENED' | 'CLICKED' | null;
  
  // --- INBOUND / PHYSICAL TRACKING ---
  receptionMedium?: ReceptionMedium; // New Field
  isPhysicalOriginal?: boolean; // New Field
  physicalLocationId?: string; // ID of the Box/Binder where original is stored

  author?: string; // Author of the document

  createdAt: string;
  updatedAt?: string;
  attachments?: Attachment[];
}

export interface DocumentRelation {
  sourceId: string;
  targetId: string;
  relationType: 'REPLY_TO' | 'REFERENCES';
}

export type ViewState = 'LOGIN' | 'DASHBOARD' | 'SCHEMA_VIEWER' | 'ARCHIVE_MANAGER' | 'ADMIN_DASHBOARD' | 'USER_PROFILE';
