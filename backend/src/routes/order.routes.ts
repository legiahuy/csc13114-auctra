import { Router } from 'express';
import {
  getOrder,
  updateOrderStatus,
  getMyOrders,
} from '../controllers/order.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', getMyOrders);
router.get('/:orderId', getOrder);
router.put('/:orderId', updateOrderStatus);

export default router;

