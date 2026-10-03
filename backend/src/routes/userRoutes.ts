import { Router } from 'express';
import { UserController } from '../controllers/userController.js';
import { RoleController } from '../controllers/roleController.js';
import { authenticate } from '../middleware/authJwt.js';
import { hasPermission } from '../middleware/roleGuard.js';

const router = Router();

// GET /api/v1/users - View all users with courses and roles (Admin only)
router.get('/', authenticate, hasPermission('users:view_all'), UserController.getAllUsers);

// GET /api/v1/users/:id - View single user details (Admin only)
router.get('/:id', authenticate, hasPermission('users:view_all'), UserController.getUserById);

// PATCH /api/v1/users/:id/role - Assign role to user
router.patch('/:id/role', authenticate, hasPermission('users:manage_roles'), RoleController.assignUserRole);

export default router;
