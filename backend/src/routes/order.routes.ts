import { Router } from 'express';
import {
  getOrder,
  updateOrderStatus,
  getMyOrders,
} from '../controllers/order.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Order processing
 */

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Get my orders (as buyer)
 *     tags: [Orders]
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
router.get('/', getMyOrders);

/**
 * @swagger
 * /api/orders/{orderId}:
 *   get:
 *     summary: Get order details
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Order details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 */
router.get('/:orderId', getOrder);

/**
 * @swagger
 * /api/orders/{orderId}:
 *   put:
 *     summary: Update order status (Seller/Admin)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *               shippingAddress:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order updated
 */
router.put('/:orderId', updateOrderStatus);

export default router;

