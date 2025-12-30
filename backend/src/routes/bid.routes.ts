import { Router } from 'express';
import {
  placeBid,
  getBidHistory,
  rejectBid,
} from '../controllers/bid.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Bids
 *   description: Bidding operations
 */

/**
 * @swagger
 * /api/bids/history/{productId}:
 *   get:
 *     summary: Get bid history for a product
 *     tags: [Bids]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of bids
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Bid'
 */
router.get('/history/:productId', getBidHistory);

/**
 * @swagger
 * /api/bids:
 *   post:
 *     summary: Place a bid on a product
 *     tags: [Bids]
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
 *               - amount
 *             properties:
 *               productId:
 *                 type: integer
 *               amount:
 *                 type: number
 *     responses:
 *       201:
 *         description: Bid placed successfully
 *       400:
 *         description: Invalid bid amount or product not active
 */
router.post('/', authenticate, placeBid);

/**
 * @swagger
 * /api/bids/{bidId}/reject:
 *   put:
 *     summary: Reject a bid (Seller only)
 *     tags: [Bids]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bidId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Bid rejected
 */
router.put('/:bidId/reject', authenticate, rejectBid);

export default router;

