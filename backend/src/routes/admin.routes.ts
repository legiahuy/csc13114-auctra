import { Router } from 'express';
import {
  getDashboard,
  getUpgradeRequests,
  approveUpgrade,
  rejectUpgrade,
  getAllUsers,
  getUserById,
  updateUser,
  updateUserRole,
  deleteUser,
  getAllProducts,
  getRevenueChart,
  getAuctionsChart,
  getUserDistribution,
  getUserDetails,
  testEmail,
  getAutoExtendSettings,
  updateAutoExtendSettings,
  getAutoExtendSettingsPublic,
} from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Public route for auto-extend settings (for sellers to see in form)
router.get('/settings/auto-extend/public', getAutoExtendSettingsPublic);

// All routes below require admin authentication
router.use(authenticate);
router.use(authorize('admin'));

router.get('/dashboard', getDashboard);
router.get('/upgrade-requests', getUpgradeRequests);
router.put('/upgrade-requests/:userId/approve', approveUpgrade);
router.put('/upgrade-requests/:userId/reject', rejectUpgrade);

router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);
router.put('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteUser);

// User details (admin)
router.get('/users/:id/details', getUserDetails);

router.get('/products', getAllProducts);
router.post('/test-email', testEmail);

// Auto-extend settings (admin)
router.get('/settings/auto-extend', getAutoExtendSettings);
router.put('/settings/auto-extend', updateAutoExtendSettings);

// Chart endpoints (admin)
router.get('/charts/revenue', getRevenueChart);
router.get('/charts/auctions', getAuctionsChart);
router.get('/charts/user-distribution', getUserDistribution);

export default router;
