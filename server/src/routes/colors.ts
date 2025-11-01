import { Router, Request, Response } from 'express';
import { BricksService } from '../services';

const router = Router();

/**
 * GET /api/colors/palette
 * Get the universal color palette (27 colors available as both bricks and plates)
 */
router.get('/palette', async (req: Request, res: Response) => {
  try {
    const colors = await BricksService.getUniversalPalette();
    res.json({
      success: true,
      data: colors,
      meta: {
        total_colors: colors.length,
        description: 'Universal colors available as both bricks and plates'
      }
    });
  } catch (error) {
    console.error('Error fetching color palette:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch color palette'
    });
  }
});

export default router;

