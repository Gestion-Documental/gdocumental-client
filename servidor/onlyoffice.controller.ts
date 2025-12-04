import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from './auth.middleware';
import fetch from 'node-fetch';
import { getStorage } from './storage/index';

const prisma = new PrismaClient();
const router = Router();

// Callback from OnlyOffice Document Server
// This does NOT require AuthenticatedRequest because it comes from the Document Server
// In production, we should verify the token/signature in the body
router.post('/callback', async (req: any, res: Response) => {
  try {
    const { body } = req;
    const { status, url, key, users } = body;

    // status 2 = Ready for saving, 6 = Force save
    if (status === 2 || status === 6) {
      console.log(`[OnlyOffice] Received save request for key: ${key}, url: ${url}`);

      // The 'key' is usually "docId-timestamp" or just "docId". 
      // We need to parse the document ID from it.
      // Let's assume our key format is `${docId}-${timestamp}` or just `${docId}` if we are simple.
      // But wait, we need to know WHICH document this is.
      // We can pass the document ID in the key or query param. 
      // Let's assume the key starts with the document ID.
      
      // A robust way is to pass the docId in the 'key' config on the frontend:
      // key: `${doc.id}-${doc.updatedAt.getTime()}`
      
      const docId = key.split('-')[0]; 
      
      const doc = await prisma.document.findUnique({ where: { id: docId } });
      if (!doc) {
        console.error(`[OnlyOffice] Document not found: ${docId}`);
        return res.json({ error: 0 });
      }

      // Download the file from OnlyOffice
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to download file from ${url}`);
      
      const buffer = await response.buffer();
      
      // Save to our storage
      const storage = getStorage();
      const filename = `onlyoffice-${docId}-${Date.now()}.docx`;
      
      const stored = await storage.save({
        buffer: buffer,
        filename: filename,
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      // Update document
      await prisma.document.update({
        where: { id: docId },
        data: {
          contentUrl: stored.url,
          updatedAt: new Date(),
        },
      });
      
      console.log(`[OnlyOffice] Document ${docId} updated successfully.`);
    }

    // OnlyOffice expects { error: 0 } to acknowledge receipt
    return res.json({ error: 0 });

  } catch (error) {
    console.error('[OnlyOffice] Callback error:', error);
    // Even on error, we might want to return 0 to stop OnlyOffice from retrying indefinitely if it's a logic error
    // But for now let's return error
    return res.json({ error: 1 });
  }
});

export default router;
