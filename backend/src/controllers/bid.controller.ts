import { Request, Response, NextFunction } from 'express';
import { Bid, Product, User, Settings } from '../models';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendBidNotificationEmail, sendBidRejectedEmail, sendSellerNewBidNotification } from '../utils/email.util';
import { Op } from 'sequelize';
import { sequelize } from '../config/database';

export const placeBid = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const { productId, amount, maxAmount, isAutoBid } = req.body;

    const product = await Product.findByPk(productId, {
      include: [{ model: User, as: 'seller' }],
    });

    if (!product) {
      return next(new AppError('Product not found', 404));
    }

    if (product.status !== 'active') {
      return next(new AppError('Product is not active', 400));
    }

    if (new Date() >= product.endDate) {
      return next(new AppError('Auction has ended', 400));
    }

    // Check bidder rating
    const bidder = await User.findByPk(req.user.id);
    if (!bidder) {
      return next(new AppError('User not found', 404));
    }

    // Seller can block bidders without any rating history
    if (!product.allowUnratedBidders && bidder.totalRatings === 0) {
      return next(new AppError('Seller does not allow unrated bidders for this product', 403));
    }

    const ratingPercentage = bidder.getRatingPercentage();
    if (bidder.totalRatings > 0 && ratingPercentage < 80) {
      return next(new AppError('Your rating is below 80%. You cannot place bids.', 403));
    }

    // Check if bidder is rejected
    const existingRejectedBid = await Bid.findOne({
      where: {
        productId,
        bidderId: req.user.id,
        isRejected: true,
      },
    });

    if (existingRejectedBid) {
      return next(new AppError('You have been rejected from bidding on this product', 403));
    }

    // --- AUTO-BID LOGIC START ---

    // 1. Identify Incoming Bid Parameters
    // If isAutoBid, the "Limit" is maxAmount. If manual, it's amount.
    const incomingBidLimit = parseFloat(isAutoBid ? maxAmount : amount);
    const bidStep = parseFloat(product.bidStep.toString());
    const currentPrice = parseFloat(product.currentPrice.toString());

    // 2. Validate Entry
    // The bid must be at least CurrentPrice + Step (unless it's the first bid)
    let minEntryAmount: number;
    if (product.bidCount === 0) {
      minEntryAmount = parseFloat(product.startingPrice.toString());
    } else {
      minEntryAmount = currentPrice + bidStep;
    }

    if (incomingBidLimit < minEntryAmount) {
      return next(
        new AppError(
          `Bid amount must be at least ${minEntryAmount.toLocaleString('vi-VN')} VNĐ`,
          400
        )
      );
    }

    // 3. Get Current Highest Bidder (The "Champion")
    // We start by looking for the current highest active bid.
    // Important: We need to respect the "First come, first served" rule for ties.
    // So we order by maxAmount DESC, then createdAt ASC.
    const activeHighestBid = await Bid.findOne({
      where: { productId, isRejected: false },
      order: [['maxAmount', 'DESC'], ['createdAt', 'ASC']],
      include: [{ model: User, as: 'bidder' }], 
    });

    let newPrice: number = 0;
    let isIncomingWinner: boolean = false;
    let championMax: number = 0;

    // Check auto-extend
    const now = new Date();
    const timeUntilEnd = product.endDate.getTime() - now.getTime();
    const [thresholdSetting, durationSetting] = await Promise.all([
      Settings.findOne({ where: { key: 'AUTO_EXTEND_THRESHOLD_MINUTES' } }),
      Settings.findOne({ where: { key: 'AUTO_EXTEND_DURATION_MINUTES' } }),
    ]);
    const thresholdMinutes = thresholdSetting ? parseInt(thresholdSetting.value) : parseInt(process.env.AUTO_EXTEND_THRESHOLD_MINUTES || '5');
    const extendMinutes = durationSetting ? parseInt(durationSetting.value) : parseInt(process.env.AUTO_EXTEND_DURATION_MINUTES || '10');

    if (product.autoExtend && timeUntilEnd <= thresholdMinutes * 60 * 1000) {
      product.endDate = new Date(now.getTime() + extendMinutes * 60 * 1000);
      await product.save();
    }

    // --- LOGIC EXECUTION ---

    if (!activeHighestBid) {
      // Scenario: No Bids Yet
      // Winner = Incoming
      // Price = Starting Price
      newPrice = parseFloat(product.startingPrice.toString());
      isIncomingWinner = true;
      
      // Create Bid
      await Bid.create({
        productId,
        bidderId: req.user.id,
        amount: newPrice,
        maxAmount: incomingBidLimit,
        isAutoBid: isAutoBid || false,
      });

    } else {
      // Scenario: Competing
      const champion = activeHighestBid;
      championMax = parseFloat(champion.maxAmount ? champion.maxAmount.toString() : champion.amount.toString());
      
      // Check if self-bidding (updating max)
      if (champion.bidderId === req.user.id) {
         // User is already the winner.
         // Let's simply add a new bid record to reflect the new state.
         
         newPrice = currentPrice;
         isIncomingWinner = true; // Still winner

         await Bid.create({
             productId,
             bidderId: req.user.id,
             amount: newPrice,
             maxAmount: incomingBidLimit,
             isAutoBid: isAutoBid || false
         });

      } else {
        // Different Bidder
        if (incomingBidLimit > championMax) {
            // Case 1: Incoming Wins (New Winner)
            // Price = min(IncomingLimit, ChampionMax + Step)
            newPrice = Math.min(incomingBidLimit, championMax + bidStep);
            isIncomingWinner = true;

            await Bid.create({
                productId,
                bidderId: req.user.id,
                amount: newPrice,
                maxAmount: incomingBidLimit,
                isAutoBid: isAutoBid || false
            });
        } else {
            // Case 2: Champion Defends (Incoming Loses)
            // Price = IncomingLimit
            // The champion defends by matching the incoming bid's limit.
            // No need to add step because the incoming bid is already maxed out.
            
            newPrice = incomingBidLimit;
            isIncomingWinner = false;

            // 1. Record Incoming Bid (The failed attempt)
            // It reached its limit immediately.
            await Bid.create({
                productId,
                bidderId: req.user.id,
                amount: incomingBidLimit, // It pushed up to its limit
                maxAmount: incomingBidLimit,
                isAutoBid: isAutoBid || false
            });

            // 2. NO Defensive Bid Record for Champion (Per user request for clean history)
            // The champion defends silently. Current price is updated on Product.
            // await Bid.create({ ... }); 
        }
      }
    }

    // Update Product
    product.currentPrice = newPrice;
    
    // Increment count. Just 1 for the incoming bid.
    product.bidCount += 1;
    await product.save();


    // --- NOTIFICATIONS ---
    
    // 1. Notify Incoming User
    if (isIncomingWinner) {
        // Success Email
        sendBidNotificationEmail(
            req.user.email,
            product.name,
            newPrice,
            req.user.fullName || "Bidder",
            false,
            productId
        ).catch((err: any) => console.error("Error sending success email:", err));
    } else {
        // Outbid Email (Immediate)
        sendBidNotificationEmail(
             req.user.email,
             product.name,
             newPrice, // The price is now held by champion
             req.user.fullName || "Bidder",
             true, // IS OUTBID immediately
             productId
        ).catch((err: any) => console.error("Error sending immediate outbid email:", err));
    }

    // 2. Notify Previous Champion (If they lost or defended)
    if (activeHighestBid && activeHighestBid.bidderId !== req.user.id) {
        if (isIncomingWinner) {
             // They were outbid
             sendBidNotificationEmail(
                 (activeHighestBid as any).bidder.email,
                 product.name,
                 newPrice,
                 (activeHighestBid as any).bidder.fullName || "Bidder",
                 true, // Outbid
                 productId
             ).catch((err: any) => console.error("Error sending prev winner outbid email:", err));
        } else {
             // They successfully defended (Auto-bid worked)
             sendBidNotificationEmail(
                 (activeHighestBid as any).bidder.email,
                 product.name,
                 newPrice,
                 (activeHighestBid as any).bidder.fullName || "Bidder",
                 false, // Success (Defended)
                 productId
             ).catch((err: any) => console.error("Error sending defense email:", err));
        }
    }

    // 3. Notify Seller
    sendSellerNewBidNotification(
        product.seller.email,
        product.name,
        newPrice,
        isIncomingWinner ? (req.user.fullName || "Bidder") : ((activeHighestBid as any)?.bidder.fullName || "Defender"), // Show who holds it
        productId
    ).catch((err: any) => console.error("Error sending seller email:", err));


    res.status(201).json({
      success: true,
      data: {
         amount: newPrice,
         isWinner: isIncomingWinner
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getBidHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;

    // Check if user is seller
    let isSeller = false;
    if (req.user) {
      const product = await Product.findByPk(productId);
      if (product && product.sellerId === req.user.id) {
        isSeller = true;
      }
    }

    // If seller, show all bids (including rejected), otherwise only non-rejected
    const whereClause: any = { productId };
    if (!isSeller) {
      whereClause.isRejected = false;
    }

    const bids = await Bid.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'bidder',
          attributes: ['id', 'fullName'],
        },
      ],
      order: [['amount', 'DESC'], ['createdAt', 'DESC']],
    });

    // Mask bidder names for non-sellers, show full names for seller
    const processedBids = bids.map((bid) => {
      const bidData = bid.toJSON() as any;
      if (isSeller) {
        // Seller sees full names and rejected status
        return {
          ...bidData,
          bidder: {
            ...bidData.bidder,
            fullName: bidData.bidder?.fullName || 'Unknown',
          },
        };
      } else {
        // Others see masked names
        const fullName = bidData.bidder?.fullName || 'Unknown';

        const maskedName = fullName.split('').map((char: string, index: number) => index % 2 === 0 ? char : '*').join('');
        return {
          ...bidData,
          bidder: {
            ...bidData.bidder,
            fullName: maskedName,
          },
        };
      }
    });

    res.json({
      success: true,
      data: processedBids,
    });
  } catch (error) {
    next(error);
  }
};

export const rejectBid = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const { bidId } = req.params;

    const bid = await Bid.findByPk(bidId, {
      include: [
        { model: Product, as: 'product' },
        { model: User, as: 'bidder' },
      ],
    }) as any; // Type assertion to access associations

    if (!bid) {
      return next(new AppError('Bid not found', 404));
    }

    if (bid.product.sellerId !== req.user.id && req.user.role !== 'admin') {
      return next(new AppError('Not authorized', 403));
    }

    // Reject ALL bids from this bidder for this product
    await Bid.update(
      { isRejected: true },
      { 
        where: { 
          productId: bid.productId, 
          bidderId: bid.bidderId 
        } 
      }
    );

    // Recalculate Auction State (Winner & Price)
    // 1. Fetch all valid bids for this product
    const validBids = await Bid.findAll({
      where: {
        productId: bid.productId,
        isRejected: false,
      },
      include: [{ model: User, as: 'bidder' }],
      order: [['maxAmount', 'DESC'], ['createdAt', 'ASC']], // Determining the real hierarchy
    });

    const product = await Product.findByPk(bid.productId);
    if (!product) return next(new AppError('Product not found', 404));

    if (validBids.length === 0) {
      // No bids left
      product.currentPrice = product.startingPrice;
      product.bidCount = 0;
      await product.save();
    } else if (validBids.length === 1) {
      // Only one bidder left -> They win at starting price
      const winner = validBids[0];
      // Price resets to starting price (or their bid if lower? No, starting price is min).
      product.currentPrice = product.startingPrice;
      // We might want to ensure it's at least their bid amount? 
      // Actually auto-bid logic says if 1 bidder, price is start price.
      product.bidCount = 1; 
      await product.save();

      // OPTIONAL: Update the bid record amount to reflect new price if we want strict consistency
      // winner.amount = product.startingPrice;
      // await winner.save();
    } else {
      // Multiple bidders left
      const newWinner = validBids[0];
      const newRunnerUp = validBids[1];
      const bidStep = parseFloat(product.bidStep.toString());

      const newWinnerMax = parseFloat(newWinner.maxAmount ? newWinner.maxAmount.toString() : newWinner.amount.toString());
      const runnerUpMax = parseFloat(newRunnerUp.maxAmount ? newRunnerUp.maxAmount.toString() : newRunnerUp.amount.toString());

      // Calculate new price
      // Logic based on Teacher's Rules:
      // 1. If New Winner is OLDER than Runner Up (Defense Scenario):
      //    Price = RunnerUpMax
      // 2. If New Winner is NEWER than Runner Up (Overtake Scenario):
      //    Price = min(WinnerMax, RunnerUpMax + Step)
      
      let nextPrice: number;
      const isDefense = new Date(newWinner.createdAt).getTime() < new Date(newRunnerUp.createdAt).getTime();

      if (isDefense) {
          nextPrice = runnerUpMax;
      } else {
          nextPrice = Math.min(newWinnerMax, runnerUpMax + bidStep);
      }

      product.currentPrice = nextPrice;
      product.bidCount = validBids.length; // Simply count of valid bids (approximate)
      await product.save();
      
      // Update the winner's current bid amount record?
      // In our new "Clean History" model, we might not have a record at exactly `nextPrice`.
      // But `newWinner` creates a record when they bid.
      // If we don't update records, the history might look weird (Winner has record at 11M, but price is 10.6M).
      // But typically we don't retroactive edit history.
      // We just update the Product's current price.
    }

    // Send notification
    sendBidRejectedEmail(
      bid.bidder.email,
      bid.product.name,
      bid.bidder.fullName || "Bidder",
      bid.productId
    ).catch((err: any) => console.error("Error sending bid rejected email:", err));

    res.json({
      success: true,
      message: 'Bid rejected successfully',
    });
  } catch (error) {
    next(error);
  }
};
