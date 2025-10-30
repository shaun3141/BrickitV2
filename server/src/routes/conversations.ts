import { Router } from 'express';
import path from 'path';
import fs from 'fs/promises';

const router = Router();

/**
 * GET /api/conversations/brickit
 * Returns the BrickitV2 conversation history with AI costs and usage
 */
router.get('/brickit', async (req, res, next) => {
  try {
    // Path to the public conversations file
    const conversationsPath = path.join(__dirname, '../../public/brickit_conversations_public.json');
    
    // Check if file exists
    try {
      await fs.access(conversationsPath);
    } catch {
      return res.status(404).json({
        error: 'Conversations data not available',
        message: 'Run the conversation export notebook to generate the data'
      });
    }

    // Read and parse the file
    const data = await fs.readFile(conversationsPath, 'utf-8');
    const conversations = JSON.parse(data);

    // Set cache headers (no cache for now to see updates immediately)
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    res.json(conversations);
  } catch (error) {
    next(error);
  }
});

export default router;

