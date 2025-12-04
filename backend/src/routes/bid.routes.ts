import { Router } from 'express';
import {
  placeBid,
  getBidHistory,
  rejectBid,
} from '../controllers/bid.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.get('/history/:productId', getBidHistory);

// Authenticated routes
router.post('/', authenticate, placeBid);
router.put('/:bidId/reject', authenticate, rejectBid);

export default router;

