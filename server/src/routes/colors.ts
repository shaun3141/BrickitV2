import { Router, Request, Response } from 'express';
import { BricksService } from '../services';

const router = Router();

/**
 * GET /api/colors/palette?type=brick|plate
 * Get the universal color palette for bricks or plates
 * @param type - Optional query parameter: 'brick' or 'plate' (defaults to 'brick')
 */
router.get('/palette', async (req: Request, res: Response) => {
  try {
    const typeParam = (req.query.type as string)?.toLowerCase();
    const brickType: 'BRICK' | 'PLATE' = typeParam === 'plate' ? 'PLATE' : 'BRICK';
    
    const colors = await BricksService.getUniversalPalette(brickType);
    res.json({
      success: true,
      data: colors,
      meta: {
        total_colors: colors.length,
        type: brickType.toLowerCase(),
        description: `Colors available for ${brickType.toLowerCase()}s`
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

