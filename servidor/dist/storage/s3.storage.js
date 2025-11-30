"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3FileStorage = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const bucket = process.env.STORAGE_BUCKET;
const region = process.env.AWS_REGION;
const s3 = new client_s3_1.S3Client({
    region,
    credentials: process.env.AWS_ACCESS_KEY_ID
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
        : undefined
});
class S3FileStorage {
    async save(params) {
        if (!bucket)
            throw new Error('STORAGE_BUCKET is not configured');
        const key = `${Date.now()}-${params.filename.replace(/\s+/g, '_')}`;
        await s3.send(new client_s3_1.PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: params.buffer,
            ContentType: params.contentType
        }));
        return {
            key,
            url: `https://${bucket}.s3.${region}.amazonaws.com/${key}`,
            size: params.buffer.length,
            contentType: params.contentType
        };
    }
    async delete(key) {
        if (!bucket)
            throw new Error('STORAGE_BUCKET is not configured');
        await s3.send(new client_s3_1.DeleteObjectCommand({
            Bucket: bucket,
            Key: key
        }));
    }
    async getUrl(key) {
        if (!bucket || !region)
            throw new Error('STORAGE_BUCKET or AWS_REGION is not configured');
        return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    }
}
exports.S3FileStorage = S3FileStorage;
