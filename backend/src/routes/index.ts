import { Router } from 'express';
import authRoutes from './authRoutes.js';
import roleRoutes from './roleRoutes.js';
import userRoutes from './userRoutes.js';
import instructorRoutes from './instructorRoutes.js';
import courseRoutes from './courseRoutes.js';
import enrollmentRoutes from './enrollmentRoutes.js';
import cardRoutes from './cardRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import systemRoutes from './systemRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/', roleRoutes); // /roles, /permissions, /users/:id/role
router.use('/instructors', instructorRoutes);
router.use('/courses', courseRoutes);
router.use('/enrollments', enrollmentRoutes);
router.use('/cards', cardRoutes);
router.use('/payments', paymentRoutes);
router.use('/system', systemRoutes);

export default router;
