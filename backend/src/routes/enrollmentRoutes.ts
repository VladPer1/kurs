import { Router } from 'express';
import { EnrollmentController } from '../controllers/enrollmentController.js';
import { authenticate } from '../middleware/authJwt.js';
import { hasPermission } from '../middleware/roleGuard.js';

const router = Router();

router.post('/', authenticate, hasPermission('enrollments:create'), EnrollmentController.create);
router.get('/my', authenticate, hasPermission('enrollments:view_my'), EnrollmentController.getMy);
router.get('/instructor', authenticate, hasPermission('enrollments:view_instructor'), EnrollmentController.getForInstructor);
router.delete('/:id', authenticate, hasPermission('enrollments:cancel'), EnrollmentController.cancel);

export default router;
