import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

// Private directory for storing verification documents (NOT served as static files)
export const VERIFICATION_UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'verifications', 'private');

// Ensure directory exists
if (!fs.existsSync(VERIFICATION_UPLOAD_DIR)) {
  fs.mkdirSync(VERIFICATION_UPLOAD_DIR, { recursive: true });
}

// Storage engine - user-provided filenames are completely discarded for random cryptographically secure names
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, VERIFICATION_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const rawExt = path.extname(file.originalname).toLowerCase();
    const ext = ['.jpg', '.jpeg', '.png', '.webp'].includes(rawExt) ? rawExt : '.jpg';
    const uniqueName = `${Date.now()}_${crypto.randomBytes(16).toString('hex')}${ext}`;
    cb(null, uniqueName);
  }
});

// Allowed MIME types and extensions
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

export const verificationUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // Strict 5 MB cap per file
    files: 2
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(file.mimetype) || !ALLOWED_EXTENSIONS.has(ext)) {
      return cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
    }
    cb(null, true);
  }
});

const uploadFields = verificationUpload.fields([
  { name: 'document', maxCount: 1 },
  { name: 'selfie', maxCount: 1 }
]);

/**
 * Middleware wrapper for verification upload to intercept Multer errors cleanly.
 * Returns structured 400 Bad Request instead of unhandled 500 errors.
 */
export const handleVerificationUpload = (req: Request, res: Response, next: NextFunction): void => {
  uploadFields(req, res, (err: any) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          res.status(400).json({
            success: false,
            message: 'File size exceeds 5MB limit. Please upload a smaller image.'
          });
          return;
        }
        res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
        return;
      }
      res.status(400).json({ success: false, message: err.message || 'Invalid upload request.' });
      return;
    }
    next();
  });
};

/**
 * Validates actual binary file signatures (magic bytes).
 * Ensures an executable, SVG, HTML, or arbitrary binary renamed as .jpg is rejected.
 */
export function verifyImageMagicBytes(filePath: string): boolean {
  if (!fs.existsSync(filePath)) return false;

  try {
    const buffer = Buffer.alloc(12);
    const fd = fs.openSync(filePath, 'r');
    const bytesRead = fs.readSync(fd, buffer, 0, 12, 0);
    fs.closeSync(fd);

    if (bytesRead < 4) return false;

    // JPEG: FF D8 FF
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      return true;
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      bytesRead >= 8 &&
      buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
      buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A
    ) {
      return true;
    }

    // WebP: RIFF (bytes 0-3) and WEBP (bytes 8-11)
    if (
      bytesRead >= 12 &&
      buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
    ) {
      return true;
    }

    return false;
  } catch (err) {
    console.error(`Error verifying magic bytes for ${filePath}:`, err);
    return false;
  }
}

/**
 * Safely deletes a file from the verification upload directory if it exists.
 * Strictly prevents path traversal attacks.
 */
export const deleteVerificationFile = (filename: string | null | undefined): boolean => {
  if (!filename) return false;
  try {
    const safeFilename = path.basename(filename);
    const filePath = path.join(VERIFICATION_UPLOAD_DIR, safeFilename);

    // Ensure the target file is strictly inside VERIFICATION_UPLOAD_DIR
    const resolvedPath = path.resolve(filePath);
    const resolvedDir = path.resolve(VERIFICATION_UPLOAD_DIR);
    if (!resolvedPath.startsWith(resolvedDir)) {
      console.error(`Path traversal detected in deleteVerificationFile: ${filename}`);
      return false;
    }

    if (fs.existsSync(resolvedPath)) {
      fs.unlinkSync(resolvedPath);
      return true;
    }
    return false;
  } catch (err) {
    console.error(`Failed to delete verification file ${filename}:`, err);
    return false;
  }
};
