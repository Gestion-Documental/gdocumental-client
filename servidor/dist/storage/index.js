"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStorage = getStorage;
exports.getStorageDriver = getStorageDriver;
const local_storage_1 = require("./local.storage");
const s3_storage_1 = require("./s3.storage");
function getStorage() {
    const driver = process.env.STORAGE_DRIVER || 'local';
    if (driver === 's3') {
        return new s3_storage_1.S3FileStorage();
    }
    return new local_storage_1.LocalFileStorage();
}
function getStorageDriver() {
    const driver = (process.env.STORAGE_DRIVER || 'local').toLowerCase();
    return driver === 's3' ? 's3' : 'local';
}
