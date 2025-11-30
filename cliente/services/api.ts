import { Document, DocumentStatus, DocumentType, SignatureMethod } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const authHeader = (token: string) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

const mapProject = (p: any) => ({
  id: p.id,
  name: p.name,
  prefix: p.code || p.prefix || '',
  type: 'CLIENT',
  isActive: true,
});

const mapDocument = (doc: any): Document => {
  return {
    id: doc.id,
    projectId: doc.projectId,
    type: doc.type as DocumentType,
    series: doc.series as any,
    sequenceNumber: doc.sequenceNumber,
    radicadoCode: doc.radicadoCode || undefined,
    title: doc.title || '',
    status: doc.status as DocumentStatus,
    metadata: doc.metadata || {},
    content: doc.content || '',
    requiresResponse: doc.metadata?.requiresResponse || false,
    deadline: doc.metadata?.deadline || undefined,
    isCompleted: doc.metadata?.isCompleted || false,
    receptionMedium: doc.metadata?.receptionMedium,
    physicalLocationId: doc.physicalLocationId || undefined,
    author: doc.metadata?.author || '',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt || undefined,
  };
};

export async function login(email: string, password: string) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const msg = await res.json().catch(() => ({}));
    throw new Error(msg.error || 'No se pudo iniciar sesión');
  }
  return res.json();
}

export async function fetchProjects(token: string) {
  const res = await fetch(`${API_URL}/projects`, {
    headers: authHeader(token),
  });
  if (!res.ok) throw new Error('No se pudieron obtener proyectos');
  const data = await res.json();
  return (data as any[]).map(mapProject);
}

export async function fetchDocuments(token: string, projectId?: string): Promise<Document[]> {
  const url = new URL(`${API_URL}/documents`);
  if (projectId) url.searchParams.set('projectId', projectId);
  const res = await fetch(url.toString(), { headers: authHeader(token) });
  if (!res.ok) throw new Error('No se pudieron obtener documentos');
  const data = await res.json();
  return (data as any[]).map(mapDocument);
}

export async function createDocument(token: string, payload: {
  projectId: string;
  type: string;
  series: string;
  title: string;
  content?: string;
  metadata?: Record<string, any>;
  retentionDate?: string;
  isPhysicalOriginal?: boolean;
  physicalLocationId?: string;
}) {
  const res = await fetch(`${API_URL}/documents/create`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const msg = await res.json().catch(() => ({}));
    throw new Error(msg.error || 'No se pudo crear el documento');
  }
  return res.json();
}

export async function createInboundDocument(token: string, payload: {
  projectId: string;
  series: string;
  title: string;
  metadata?: Record<string, any>;
  requiresResponse?: boolean;
  deadline?: string;
  receptionMedium?: string;
}) {
  const res = await fetch(`${API_URL}/documents/inbound`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const msg = await res.json().catch(() => ({}));
    throw new Error(msg.error || 'No se pudo registrar la entrada');
  }
  return mapDocument(await res.json());
}

export async function radicarDocument(token: string, id: string, signatureMethod: SignatureMethod) {
  const res = await fetch(`${API_URL}/documents/${id}/radicar`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify({ signatureMethod }),
  });
  if (!res.ok) {
    const msg = await res.json().catch(() => ({}));
    throw new Error(msg.error || 'No se pudo radicar el documento');
  }
  return mapDocument(await res.json());
}

export async function uploadAttachment(token: string, docId: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_URL}/documents/${docId}/attachments`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    const msg = await res.json().catch(() => ({}));
    throw new Error(msg.error || 'No se pudo subir el archivo');
  }
  return res.json();
}
