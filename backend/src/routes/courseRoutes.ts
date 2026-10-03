import { Router } from 'express';
import { CourseController } from '../controllers/courseController.js';
import { authenticate } from '../middleware/authJwt.js';
import { hasPermission } from '../middleware/roleGuard.js';
import { validateCourseCreate } from '../middleware/validator.js';

const router = Router();

router.get('/', CourseController.getAll);
router.get('/:id', CourseController.getById);
router.get('/:id/students', authenticate, hasPermission('courses:view_students'), CourseController.getCourseStudents);
router.post('/', authenticate, hasPermission('courses:create'), validateCourseCreate, CourseController.create);
router.put('/:id', authenticate, hasPermission('courses:edit'), CourseController.update);
router.delete('/:id', authenticate, hasPermission('courses:delete'), CourseController.delete);

export default router;
