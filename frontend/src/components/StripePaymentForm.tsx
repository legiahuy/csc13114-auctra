import React, { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import apiClient from '../api/client';
import toast from 'react-hot-toast';
import { XCircle } from 'lucide-react';

interface StripePaymentFormProps {
    orderId: number; // or string depending on your app types, assuming number here but strictly passing
    onSuccess: (paymentIntentId: string) => void;
}

export const StripePaymentForm = ({ orderId, onSuccess }: StripePaymentFormProps) => {
    const stripe = useStripe();
    const elements = useElements();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!stripe || !elements) {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // 1. Create PaymentIntent on backend
            const { data } = await apiClient.post('/payments/create-payment-intent', { orderId });

            if (!data.success) {
                throw new Error('Failed to initialize payment');
            }

            const clientSecret = data.data.clientSecret;

            // 2. Confirm payment on frontend
            const cardElement = elements.getElement(CardElement);
            if (!cardElement) throw new Error("Card element not found");

            const result = await stripe.confirmCardPayment(clientSecret, {
                payment_method: {
                    card: cardElement,
                },
            });

            if (result.error) {
                setError(result.error.message || 'Payment failed');
                toast.error(result.error.message || 'Payment failed');
            } else {
                if (result.paymentIntent.status === 'succeeded') {
                    toast.success('Payment successful!');
                    onSuccess(result.paymentIntent.id);
                }
            }
        } catch (err: any) {
            console.error(err);
            const msg = err.response?.data?.message || err.message || 'Error processing payment';
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="w-full space-y-6">
            <div className="rounded-xl border bg-card p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Secure Payment</h3>
                    <div className="flex gap-2">
                        <Badge variant="outline" className="text-xs bg-white">VISA</Badge>
                        <Badge variant="outline" className="text-xs bg-white">MasterCard</Badge>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Card Information</label>
                        <div className="p-3 border rounded-lg bg-background focus-within:ring-2 focus-within:ring-ring focus-within:border-primary transition-all">
                            <CardElement options={{
                                style: {
                                    base: {
                                        fontSize: '15px',
                                        color: '#0f172a',
                                        fontFamily: 'Inter, system-ui, sans-serif',
                                        '::placeholder': {
                                            color: '#94a3b8',
                                        },
                                    },
                                    invalid: {
                                        color: '#ef4444',
                                    },
                                },
                                hidePostalCode: true,
                            }} />
                        </div>
                    </div>
                </div>

                <div className="mt-6">
                    <Button
                        type="submit"
                        disabled={!stripe || loading}
                        className="w-full h-11 text-base font-medium shadow-md transition-all active:scale-[0.98]"
                    >
                        {loading ? (
                            <div className="flex items-center gap-2">
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                Processing...
                            </div>
                        ) : (
                            'Pay via Stripe'
                        )}
                    </Button>
                    <p className="text-center text-xs text-muted-foreground mt-3 flex items-center justify-center gap-1">
                        <span className="h-3 w-3 rounded-full bg-green-500/20 text-green-600 flex items-center justify-center text-[8px]">✓</span>
                        Powered by Stripe. Test Mode Active. (Use 4242 4242 4242 4242)
                    </p>
                </div>
            </div>

            {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    {error}
                </div>
            )}
        </form>
    );
};
