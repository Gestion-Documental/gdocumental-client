import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { IFileStorage, StoredFile } from './IFileStorage';

const bucket = process.env.STORAGE_BUCKET;
const region = process.env.AWS_REGION;

const s3 = new S3Client({
  region,
  credentials: process.env.AWS_ACCESS_KEY_ID
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      }
    : undefined
});

export class S3FileStorage implements IFileStorage {
  async save(params: { buffer: Buffer; filename: string; contentType: string }): Promise<StoredFile> {
    if (!bucket) throw new Error('STORAGE_BUCKET is not configured');

    const key = `${Date.now()}-${params.filename.replace(/\s+/g, '_')}`;
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: params.buffer,
        ContentType: params.contentType
      })
    );

    return {
      key,
      url: `https://${bucket}.s3.${region}.amazonaws.com/${key}`,
      size: params.buffer.length,
      contentType: params.contentType
    };
  }

  async delete(key: string): Promise<void> {
    if (!bucket) throw new Error('STORAGE_BUCKET is not configured');
    await s3.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key
      })
    );
  }

  async getUrl(key: string): Promise<string> {
    if (!bucket || !region) throw new Error('STORAGE_BUCKET or AWS_REGION is not configured');
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  }
}
