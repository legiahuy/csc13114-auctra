import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { formatDistanceToNow } from 'date-fns';
import { AlertCircle, CheckCircle2, XCircle, Send, CreditCard } from 'lucide-react';

import apiClient from '../api/client';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import Loading from '@/components/Loading';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Stepper } from '@/components/ui/stepper';

interface Review {
  id: number;
  reviewerId: number;
  revieweeId: number;
  rating: 1 | -1;
  comment: string;
  reviewer: {
    id: number;
    fullName: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface Order {
  id: number;
  productId: number;
  sellerId: number;
  buyerId: number;
  finalPrice: number;
  status: 'pending_payment' | 'pending_address' | 'pending_shipping' | 'pending_delivery' | 'completed' | 'cancelled';
  paymentMethod?: string;
  paymentTransactionId?: string;
  paymentProof?: string;
  shippingAddress?: string;
  shippingInvoice?: string;
  product: {
    id: number;
    name: string;
    mainImage: string;
    category: {
      name: string;
    };
  };
  seller: {
    id: number;
    fullName: string;
    email: string;
  };
  buyer: {
    id: number;
    fullName: string;
    email: string;
  };
  reviews?: Review[];
}

interface ChatMessage {
  id: number;
  message: string;
  senderId: number;
  sender: {
    id: number;
    fullName: string;
  };
  createdAt: string;
}

const steps = [
  'Payment',
  'Shipping Address',
  'Confirm Shipping',
  'Confirm Delivery',
  'Review Transaction',
];

export default function OrderPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [paymentProofUrl, setPaymentProofUrl] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Stripe');
  const [paymentTransactionId, setPaymentTransactionId] = useState('');
  const [addressData, setAddressData] = useState({
    houseNumber: '',
    street: '',
    city: '',
    country: ''
  });
  // Derived shipping address for backward compatibility/display
  const shippingAddress = [addressData.houseNumber, addressData.street, addressData.city, addressData.country].filter(Boolean).join(', ');
  const [shippingInvoiceUrl, setShippingInvoiceUrl] = useState('');
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState<1 | -1>(1);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewingFor, setReviewingFor] = useState<'seller' | 'buyer' | null>(null);
  const [myReview, setMyReview] = useState<Review | null>(null);

  // Cancel order dialog
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelResult, setCancelResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<number | null>(null);
  const isInitialLoadRef = useRef(true);
  const lastSavedRef = useRef<{
    paymentMethod?: string;
    paymentTransactionId?: string;
    paymentProof?: string;
    shippingAddress?: string;
    shippingInvoice?: string;
  }>({});

  // Auto-save function với debounce
  const autoSave = async (data: {
    paymentMethod?: string;
    paymentTransactionId?: string;
    paymentProof?: string;
    shippingAddress?: string;
    shippingInvoice?: string;
  }) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await apiClient.put(`/orders/${orderId}`, {
          ...data,
        });
        lastSavedRef.current = { ...data };
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, 1000);
  };

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await apiClient.get(`/orders/${orderId}`);
        const orderData = response.data.data;
        setOrder(orderData);

        const statusSteps: Record<string, number> = {
          pending_payment: 0,
          pending_address: 1,
          pending_shipping: 3,
          pending_delivery: 3,
          completed: 4,
          cancelled: -1,
        };
        setActiveStep(statusSteps[orderData.status] || 0);

        if (orderData.reviews && user) {
          const myReviewData = orderData.reviews.find(
            (r: Review) => r.reviewerId === user.id
          );
          if (myReviewData) {
            setMyReview(myReviewData);
            setReviewRating(myReviewData.rating);
            setReviewComment(myReviewData.comment);
          }
        }
        setPaymentMethod(orderData.paymentMethod || 'Stripe');
        setPaymentTransactionId(orderData.paymentTransactionId || '');
        setPaymentProofUrl(orderData.paymentProof || '');
        // Parse shipping address logic REMOVED to disable auto-fill per user request
        // if (orderData.shippingAddress) { ... }

        setShippingInvoiceUrl(orderData.shippingInvoice || '');

        lastSavedRef.current = {
          paymentMethod: orderData.paymentMethod || undefined,
          paymentTransactionId: orderData.paymentTransactionId || undefined,
          paymentProof: orderData.paymentProof || undefined,
          shippingAddress: orderData.shippingAddress || undefined,
          shippingInvoice: orderData.shippingInvoice || undefined,
        };

        isInitialLoadRef.current = false;
      } catch (error) {
        console.error('Error fetching order:', error);
        toast.error('Failed to load order information');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, user]);

  // Socket.IO setup
  useEffect(() => {
    if (!order || !user) return;

    const newSocket = io('http://localhost:3000');

    newSocket.on('connect', () => {
      newSocket.emit('join-room', `order-${orderId}`);
      newSocket.emit('join-room', `user-${user.id}`);
    });

    newSocket.on('new-message', (message: ChatMessage) => {
      // Enrich message with proper sender info if missing or if it's the generic "User"
      const needsEnrichment = !message.sender || 
                              !message.sender.fullName || 
                              message.sender.fullName === 'User';
      
      const enrichedMessage = {
        ...message,
        sender: needsEnrichment ? {
          id: message.senderId,
          fullName: message.senderId === order.buyerId 
            ? order.buyer.fullName 
            : order.seller.fullName
        } : message.sender
      };
      setMessages((prev) => [...prev, enrichedMessage]);
    });

    newSocket.on('order-updated', (updatedOrder: Order) => {
      setOrder(updatedOrder);
      const statusSteps: Record<string, number> = {
        pending_payment: 0,
        pending_address: 1,
        pending_shipping: 3,
        pending_delivery: 3,
        completed: 4,
        cancelled: -1,
      };
      setActiveStep(statusSteps[updatedOrder.status] || 0);

      if (updatedOrder.reviews && user) {
        const myReviewData = updatedOrder.reviews.find(
          (r: Review) => r.reviewerId === user.id
        );
        if (myReviewData) {
          setMyReview(myReviewData);
          setReviewRating(myReviewData.rating);
          setReviewComment(myReviewData.comment);
        }
      }
      setPaymentMethod(updatedOrder.paymentMethod || 'Stripe');
      setPaymentTransactionId(updatedOrder.paymentTransactionId || '');
      setPaymentProofUrl(updatedOrder.paymentProof || '');
      if (updatedOrder.shippingAddress) {
        const parts = updatedOrder.shippingAddress.split(', ');
        if (parts.length >= 4) {
          setAddressData({
            houseNumber: parts[0] || '',
            street: parts[1] || '',
            city: parts[2] || '',
            country: parts[3] || ''
          });
        } else {
          setAddressData({
            houseNumber: '',
            street: updatedOrder.shippingAddress,
            city: '',
            country: ''
          });
        }
      }
      setShippingInvoiceUrl(updatedOrder.shippingInvoice || '');

      lastSavedRef.current = {
        paymentMethod: updatedOrder.paymentMethod || undefined,
        paymentTransactionId: updatedOrder.paymentTransactionId || undefined,
        paymentProof: updatedOrder.paymentProof || undefined,
        shippingAddress: updatedOrder.shippingAddress || undefined,
        shippingInvoice: updatedOrder.shippingInvoice || undefined,
      };
    });

    setSocket(newSocket);

    const loadMessages = async () => {
      try {
        const response = await apiClient.get(`/chat/${orderId}`);
        setMessages(response.data.data);
      } catch (error) {
        console.error('Error loading messages:', error);
      }
    };
    loadMessages();

    return () => {
      newSocket.disconnect();
    };
  }, [order, orderId, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [newMessage]);

  useEffect(() => {
    if (!order || !orderId || isInitialLoadRef.current) return;

    const isBuyer = user?.id === order.buyerId;
    const isSeller = user?.id === order.sellerId;

    const hasPaymentChanges =
      (paymentMethod || '') !== (lastSavedRef.current.paymentMethod || '') ||
      (paymentTransactionId || '') !== (lastSavedRef.current.paymentTransactionId || '') ||
      (paymentProofUrl || '') !== (lastSavedRef.current.paymentProof || '');

    const hasShippingInvoiceChanges =
      (shippingInvoiceUrl || '') !== (lastSavedRef.current.shippingInvoice || '');

    if (isBuyer && hasPaymentChanges && (order.status === 'pending_payment' || order.status === 'pending_address')) {
      autoSave({
        paymentMethod: paymentMethod || undefined,
        paymentTransactionId: paymentTransactionId || undefined,
        paymentProof: paymentProofUrl || undefined,
      });
    }

    /* Removed autoSave for shippingAddress to prevent partial updates and auto-fill behavior */
    /*
    if (isBuyer && hasShippingAddressChanges && (order.status === 'pending_address' || order.status === 'pending_shipping')) {
      autoSave({
        shippingAddress: shippingAddress || undefined,
      });
    }
    */

    if (isSeller && hasShippingInvoiceChanges && shippingInvoiceUrl && (order.status === 'pending_shipping' || order.status === 'pending_delivery')) {
      autoSave({
        shippingInvoice: shippingInvoiceUrl || undefined,
      });
    }
  }, [paymentMethod, paymentTransactionId, paymentProofUrl, shippingAddress, shippingInvoiceUrl, order, orderId, user]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  /* Removed handlePaymentProofUpload and handleStep1 as they are replaced by StripePaymentForm */

  const handleStep2 = async () => {
    if (!addressData.houseNumber || !addressData.street || !addressData.city || !addressData.country) {
      toast.error('Please fill in all address fields');
      return;
    }

    // derived shippingAddress variable is already defined in component scope

    try {
      await apiClient.put(`/orders/${orderId}`, {
        shippingAddress,
      });
      toast.success('Address sent. Please wait for the seller to confirm and ship.');
      if (order) {
        setOrder({ ...order, shippingAddress });
      }
      setActiveStep(2); // Move to Step 3 (Waiting for seller)
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to send address');
    }
  };

  /* handleShippingInvoiceUpload removed as unnecessary */

  const handleStep3 = async () => {
    try {
      await apiClient.put(`/orders/${orderId}`, {
        status: 'pending_shipping',
        shippingInvoice: 'not_required', // Or simply omit if backend allows null
      });
      toast.success('Shipping confirmed successfully');
      setActiveStep(3);
      if (order) {
        setOrder({ ...order, status: 'pending_shipping', shippingInvoice: 'not_required' });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Confirmation failed');
    }
  };

  const handleStep4 = async () => {
    try {
      await apiClient.put(`/orders/${orderId}`, {
        status: 'completed',
      });
      toast.success('Delivery confirmed successfully');
      setActiveStep(4);
      if (order) {
        setOrder({ ...order, status: 'completed' });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Confirmation failed');
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    try {
      await apiClient.post('/users/rate', {
        orderId,
        rating: reviewRating,
        comment: reviewComment,
      });
      toast.success(myReview ? 'Review updated successfully' : 'Review submitted successfully');
      setReviewDialogOpen(false);
      setReviewingFor(null);
      const response = await apiClient.get(`/orders/${orderId}`);
      const orderData = response.data.data;
      setOrder(orderData);
      if (orderData.reviews && user) {
        const myReviewData = orderData.reviews.find(
          (r: Review) => r.reviewerId === user.id
        );
        if (myReviewData) {
          setMyReview(myReviewData);
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to submit review');
    }
  };

  const handleOpenReviewDialog = (forUser: 'seller' | 'buyer') => {
    setReviewingFor(forUser);
    if (myReview) {
      setReviewRating(myReview.rating);
      setReviewComment(myReview.comment);
    } else {
      setReviewRating(1);
      setReviewComment('');
    }
    setReviewDialogOpen(true);
  };

  const handleOpenCancelDialog = () => {
    setCancelResult(null);
    setCancelDialogOpen(true);
  };

  const handleCancelOrder = async () => {
    try {
      await apiClient.put(`/orders/${orderId}`, {
        status: 'cancelled',
      });
      setCancelResult({
        success: true,
        message: 'Order has been cancelled successfully.',
      });
      if (order) {
        setOrder({ ...order, status: 'cancelled' });
      }
    } catch (error: any) {
      setCancelResult({
        success: false,
        message: error.response?.data?.error?.message || 'Failed to cancel order',
      });
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !socket) return;

    try {
      await apiClient.post(`/chat/${orderId}`, { message: newMessage });
      setNewMessage('');
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  const handleResetOrder = async () => {
    if (!window.confirm('Are you sure you want to reset all order information from the beginning?')) return;

    try {
      await apiClient.put(`/orders/${orderId}`, {
        status: 'pending_payment',
        paymentMethod: '',
        paymentTransactionId: '',
        paymentProof: '',
        shippingAddress: '',
        shippingInvoice: '',
      });
      toast.success('Order process reset. Please start from step 1');
      setActiveStep(0);
      if (order) {
        setOrder({
          ...order,
          status: 'pending_payment',
          paymentMethod: '',
          paymentTransactionId: '',
          paymentProof: '',
          shippingAddress: '',
          shippingInvoice: '',
        } as any);
      }
      setPaymentMethod('Stripe');
      setPaymentTransactionId('');
      setPaymentProofUrl('');
      setAddressData({ houseNumber: '', street: '', city: '', country: '' });
      setShippingInvoiceUrl('');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to reset order');
    }
  };

  if (loading) {
    return <Loading />;
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex items-center gap-2 text-muted-foreground">
          <AlertCircle className="h-5 w-5" />
          <span>Order not found</span>
        </div>
      </div>
    );
  }

  const isBuyer = user?.id === order.buyerId;
  const isSeller = user?.id === order.sellerId;
  const canCancel = isSeller && order.status !== 'completed' && order.status !== 'cancelled';
  const canReset =
    isBuyer &&
    order.status !== 'completed' &&
    order.status !== 'cancelled';

  const getStatusBadge = () => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'destructive' | 'outline' }> = {
      pending_payment: { label: 'Pending Payment', variant: 'outline' },
      pending_address: { label: 'Pending Address', variant: 'outline' },
      pending_shipping: { label: 'Pending Shipping', variant: 'outline' },
      pending_delivery: { label: 'Pending Delivery', variant: 'outline' },
      completed: { label: 'Completed', variant: 'default' },
      cancelled: { label: 'Cancelled', variant: 'destructive' },
    };
    return statusMap[order.status] || { label: order.status, variant: 'outline' };
  };

  const statusBadge = getStatusBadge();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold">Complete Order</h1>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* Left column */}
        <div className="space-y-6">
          {/* Product info */}
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-4">
                <img
                  src={order.product.mainImage}
                  alt={order.product.name}
                  className="w-48 h-48 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <h2 className="text-xl font-semibold mb-2">{order.product.name}</h2>
                  <p className="text-sm text-muted-foreground mb-2">{order.product.category.name}</p>
                  <p className="text-2xl font-bold text-brand">
                    {parseFloat(order.finalPrice.toString()).toLocaleString('vi-VN')} VNĐ
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stepper */}
          <Card>
            <CardContent className="p-6">
              <Stepper activeStep={activeStep} steps={steps} />
            </CardContent>
          </Card>

          {/* Main content */}
          <Card>
            <CardContent className="p-6">
              {order.status === 'cancelled' && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-4">
                  <XCircle className="h-4 w-4 mt-0.5" />
                  <p>Order has been cancelled</p>
                </div>
              )}

              {order.status !== 'cancelled' && (
                <div className="space-y-6">
                  {/* Step 1: Payment */}
                  {activeStep === 0 && isBuyer && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Step 1: Confirm Payment</h3>

                      <div className="rounded-lg border bg-card p-6 text-center space-y-4">
                        <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <CreditCard className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="text-lg font-medium">Total Amount</p>
                          <p className="text-3xl font-bold text-brand">
                            {parseFloat(order.finalPrice.toString()).toLocaleString('vi-VN')} VNĐ
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                          Securely pay for your item using Stripe. You will be redirected to a dedicated payment page.
                        </p>
                        <Button
                          className="w-full max-w-sm h-11 text-base"
                          onClick={() => navigate(`/payment/${orderId}`)}
                        >
                          Pay with Stripe
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Shipping Address */}
                  {activeStep === 1 && isBuyer && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Step 2: Send Shipping Address</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-1.5 block">House Number</label>
                          <Input
                            value={addressData.houseNumber}
                            onChange={(e) => setAddressData({ ...addressData, houseNumber: e.target.value })}
                            placeholder="e.g. 123"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1.5 block">Street Name</label>
                          <Input
                            value={addressData.street}
                            onChange={(e) => setAddressData({ ...addressData, street: e.target.value })}
                            placeholder="e.g. Nguyen Van Linh"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1.5 block">City</label>
                          <Input
                            value={addressData.city}
                            onChange={(e) => setAddressData({ ...addressData, city: e.target.value })}
                            placeholder="e.g. Ho Chi Minh City"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1.5 block">Country</label>
                          <Input
                            value={addressData.country}
                            onChange={(e) => setAddressData({ ...addressData, country: e.target.value })}
                            placeholder="e.g. Vietnam"
                          />
                        </div>
                      </div>

                      <Button
                        onClick={handleStep2}
                        disabled={!addressData.houseNumber || !addressData.street || !addressData.city || !addressData.country}
                      >
                        Confirm Address
                      </Button>
                    </div>
                  )}

                  {/* Buyer waiting for seller to ship */}
                  {((activeStep === 1 && order?.status === 'pending_address' && order?.shippingAddress) || activeStep === 2) && isBuyer && order?.status !== 'pending_shipping' && order?.status !== 'pending_delivery' && (
                    <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                      <AlertCircle className="h-4 w-4 mt-0.5" />
                      <p>You have sent the address. Please wait for the seller to confirm and ship.</p>
                    </div>
                  )}

                  {/* Step 3: Seller confirms shipping */}
                  {order?.status === 'pending_address' && order?.shippingAddress && isSeller && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Step 3: Confirm Payment Received and Ship</h3>
                      {order.shippingAddress && (
                        <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                          <AlertCircle className="h-4 w-4 mt-0.5" />
                          <div>
                            <p className="font-medium mb-1">Shipping Address:</p>
                            <p>{order.shippingAddress}</p>
                          </div>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-muted-foreground mb-4">
                          Please confirm that you have shipped the item to the buyer's address above.
                        </p>
                      </div>
                      <Button
                        onClick={handleStep3}
                      >
                        Confirm Shipped
                      </Button>
                    </div>
                  )}

                  {/* Step 4: Buyer confirms delivery */}
                  {order?.status === 'pending_shipping' && isBuyer && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Step 4: Confirm Delivery</h3>
                      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                        <AlertCircle className="h-4 w-4 mt-0.5" />
                        <p>Please check the goods before confirming</p>
                      </div>
                      <Button onClick={handleStep4}>
                        Confirm Delivery
                      </Button>
                    </div>
                  )}

                  {/* Completed */}
                  {order.status === 'completed' && (
                    <div className="space-y-4">
                      <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
                        <CheckCircle2 className="h-4 w-4 mt-0.5" />
                        <p>Order completed successfully!</p>
                      </div>

                      {/* Step 5: Review */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Step 5: Review Transaction</h3>

                        {/* Display current reviews if any */}
                        {order.reviews && order.reviews.length > 0 && (
                          <div className="space-y-3">
                            <p className="text-sm font-medium">Current Reviews:</p>
                            {order.reviews.map((review) => (
                              <Card key={review.id}>
                                <CardContent className="p-4">
                                  <div className="flex justify-between items-center mb-2">
                                    <p className="text-sm font-semibold">
                                      {review.reviewer.fullName} reviewed{' '}
                                      {review.reviewerId === order.sellerId ? order.buyer.fullName : order.seller.fullName}
                                    </p>
                                    <Badge variant={review.rating === 1 ? 'default' : 'destructive'}>
                                      {review.rating === 1 ? '+1 (Positive)' : '-1 (Negative)'}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground mb-2">{review.comment}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(review.updatedAt || review.createdAt), { addSuffix: true })}
                                  </p>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}

                        {/* Review form for current user */}
                        {user && (
                          <div className="space-y-3">
                            {myReview ? (
                              <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                                <AlertCircle className="h-4 w-4 mt-0.5" />
                                <p>You have already reviewed. You can change your review at any time.</p>
                              </div>
                            ) : (
                              <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                                <AlertCircle className="h-4 w-4 mt-0.5" />
                                <p>Please review the {isBuyer ? 'seller' : 'buyer'} to complete the transaction.</p>
                              </div>
                            )}

                            <Button
                              variant={myReview ? 'outline' : 'default'}
                              onClick={() => handleOpenReviewDialog(isBuyer ? 'seller' : 'buyer')}
                            >
                              {myReview ? 'Change Review' : 'Review'}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions for order */}
                  <div className="flex gap-2 flex-wrap pt-4 border-t">
                    {canCancel && (
                      <Button
                        variant="outline"
                        onClick={handleOpenCancelDialog}
                        className="text-destructive hover:text-destructive"
                      >
                        Cancel Order
                      </Button>
                    )}
                    {canReset && (
                      <Button
                        variant="outline"
                        onClick={handleResetOrder}
                      >
                        Reset from Beginning
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chat Section */}
          <Card className="overflow-hidden">
            <CardHeader className="border-b pb-3">
              <CardTitle className="text-base">Messages</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* Chat messages area */}
              <div className="h-[400px] overflow-y-auto bg-muted/30 p-4 space-y-1">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    No messages yet. Start a conversation!
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isOwnMessage = msg.senderId === user?.id;
                    const prevMessage = index > 0 ? messages[index - 1] : null;
                    const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;

                    // Check if this is the first message in a group
                    const isFirstInGroup =
                      !prevMessage ||
                      prevMessage.senderId !== msg.senderId ||
                      new Date(msg.createdAt).getTime() - new Date(prevMessage.createdAt).getTime() > 300000; // 5 minutes

                    // Check if this is the last message in a group
                    const isLastInGroup =
                      !nextMessage ||
                      nextMessage.senderId !== msg.senderId ||
                      new Date(nextMessage.createdAt).getTime() - new Date(msg.createdAt).getTime() > 300000;

                    return (
                      <div
                        key={msg.id}
                        className={`flex items-start gap-2 ${isOwnMessage ? 'justify-end' : 'justify-start'} ${isFirstInGroup ? 'mt-2' : 'mt-1'
                          }`}
                      >
                        {/* Avatar for other person's messages */}
                        {!isOwnMessage && (
                          <div className="flex-shrink-0 w-8 h-8">
                            {isLastInGroup ? (
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs bg-primary/10">
                                  {msg.sender.fullName.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            ) : (
                              <div className="w-8" />
                            )}
                          </div>
                        )}

                        {/* Message bubble */}
                        <div className={`flex flex-col max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                          {/* Sender name for other person's messages */}
                          {!isOwnMessage && isFirstInGroup && (
                            <span className="text-xs text-muted-foreground mb-1.5 px-1.5">
                              {msg.sender.fullName}
                            </span>
                          )}

                          {/* Message bubble */}
                          <div
                            className={`relative rounded-2xl px-4 py-2.5 flex items-center justify-center min-h-[36px] ${isOwnMessage
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-200 text-gray-900'
                              }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words text-center leading-normal m-0 w-full">{msg.message}</p>
                          </div>

                          {/* Timestamp - only show for the latest message */}
                          {index === messages.length - 1 && (
                            <span className={`text-xs text-muted-foreground mt-1 px-1.5 ${isOwnMessage ? 'text-right' : 'text-left'
                              }`}>
                              {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                            </span>
                          )}
                        </div>

                        {/* Spacer for own messages */}
                        {isOwnMessage && (
                          <div className="flex-shrink-0 w-8" />
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input area */}
              <div className="border-t p-3 bg-background">
                <div className="flex gap-2 items-end">
                  <div className="flex-1 relative">
                    <Textarea
                      ref={textareaRef}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Type a message..."
                      className="min-h-[44px] max-h-[120px] resize-none pr-12 pt-2.5 rounded-2xl"
                      rows={1}
                    />
                  </div>
                  <Button
                    onClick={handleSendMessage}
                    size="icon"
                    className="rounded-full h-11 w-11 flex-shrink-0"
                    disabled={!newMessage.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column - Order info */}
        <div className="space-y-4 lg:sticky lg:top-20 lg:h-fit">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Order Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Order ID</p>
                <p className="text-sm font-medium">#{order.id}</p>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Seller</p>
                <p className="text-sm font-medium">{order.seller.fullName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Buyer</p>
                <p className="text-sm font-medium">{order.buyer.fullName}</p>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Amount</p>
                <p className="text-xl font-bold text-brand">
                  {parseFloat(order.finalPrice.toString()).toLocaleString('vi-VN')} VNĐ
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Cancel Order Dialog */}
      <Dialog
        open={cancelDialogOpen}
        onOpenChange={(open) => {
          setCancelDialogOpen(open);
          if (!open) {
            setCancelResult(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader className="text-center">
            <DialogTitle className="text-center">
              {cancelResult ? "Cancel Order Result" : "Cancel Order"}
            </DialogTitle>
          </DialogHeader>

          {!cancelResult ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-justify">
                Are you sure you want to cancel this order? This action cannot be undone.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div
                className={`flex items-start gap-3 p-4 rounded-lg border ${cancelResult.success
                  ? "bg-green-50 border-green-200 text-green-900"
                  : "bg-red-50 border-red-200 text-red-900"
                  }`}
              >
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <p className="text-sm">{cancelResult.message}</p>
              </div>
            </div>
          )}

          <DialogFooter className="!justify-center sm:!justify-center">
            {!cancelResult ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCancelDialogOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleCancelOrder}>
                  Cancel Order
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => {
                  setCancelDialogOpen(false);
                  setCancelResult(null);
                }}
              >
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={(open) => {
        setReviewDialogOpen(open);
        if (!open) setReviewingFor(null);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {myReview ? 'Change Review' : 'Review Transaction'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {reviewingFor && order && (
              <p className="text-sm text-muted-foreground">
                You are reviewing: {reviewingFor === 'seller' ? order.seller.fullName : order.buyer.fullName}
              </p>
            )}
            <div>
              <p className="text-sm font-medium mb-2">Rating:</p>
              <div className="flex gap-2">
                <Button
                  variant={reviewRating === 1 ? 'default' : 'outline'}
                  onClick={() => setReviewRating(1)}
                  className="flex-1"
                >
                  +1 (Positive)
                </Button>
                <Button
                  variant={reviewRating === -1 ? 'destructive' : 'outline'}
                  onClick={() => setReviewRating(-1)}
                  className="flex-1"
                >
                  -1 (Negative)
                </Button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Comment</label>
              <Textarea
                rows={4}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Enter your comment about this transaction..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReviewDialogOpen(false);
                setReviewingFor(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitReview}>
              {myReview ? 'Update Review' : 'Submit Review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
