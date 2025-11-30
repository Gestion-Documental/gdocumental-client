import multer from 'multer';
import path from 'path';
import { Request } from 'express';

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const allowedMime = ['application/pdf', 'message/rfc822', 'application/octet-stream'];
const allowedExt = ['.pdf', '.eml', '.msg'];

// Memory storage so we can forward buffer to OCR or storage service
const storage = multer.memoryStorage();

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedMime.includes(file.mimetype) && !allowedExt.includes(ext)) {
    return cb(new Error('Invalid file type. Only PDF, EML, MSG allowed'));
  }
  cb(null, true);
};

export const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter
});
