import fs from 'fs';
import path from 'path';
import { IFileStorage, StoredFile } from './IFileStorage';

const BASE_DIR = process.env.LOCAL_STORAGE_PATH || path.join(process.cwd(), 'uploads');

export class LocalFileStorage implements IFileStorage {
  async save(params: { buffer: Buffer; filename: string; contentType: string }): Promise<StoredFile> {
    const dir = BASE_DIR;
    await fs.promises.mkdir(dir, { recursive: true });

    const safeName = `${Date.now()}-${params.filename.replace(/\s+/g, '_')}`;
    const filePath = path.join(dir, safeName);
    await fs.promises.writeFile(filePath, params.buffer);

    return {
      key: safeName,
      url: filePath,
      size: params.buffer.length,
      contentType: params.contentType
    };
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(BASE_DIR, key);
    try {
      await fs.promises.unlink(filePath);
    } catch (err) {
      // ignore if not found
    }
  }

  async getUrl(key: string): Promise<string> {
    return path.join(BASE_DIR, key);
  }
}
