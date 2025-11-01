import { Router, Request, Response } from 'express';
import { BricksService } from '../services';

const router = Router();

/**
 * GET /api/bricks
 * Get all bricks with their color variants
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const bricks = await BricksService.getAllBricks();
    res.json({
      success: true,
      data: bricks,
      meta: {
        total_bricks: bricks.length,
        total_colors: bricks.reduce((sum, brick) => sum + brick.num_colors, 0)
      }
    });
  } catch (error) {
    console.error('Error fetching bricks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bricks data'
    });
  }
});

/**
 * GET /api/bricks/:elementId
 * Get a specific brick by element ID
 */
router.get('/:elementId', async (req: Request, res: Response) => {
  try {
    const { elementId } = req.params;
    const brick = await BricksService.getBrickByElementId(elementId);
    
    if (!brick) {
      return res.status(404).json({
        success: false,
        error: 'Brick not found'
      });
    }

    res.json({
      success: true,
      data: brick
    });
  } catch (error) {
    console.error('Error fetching brick:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch brick data'
    });
  }
});

/**
 * GET /api/bricks/colors/all
 * Get all unique colors across all bricks
 */
router.get('/colors/all', async (req: Request, res: Response) => {
  try {
    const colors = await BricksService.getAllColors();
    res.json({
      success: true,
      data: colors,
      meta: {
        total_colors: colors.length
      }
    });
  } catch (error) {
    console.error('Error fetching colors:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch colors data'
    });
  }
});

/**
 * GET /api/bricks/colors/search?q=red
 * Search colors by name
 */
router.get('/colors/search', async (req: Request, res: Response) => {
  try {
    const searchTerm = req.query.q as string;
    
    if (!searchTerm) {
      return res.status(400).json({
        success: false,
        error: 'Search term is required (use ?q=searchTerm)'
      });
    }

    const colors = await BricksService.searchColorsByName(searchTerm);
    res.json({
      success: true,
      data: colors,
      meta: {
        search_term: searchTerm,
        results_count: colors.length
      }
    });
  } catch (error) {
    console.error('Error searching colors:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search colors'
    });
  }
});

/**
 * GET /api/bricks/type/:brickType
 * Get brick by type name (e.g., "BRICK 2X4")
 */
router.get('/type/:brickType', async (req: Request, res: Response) => {
  try {
    const brickType = decodeURIComponent(req.params.brickType);
    const brick = await BricksService.getBrickByType(brickType);
    
    if (!brick) {
      return res.status(404).json({
        success: false,
        error: 'Brick type not found'
      });
    }

    res.json({
      success: true,
      data: brick
    });
  } catch (error) {
    console.error('Error fetching brick by type:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch brick data'
    });
  }
});

export default router;

