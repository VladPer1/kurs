import { Router } from 'express';
import { CardController } from '../controllers/cardController.js';
import { authenticate } from '../middleware/authJwt.js';
import { hasPermission } from '../middleware/roleGuard.js';
import { validateCardAdd } from '../middleware/validator.js';

const router = Router();

router.get('/', authenticate, hasPermission('cards:manage'), CardController.getAll);
router.post('/', authenticate, hasPermission('cards:manage'), validateCardAdd, CardController.addCard);
router.delete('/:id', authenticate, hasPermission('cards:manage'), CardController.deleteCard);

export default router;
