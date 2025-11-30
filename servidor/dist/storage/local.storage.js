"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalFileStorage = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const BASE_DIR = process.env.LOCAL_STORAGE_PATH || path_1.default.join(process.cwd(), 'uploads');
class LocalFileStorage {
    async save(params) {
        const dir = BASE_DIR;
        await fs_1.default.promises.mkdir(dir, { recursive: true });
        const safeName = `${Date.now()}-${params.filename.replace(/\s+/g, '_')}`;
        const filePath = path_1.default.join(dir, safeName);
        await fs_1.default.promises.writeFile(filePath, params.buffer);
        return {
            key: safeName,
            url: filePath,
            size: params.buffer.length,
            contentType: params.contentType
        };
    }
    async delete(key) {
        const filePath = path_1.default.join(BASE_DIR, key);
        try {
            await fs_1.default.promises.unlink(filePath);
        }
        catch (err) {
            // ignore if not found
        }
    }
    async getUrl(key) {
        return path_1.default.join(BASE_DIR, key);
    }
}
exports.LocalFileStorage = LocalFileStorage;
