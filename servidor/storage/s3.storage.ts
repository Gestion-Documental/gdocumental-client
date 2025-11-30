import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { IFileStorage, StoredFile } from './IFileStorage';

const bucket = process.env.STORAGE_BUCKET;
const region = process.env.AWS_REGION;

let s3: S3Client | null = null;
const getClient = () => {
  if (!bucket || !region) {
    throw new Error('S3 storage not configured (STORAGE_BUCKET/AWS_REGION missing)');
  }
  if (!s3) {
    s3 = new S3Client({
      region,
      credentials: process.env.AWS_ACCESS_KEY_ID
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
          }
        : undefined
    });
  }
  return s3;
};

export class S3FileStorage implements IFileStorage {
  async save(params: { buffer: Buffer; filename: string; contentType: string }): Promise<StoredFile> {
    const client = getClient();

    const key = `${Date.now()}-${params.filename.replace(/\s+/g, '_')}`;
    await client.send(
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
    const client = getClient();
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key
      })
    );
  }

  async getUrl(key: string): Promise<string> {
    if (!bucket || !region) throw new Error('S3 storage not configured');
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  }
}
