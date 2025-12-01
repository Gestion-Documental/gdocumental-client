import { useState } from 'react';
import { Document } from '../types';
import { fetchDocuments, createInboundDocument, radicarDocument, createDocument, uploadAttachment, fetchDocument, deleteAttachment, updateDelivery, updateDocument, updateStatus } from '../../services/api';

export const useDocuments = (token: string | null, activeProjectId: string) => {
  const [documents, setDocuments] = useState<Document[]>([]);

  const getDocuments = async () => {
    if (!token || !activeProjectId) return;
    try {
      const docs = await fetchDocuments(token, activeProjectId);
      setDocuments(docs);
    } catch (error) {
      console.error(error);
    }
  };

  return { documents, getDocuments };
};
