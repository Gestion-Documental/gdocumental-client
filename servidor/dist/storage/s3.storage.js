"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3FileStorage = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const bucket = process.env.STORAGE_BUCKET;
const region = process.env.AWS_REGION;
let s3 = null;
const getClient = () => {
    if (!bucket || !region) {
        throw new Error('S3 storage not configured (STORAGE_BUCKET/AWS_REGION missing)');
    }
    if (!s3) {
        s3 = new client_s3_1.S3Client({
            region,
            credentials: process.env.AWS_ACCESS_KEY_ID
                ? {
                    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
                }
                : undefined
        });
    }
    return s3;
};
class S3FileStorage {
    async save(params) {
        const client = getClient();
        const key = `${Date.now()}-${params.filename.replace(/\s+/g, '_')}`;
        await client.send(new client_s3_1.PutObjectCommand({
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
        const client = getClient();
        await client.send(new client_s3_1.DeleteObjectCommand({
            Bucket: bucket,
            Key: key
        }));
    }
    async getUrl(key) {
        if (!bucket || !region)
            throw new Error('S3 storage not configured');
        return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    }
}
exports.S3FileStorage = S3FileStorage;
