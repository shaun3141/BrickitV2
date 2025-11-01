import { Router } from 'express';
import healthRouter from './health';
import storageRouter from './storage';
import creationsRouter from './creations';
import donationsRouter from './donations';
import conversationsRouter from './conversations';
import bricksRouter from './bricks';
import colorsRouter from './colors';

const router = Router();

// Mount route handlers
router.use('/health', healthRouter);
router.use('/api/storage', storageRouter);
router.use('/api/creations', creationsRouter);
router.use('/api', donationsRouter);
router.use('/api/conversations', conversationsRouter);
router.use('/api/bricks', bricksRouter);
router.use('/api/colors', colorsRouter);

export default router;

