import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  changePassword,
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  getMyBids,
  getWonProducts,
  getReviews,
  askQuestion,
  answerQuestion,
  requestSellerUpgrade,
  rateUser,
  getPublicProfile,
} from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import { body } from 'express-validator';

const router = Router();

/**
 * @swagger
 * /api/users/{id}/public:
 *   get:
 *     summary: Get public user profile
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Public user profile
 */
router.get('/:id/public', getPublicProfile);

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management and profile
 */

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
router.get('/profile', getProfile);




/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               address:
 *                 type: string
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.put('/profile', updateProfile);

/**
 * @swagger
 * /api/users/password:
 *   put:
 *     summary: Change user password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oldPassword
 *               - newPassword
 *             properties:
 *               oldPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Validation error or Incorrect old password
 */
router.put('/password', [
  body('oldPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 }),
], changePassword);

/**
 * @swagger
 * /api/users/watchlist:
 *   get:
 *     summary: Get user watchlist
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of watched products
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   product:
 *                     $ref: '#/components/schemas/Product'
 */
router.get('/watchlist', getWatchlist);

/**
 * @swagger
 * /api/users/watchlist:
 *   post:
 *     summary: Add product to watchlist
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *             properties:
 *               productId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Added to watchlist
 *       400:
 *         description: Invalid Product ID or already in watchlist
 */
router.post('/watchlist', addToWatchlist);

/**
 * @swagger
 * /api/users/watchlist/{productId}:
 *   delete:
 *     summary: Remove product from watchlist
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         schema:
 *           type: integer
 *         required: true
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Removed from watchlist
 */
router.delete('/watchlist/:productId', removeFromWatchlist);

/**
 * @swagger
 * /api/users/bids:
 *   get:
 *     summary: Get user's bid history
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of bids
 */
router.get('/bids', getMyBids);

/**
 * @swagger
 * /api/users/won:
 *   get:
 *     summary: Get list of won products (orders)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of orders
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Order'
 */
router.get('/won', getWonProducts);

/**
 * @swagger
 * /api/users/reviews:
 *   get:
 *     summary: Get reviews received by the user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of reviews
 */
router.get('/reviews', getReviews);

/**
 * @swagger
 * /api/users/questions:
 *   post:
 *     summary: Ask a question about a product
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - question
 *             properties:
 *               productId:
 *                 type: integer
 *               question:
 *                 type: string
 *     responses:
 *       201:
 *         description: Question posted
 */
router.post('/questions', askQuestion);

/**
 * @swagger
 * /api/users/questions/{questionId}/answer:
 *   put:
 *     summary: Answer a question (Seller only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: questionId
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
 *               - answer
 *             properties:
 *               answer:
 *                 type: string
 *     responses:
 *       200:
 *         description: Answer posted
 */
router.put('/questions/:questionId/answer', answerQuestion);

/**
 * @swagger
 * /api/users/upgrade-request:
 *   post:
 *     summary: Request upgrade to seller
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Upgrade request submitted
 */
router.post('/upgrade-request', requestSellerUpgrade);

/**
 * @swagger
 * /api/users/rate:
 *   post:
 *     summary: Rate another user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - targetUserId
 *               - rating
 *               - comment
 *             properties:
 *               targetUserId:
 *                 type: integer
 *               rating:
 *                 type: integer
 *                 enum: [1, -1]
 *               comment:
 *                 type: string
 *     responses:
 *       201:
 *         description: Rating submitted
 */
router.post('/rate', rateUser);

export default router;

