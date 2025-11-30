import { LocalFileStorage } from './local.storage';
import { S3FileStorage } from './s3.storage';
import { IFileStorage } from './IFileStorage';

export function getStorage(): IFileStorage {
  const driver = process.env.STORAGE_DRIVER || 'local';
  if (driver === 's3') {
    return new S3FileStorage();
  }
  return new LocalFileStorage();
}

export function getStorageDriver(): 'local' | 's3' {
  const driver = (process.env.STORAGE_DRIVER || 'local').toLowerCase();
  return driver === 's3' ? 's3' : 'local';
}
