"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const allowedMime = ['application/pdf', 'message/rfc822', 'application/octet-stream'];
const allowedExt = ['.pdf', '.eml', '.msg'];
// Memory storage so we can forward buffer to OCR or storage service
const storage = multer_1.default.memoryStorage();
const fileFilter = (req, file, cb) => {
    const ext = path_1.default.extname(file.originalname).toLowerCase();
    if (!allowedMime.includes(file.mimetype) && !allowedExt.includes(ext)) {
        return cb(new Error('Invalid file type. Only PDF, EML, MSG allowed'));
    }
    cb(null, true);
};
exports.upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: MAX_SIZE_BYTES },
    fileFilter
});
