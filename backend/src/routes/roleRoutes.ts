import { Router } from 'express';
import { RoleController } from '../controllers/roleController.js';
import { authenticate } from '../middleware/authJwt.js';
import { hasPermission } from '../middleware/roleGuard.js';

const router = Router();

router.get('/roles', authenticate, hasPermission('roles:manage'), RoleController.getAllRoles);
router.post('/roles', authenticate, hasPermission('roles:manage'), RoleController.createRole);
router.put('/roles/:id', authenticate, hasPermission('roles:manage'), RoleController.updateRole);
router.delete('/roles/:id', authenticate, hasPermission('roles:manage'), RoleController.deleteRole);
router.get('/permissions', authenticate, hasPermission('permissions:view'), RoleController.getAllPermissions);
router.post('/roles/:id/permissions', authenticate, hasPermission('roles:manage'), RoleController.updateRolePermissions);
router.patch('/users/:id/role', authenticate, hasPermission('users:manage_roles'), RoleController.assignUserRole);

export default router;
