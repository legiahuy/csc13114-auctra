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
} from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import { body } from 'express-validator';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/password', [
  body('oldPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 }),
], changePassword);

router.get('/watchlist', getWatchlist);
router.post('/watchlist', addToWatchlist);
router.delete('/watchlist/:productId', removeFromWatchlist);

router.get('/bids', getMyBids);
router.get('/won', getWonProducts);
router.get('/reviews', getReviews);

router.post('/questions', askQuestion);
router.put('/questions/:questionId/answer', answerQuestion);

router.post('/upgrade-request', requestSellerUpgrade);
router.post('/rate', rateUser);

export default router;

