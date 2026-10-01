import { Router } from 'express';
import { SystemController } from '../controllers/systemController.js';

const router = Router();

router.get('/health', SystemController.health);
router.get('/metrics', SystemController.metrics);

export default router;
