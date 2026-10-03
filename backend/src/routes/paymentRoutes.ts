import { Router } from 'express';
import { PaymentController } from '../controllers/paymentController.js';
import { authenticate } from '../middleware/authJwt.js';
import { hasPermission } from '../middleware/roleGuard.js';

const router = Router();

router.get('/', authenticate, hasPermission('payments:view_all'), PaymentController.getAllPayments);
router.post('/checkout', authenticate, hasPermission('payments:create'), PaymentController.checkout);
router.get('/my', authenticate, hasPermission('payments:view_my'), PaymentController.getMyPayments);

export default router;
