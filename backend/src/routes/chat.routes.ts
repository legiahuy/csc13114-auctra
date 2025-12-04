import { Router } from 'express';
import {
  getMessages,
  sendMessage,
} from '../controllers/chat.controller';
import { authenticate } from '../middleware/auth.middleware';
import { body } from 'express-validator';

const router = Router();

router.use(authenticate);

router.get('/:orderId', getMessages);
router.post('/:orderId', [
  body('message').trim().notEmpty(),
], sendMessage);

export default router;

