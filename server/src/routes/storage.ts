import { Router, Request, Response } from 'express';
import multer from 'multer';
import { authenticateUser, type AuthenticatedRequest } from '../middleware/index';
import { StorageService } from '../services/index';
import { ApiException, asyncHandler } from '../middleware/index';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });
const storageService = new StorageService();

/**
 * Upload file to Supabase Storage
 * POST /api/storage/upload
 * Body: multipart/form-data with 'file' field
 * Query: path (required), upsert (optional)
 */
router.post(
  '/upload',
  authenticateUser,
  upload.single('file'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.file) {
      throw new ApiException('No file provided', 400);
    }

    const { path: filePath, upsert } = req.body;

    if (!filePath) {
      throw new ApiException('No file path provided', 400);
    }

    const publicUrl = await storageService.uploadFile(
      req.userId!,
      filePath,
      req.file.buffer,
      req.file.mimetype,
      upsert === 'true'
    );

    res.json({ url: publicUrl });
  })
);

export default router;

