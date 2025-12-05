import { Document, DocumentStatus, DocumentType, SignatureMethod } from '../types';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const authHeader = (token: string) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

async function ensureAuth(res: Response) {
  if (res.status === 401 || res.status === 403) {
    const err = new Error('auth');
    (err as any).code = res.status;
    throw err;
  }
}

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
    contentUrl: doc.contentUrl, // Map contentUrl from backend
    requiresResponse: doc.metadata?.requiresResponse || false,
    deadline: doc.metadata?.deadline || undefined,
    isCompleted: doc.metadata?.isCompleted || false,
    receptionMedium: doc.metadata?.receptionMedium,
    physicalLocationId: doc.physicalLocationId || undefined,
    physicalLocation: doc.physicalLocation,
    author: doc.author || doc.metadata?.author || '',
    assignedToUser: doc.assignedToUser,
    signatureImage: (() => {
        const raw = doc.signatureImage || doc.metadata?.signatureImage;
        if (!raw) return undefined;
        return raw.startsWith('/uploads') ? `${API_URL}${raw}` : raw;
    })(),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt || undefined,
    attachments: (doc.attachments || []).map((a: any) => ({
      id: a.id,
      name: a.filename,
      url: a.url,
      size: a.size,
      type: a.filename?.toLowerCase().endsWith('.pdf') ? 'PDF' : 'OTHER',
    })),
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
  await ensureAuth(res as any);
  if (!res.ok) throw new Error('No se pudieron obtener proyectos');
  const data = await res.json();
  return (data as any[]).map(mapProject);
}

export async function fetchProjectTrd(token: string, projectId: string) {
  const res = await fetch(`${API_URL}/projects/${projectId}/trd`, {
    headers: authHeader(token),
  });
  await ensureAuth(res as any);
  if (!res.ok) throw new Error('No se pudo obtener TRD');
  return res.json();
}

export async function fetchMe(token: string) {
  const res = await fetch(`${API_URL}/users/me`, { headers: authHeader(token) });
  await ensureAuth(res as any);
  if (!res.ok) throw new Error('No se pudo obtener el perfil');
  return res.json();
}

export async function changePassword(token: string, currentPassword: string, newPassword: string) {
  const res = await fetch(`${API_URL}/users/me/password`, {
    method: 'PUT',
    headers: authHeader(token),
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  await ensureAuth(res as any);
  if (!res.ok) {
    const msg = await res.json().catch(() => ({}));
    throw new Error(msg.error || 'No se pudo cambiar la contraseña');
  }
  return res.json();
}

export async function fetchDocument(token: string, id: string) {
  const res = await fetch(`${API_URL}/documents/${id}`, { headers: authHeader(token) });
  await ensureAuth(res as any);
  if (!res.ok) throw new Error('No se pudo obtener el documento');
  return mapDocument(await res.json());
}

export async function fetchDocuments(token: string, projectId?: string): Promise<Document[]> {
  const url = new URL(`${API_URL}/documents`);
  if (projectId) url.searchParams.set('projectId', projectId);
  const res = await fetch(url.toString(), { headers: authHeader(token) });
  await ensureAuth(res as any);
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
  await ensureAuth(res as any);
  if (!res.ok) {
    const msg = await res.json().catch(() => ({}));
    throw new Error(msg.error || 'No se pudo crear el documento');
  }
  return res.json();
}

export async function updateDocument(token: string, id: string, payload: any) {
  const res = await fetch(`${API_URL}/documents/${id}`, {
    method: 'PUT',
    headers: authHeader(token),
    body: JSON.stringify(payload),
  });
  await ensureAuth(res as any);
  if (!res.ok) {
    const msg = await res.json().catch(() => ({}));
    throw new Error(msg.error || 'No se pudo actualizar el documento');
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
  replyToId?: string | null;
  replyToRadicado?: string;
  file?: File | null;
}) {
  const formData = new FormData();
  formData.append('projectId', payload.projectId);
  formData.append('series', payload.series);
  formData.append('title', payload.title);
  if (payload.metadata) formData.append('metadata', JSON.stringify(payload.metadata));
  if (payload.requiresResponse) formData.append('requiresResponse', 'true');
  if (payload.deadline) formData.append('deadline', payload.deadline);
  if (payload.receptionMedium) formData.append('receptionMedium', payload.receptionMedium);
  if (payload.replyToId) formData.append('replyToId', payload.replyToId);
  if (payload.replyToRadicado) formData.append('replyToRadicado', payload.replyToRadicado);
  if (payload.file) formData.append('file', payload.file);

  const res = await fetch(`${API_URL}/documents/inbound`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      // Do not set Content-Type, let browser set it with boundary
    },
    body: formData,
  });
  await ensureAuth(res as any);
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
  await ensureAuth(res as any);
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
  await ensureAuth(res as any);
  if (!res.ok) {
    const msg = await res.json().catch(() => ({}));
    throw new Error(msg.error || 'No se pudo subir el archivo');
  }
  return res.json();
}

export async function listAttachments(token: string, docId: string) {
  const res = await fetch(`${API_URL}/documents/${docId}/attachments`, {
    headers: authHeader(token),
  });
  await ensureAuth(res as any);
  if (!res.ok) throw new Error('No se pudieron obtener adjuntos');
  return res.json();
}

export async function deleteAttachment(token: string, docId: string, attachmentId: string) {
  const res = await fetch(`${API_URL}/documents/${docId}/attachments/${attachmentId}`, {
    method: 'DELETE',
    headers: authHeader(token),
  });
  await ensureAuth(res as any);
  if (!res.ok) throw new Error('No se pudo eliminar el adjunto');
  return res.json();
}

export async function updateStatus(token: string, id: string, status: string) {
  const res = await fetch(`${API_URL}/documents/${id}/status`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify({ status }),
  });
  await ensureAuth(res as any);
  if (!res.ok) {
    const msg = await res.json().catch(() => ({}));
    throw new Error(msg.error || 'No se pudo actualizar el estado');
  }
  return res.json();
}

export async function updateDelivery(token: string, id: string, payload: { receivedBy: string; receivedAt: string; file: File }) {
  const formData = new FormData();
  formData.append('receivedBy', payload.receivedBy);
  formData.append('receivedAt', payload.receivedAt);
  formData.append('file', payload.file);

  const res = await fetch(`${API_URL}/documents/${id}/delivery`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }, // No Content-Type for FormData
    body: formData,
  });
  await ensureAuth(res as any);
  if (!res.ok) {
    const msg = await res.json().catch(() => ({}));
    throw new Error(msg.error || 'No se pudo registrar la entrega');
  }
  return res.json();
}

// Descargar etiqueta PDF de un documento radicado
export async function downloadLabel(token: string, id: string) {
  const res = await fetch(`${API_URL}/documents/${id}/label`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  await ensureAuth(res as any);
  if (!res.ok) throw new Error('No se pudo generar la etiqueta');
  const blob = await res.blob();
  return blob;
}

// Previsualizar PDF con firma
export async function previewDocument(token: string, id: string) {
  const res = await fetch(`${API_URL}/documents/${id}/preview`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  await ensureAuth(res as any);
  if (!res.ok) {
      const msg = await res.json().catch(() => ({}));
      throw new Error(msg.error || 'No se pudo generar la vista previa');
  }
  const blob = await res.blob();
  return blob;
}

export async function uploadSignature(token: string, file?: File, pin?: string, currentPin?: string) {
  const formData = new FormData();
  if (file) formData.append('file', file);
  if (pin) formData.append('pin', pin);
  if (currentPin) formData.append('currentPin', currentPin);
  const res = await fetch(`${API_URL}/users/me/signature`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  await ensureAuth(res as any);
  if (!res.ok) {
    const msg = await res.json().catch(() => ({}));
    throw new Error(msg.error || 'No se pudo actualizar la firma');
  }
  return res.json();
}

export async function refreshAccessToken(refreshToken: string) {
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    const msg = await res.json().catch(() => ({}));
    const err = new Error(msg.error || 'No se pudo refrescar sesión');
    (err as any).code = res.status;
    throw err;
  }
  return res.json();
}
export async function assignDocument(token: string, docId: string, userId: string | null) {
  const res = await fetch(`${API_URL}/documents/${docId}/assign`, {
    method: 'PUT',
    headers: authHeader(token),
    body: JSON.stringify({ userId }),
  });
  await ensureAuth(res);
  return res.json();
}

export async function fetchUsers(token: string) {
  const res = await fetch(`${API_URL}/users`, {
    headers: authHeader(token),
  });
  await ensureAuth(res);
  return res.json();
}


