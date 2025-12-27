import { Router } from 'express';
import { createPaymentIntent } from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/create-payment-intent', authenticate, createPaymentIntent);

export default router;
