import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { validateRegister, validateLogin } from '../middleware/validator.js';
import { authLoginLimiter } from '../middleware/rateLimiter.js';
import { authenticate } from '../middleware/authJwt.js';

const router = Router();

router.post('/register', validateRegister, AuthController.register);
router.post('/login', authLoginLimiter, validateLogin, AuthController.login);
router.post('/refresh', AuthController.refresh);
router.post('/logout', authenticate, AuthController.logout);
router.get('/me', authenticate, AuthController.me);

export default router;
