import { Router } from 'express';
import {
  getDashboard,
  getUpgradeRequests,
  approveUpgrade,
  rejectUpgrade,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getAllProducts,
} from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('admin'));

router.get('/dashboard', getDashboard);
router.get('/upgrade-requests', getUpgradeRequests);
router.put('/upgrade-requests/:userId/approve', approveUpgrade);
router.put('/upgrade-requests/:userId/reject', rejectUpgrade);

router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

router.get('/products', getAllProducts);

export default router;

