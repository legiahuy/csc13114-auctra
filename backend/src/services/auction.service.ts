import { processEndedAuctions } from '../controllers/order.controller';
import { logger } from '../config/logger';

// Process ended auctions every minute
export const startAuctionProcessor = () => {
  setInterval(async () => {
    try {
      await processEndedAuctions();
    } catch (error) {
      logger.error('Error processing ended auctions:', error);
    }
  }, 60 * 1000); // Every minute

  logger.info('Auction processor started');
};

