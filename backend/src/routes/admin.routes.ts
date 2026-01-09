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
  resetUserPassword,
  testEmail,
  getAutoExtendSettings,
  updateAutoExtendSettings,
  getAutoExtendSettingsPublic,
} from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Public route for auto-extend settings (for sellers to see in form)
/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin dashboard and management
 */

/**
 * @swagger
 * /api/admin/settings/auto-extend/public:
 *   get:
 *     summary: Get auto-extend settings (Public)
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Auto-extend settings
 */
router.get('/settings/auto-extend/public', getAutoExtendSettingsPublic);

// All routes below require admin authentication
router.use(authenticate);
router.use(authorize('admin'));

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Get admin dashboard stats
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, week, month, year]
 *     responses:
 *       200:
 *         description: Dashboard statistics
 */
router.get('/dashboard', getDashboard);

/**
 * @swagger
 * /api/admin/upgrade-requests:
 *   get:
 *     summary: Get list of upgrade requests
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending upgrade requests
 */
router.get('/upgrade-requests', getUpgradeRequests);

/**
 * @swagger
 * /api/admin/upgrade-requests/{userId}/approve:
 *   put:
 *     summary: Approve user upgrade request
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Request approved
 */
router.put('/upgrade-requests/:userId/approve', approveUpgrade);

/**
 * @swagger
 * /api/admin/upgrade-requests/{userId}/reject:
 *   put:
 *     summary: Reject user upgrade request
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Request rejected
 */
router.put('/upgrade-requests/:userId/reject', rejectUpgrade);

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users (Admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of users
 */
router.get('/users', getAllUsers);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   get:
 *     summary: Get user by ID (Admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User details
 */
router.get('/users/:id', getUserById);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   put:
 *     summary: Update user (Admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated
 */
router.put('/users/:id', updateUser);

/**
 * @swagger
 * /api/admin/users/{id}/role:
 *   put:
 *     summary: Update user role (Admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [admin, seller, bidder]
 *     responses:
 *       200:
 *         description: Role updated
 */
router.put('/users/:id/role', updateUserRole);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   delete:
 *     summary: Delete user (Admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User deleted
 */
router.delete('/users/:id', deleteUser);

/**
 * @swagger
 * /api/admin/users/{id}/details:
 *   get:
 *     summary: Get full user details including stats (Admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Detailed user info
 */
router.get('/users/:id/details', getUserDetails);

/**
 * @swagger
 * /api/admin/users/{id}/reset-password:
 *   post:
 *     summary: Reset user password (Admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Password reset successfully
 */
router.post('/users/:id/reset-password', resetUserPassword);

/**
 * @swagger
 * /api/admin/products:
 *   get:
 *     summary: Get all products (Admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of products
 */
router.get('/products', getAllProducts);

router.post('/test-email', testEmail);

/**
 * @swagger
 * /api/admin/settings/auto-extend:
 *   get:
 *     summary: Get auto-extend settings
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Settings
 */
router.get('/settings/auto-extend', getAutoExtendSettings);

/**
 * @swagger
 * /api/admin/settings/auto-extend:
 *   put:
 *     summary: Update auto-extend settings
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               thresholdMinutes:
 *                 type: integer
 *               durationMinutes:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Settings updated
 */
router.put('/settings/auto-extend', updateAutoExtendSettings);

/**
 * @swagger
 * /api/admin/charts/revenue:
 *   get:
 *     summary: Get revenue chart data
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Chart data
 */
router.get('/charts/revenue', getRevenueChart);

/**
 * @swagger
 * /api/admin/charts/auctions:
 *   get:
 *     summary: Get auctions chart data
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Chart data
 */
router.get('/charts/auctions', getAuctionsChart);

/**
 * @swagger
 * /api/admin/charts/user-distribution:
 *   get:
 *     summary: Get user distribution chart data
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Chart data
 */
router.get('/charts/user-distribution', getUserDistribution);

export default router;
