import { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { AppError } from '../middleware/errorHandler';
import { Order } from '../models';
import dotenv from 'dotenv';
dotenv.config();

// Initialize Stripe with secret key from env
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    // apiVersion: '2023-10-16',
});

export const createPaymentIntent = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { orderId } = req.body;

        const order = await Order.findByPk(orderId);
        if (!order) {
            return next(new AppError('Order not found', 404));
        }

        if (!process.env.STRIPE_SECRET_KEY) {
            return next(new AppError('Stripe API key is not configured', 500));
        }

        // Calculate amount (VND is integer-only/zero-decimal currency in Stripe)
        const amount = Math.round(Number(order.finalPrice));

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: 'vnd',
            description: `Payment for Order #${order.id}`,
            metadata: {
                orderId: order.id.toString(),
                productName: 'Auction Product', // Can be fetched from product include
            },
            automatic_payment_methods: {
                enabled: true,
            },
        });

        res.json({
            success: true,
            data: {
                clientSecret: paymentIntent.client_secret,
            },
        });
    } catch (error: any) {
        console.error('Stripe error:', error);
        next(new AppError(error.message || 'Payment processing failed', 500));
    }
};
