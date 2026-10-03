import { Router } from 'express';
import { InstructorController } from '../controllers/instructorController.js';
import { authenticate } from '../middleware/authJwt.js';
import { hasPermission } from '../middleware/roleGuard.js';

const router = Router();

router.get('/', InstructorController.getAll);
router.get('/my/students', authenticate, hasPermission('instructors:view_students'), InstructorController.getMyStudents);
router.get('/students', authenticate, hasPermission('instructors:view_students'), InstructorController.getMyStudents);
router.get('/:id', InstructorController.getById);
router.post('/', authenticate, hasPermission('instructors:manage'), InstructorController.create);
router.put('/:id', authenticate, hasPermission('instructors:manage'), InstructorController.update);

export default router;
