import { Router, Response } from 'express';
import { authenticateUser, type AuthenticatedRequest } from '../middleware/index';
import { CreationService } from '../services/index';
import { ApiException, asyncHandler } from '../middleware/index';
import { CreationData } from '../types/index';

const router = Router();
const creationService = new CreationService();

/**
 * Get user's creations
 * GET /api/creations
 */
router.get(
  '/',
  authenticateUser,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const creations = await creationService.getUserCreations(req.userId!);
    res.json({ creations });
  })
);

/**
 * Get all public creations (no authentication required)
 * GET /api/creations/public
 * Query params: page, limit
 * IMPORTANT: This must come before /public/:id route
 */
router.get(
  '/public',
  asyncHandler(async (req, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const result = await creationService.getPublicCreations(page, limit);
    
    res.json(result);
  })
);

/**
 * Get a public creation by ID (no authentication required)
 * GET /api/creations/public/:id
 */
router.get(
  '/public/:id',
  asyncHandler(async (req, res: Response) => {
    const creationId = req.params.id;
    
    if (!creationId) {
      throw new ApiException('Missing creation ID', 400);
    }
    
    const creation = await creationService.getPublicCreationById(creationId);
    
    if (!creation) {
      throw new ApiException('Creation not found or not public', 404);
    }
    
    res.json({ creation });
  })
);

/**
 * Get a single creation by ID
 * GET /api/creations/:id
 */
router.get(
  '/:id',
  authenticateUser,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const creationId = req.params.id;
    
    if (!creationId) {
      throw new ApiException('Missing creation ID', 400);
    }
    
    const creation = await creationService.getCreationById(creationId, req.userId!);
    
    if (!creation) {
      throw new ApiException('Creation not found', 404);
    }
    
    res.json({ creation });
  })
);

/**
 * Create or update a creation
 * POST /api/creations
 * Body: { creationData, creationId? }
 */
router.post(
  '/',
  authenticateUser,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { creationData, creationId } = req.body;

    if (!creationData) {
      throw new ApiException('Missing required fields', 400);
    }

    let creation;

    if (creationId) {
      // Update existing creation
      creation = await creationService.updateCreation(
        creationId,
        req.userId!,
        creationData
      );
    } else {
      // Create new creation
      creation = await creationService.createCreation(req.userId!, creationData);
    }

    res.json({ creation });
  })
);

/**
 * Delete a creation
 * DELETE /api/creations/:id
 */
router.delete(
  '/:id',
  authenticateUser,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const creationId = req.params.id;

    if (!creationId) {
      throw new ApiException('Missing creation ID', 400);
    }

    await creationService.deleteCreation(creationId, req.userId!);

    res.json({ success: true });
  })
);

export default router;

