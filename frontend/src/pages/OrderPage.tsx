import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { formatDistanceToNow } from 'date-fns';
import { AlertCircle, CheckCircle2, XCircle, Send, CreditCard, Upload, FileText, Package, Truck, Download, Clock } from 'lucide-react';

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
  trackingNumber?: string;
  carrierName?: string;
  createdAt: string;
  updatedAt: string;
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

  // Seller Confirmation States for Auto-Generated Invoice
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrierName, setCarrierName] = useState('');
  const [isAddressConfirmed, setIsAddressConfirmed] = useState(false);
  const [isPaymentConfirmed, setIsPaymentConfirmed] = useState(false);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);

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

  // File upload states
  const [uploadingPaymentProof, setUploadingPaymentProof] = useState(false);
  const paymentProofInputRef = useRef<HTMLInputElement>(null);

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

      // Auto-prompt for review
      setTimeout(() => {
        handleOpenReviewDialog('seller');
      }, 500);

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

  // Handle payment proof upload
  const handlePaymentProofUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setUploadingPaymentProof(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await apiClient.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const fileUrl = uploadResponse.data.data.url;
      setPaymentProofUrl(fileUrl);

      // Update order with payment proof
      await apiClient.put(`/orders/${orderId}`, {
        paymentProof: fileUrl,
      });

      toast.success('Payment proof uploaded successfully! Seller will be notified.');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to upload payment proof');
    } finally {
      setUploadingPaymentProof(false);
      if (paymentProofInputRef.current) {
        paymentProofInputRef.current.value = '';
      }
    }
  };

  // Handle Seller confirming payment proof
  const handleConfirmPayment = async () => {
    try {
      await apiClient.put(`/orders/${orderId}`, {
        status: 'pending_address',
      });
      toast.success('Payment confirmed! Buyer can now enter shipping address.');

      // Update local state
      if (order) {
        setOrder({ ...order, status: 'pending_address' });
        setActiveStep(1);
      }
    } catch (error: any) {
      console.error('Payment confirmation error:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to confirm payment');
    }
  };

  // Handle generating invoice and confirming shipment
  const handleGenerateAndShip = async () => {
    if (!order) return;

    if (!trackingNumber.trim()) {
      toast.error('Please enter a tracking number to generate the invoice');
      return;
    }

    if (!isAddressConfirmed || !isPaymentConfirmed) {
      toast.error('Please confirm both address and payment verification checks');
      return;
    }

    setIsGeneratingInvoice(true);
    try {
      // Update order status to pending_delivery and mark invoice as generated
      // Also save tracking details
      await apiClient.put(`/orders/${orderId}`, {
        status: 'pending_delivery',
        shippingInvoice: 'generated_invoice',
        trackingNumber: trackingNumber,
        carrierName: carrierName || 'Default Carrier'
      });

      toast.success('Invoice generated & shipping confirmed! Buyer has been notified.');

      // Update local state to reflect changes immediately
      if (order) {
        setOrder({
          ...order,
          status: 'pending_delivery',
          shippingInvoice: 'generated_invoice',
          trackingNumber: trackingNumber,
          carrierName: carrierName
        });
        // We don't rely on activeStep state directly as it's derived from order status effect, 
        // but setting it here provides instant feedback
        setActiveStep(3);
      }
    } catch (error: any) {
      console.error('Shipping confirmation error:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to confirm shipping');
    } finally {
      setIsGeneratingInvoice(false);
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
                  {/* Step 1: Payment Verification */}
                  {activeStep === 0 && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                          1
                        </div>
                        <h3 className="text-xl font-semibold">Payment Verification</h3>
                      </div>

                      {/* SELLER VIEW */}
                      {isSeller && (
                        <div className="rounded-lg border bg-card p-6">
                          <h4 className="font-semibold mb-4">Review Payment Proof</h4>
                          {!order.paymentProof ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/30 rounded-lg border border-dashed">
                              <Clock className="h-8 w-8 text-muted-foreground mb-2 opacity-50" />
                              <p className="font-medium text-muted-foreground">Waiting for payment proof</p>
                              <p className="text-sm text-muted-foreground mt-1">The buyer hasn't uploaded payment confirmation yet.</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="rounded-lg border overflow-hidden bg-muted/10">
                                <div className="p-3 border-b bg-muted/30 flex justify-between items-center">
                                  <span className="text-sm font-medium flex items-center gap-2">
                                    <FileText className="h-4 w-4" /> Proof of Payment
                                  </span>
                                  <a href={order.paymentProof} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:align-baseline flex items-center gap-1">
                                    <Download className="h-3 w-3" /> View Original
                                  </a>
                                </div>
                                <div className="p-4 flex justify-center bg-black/5">
                                  <img src={order.paymentProof} alt="Proof" className="max-h-[400px] w-auto object-contain rounded shadow-sm" />
                                </div>
                              </div>

                              <div className="flex flex-col gap-3 p-4 bg-yellow-50 dark:bg-yellow-950/10 border border-yellow-200 dark:border-yellow-900 rounded-lg">
                                <div className="flex gap-2">
                                  <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0" />
                                  <div>
                                    <h5 className="font-medium text-yellow-900 dark:text-yellow-200">Verify Payment</h5>
                                    <p className="text-sm text-yellow-800 dark:text-yellow-300 mt-1">
                                      Please verify the proof above matches the order amount. Confirming will allow the buyer to proceed to enter shipping address.
                                    </p>
                                  </div>
                                </div>
                                <Button onClick={handleConfirmPayment} className="w-full mt-2" size="lg">
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  Confirm Payment & Allow Shipping
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* BUYER VIEW */}
                      {isBuyer && (
                        <div className="space-y-6">
                          {/* Warning Banner */}
                          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 px-4 py-3">
                            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-red-900 dark:text-red-100">
                                Important: Payment Confirmation
                              </p>
                              <p className="text-xs text-red-800 dark:text-red-200 mt-1">
                                After paying via Stripe, please take a screenshot of the success screen and upload it here as proof.
                              </p>
                            </div>
                          </div>

                          {/* Pay Button */}
                          {!order.paymentProof && (
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
                              <Button
                                className="w-full max-w-sm h-11 text-base"
                                onClick={() => navigate(`/payment/${orderId}`)}
                              >
                                Pay with Stripe
                              </Button>
                            </div>
                          )}

                          {/* Payment Proof Upload Section - Always show after payment button */}
                          <div className="rounded-lg border bg-card p-6 space-y-4">
                            <div className="flex items-start gap-3">
                              <Upload className="h-5 w-5 text-blue-600 mt-0.5" />
                              <div className="flex-1">
                                <h4 className="font-semibold mb-2">Upload Payment Proof</h4>

                                {paymentProofUrl ? (
                                  <div className="space-y-4">
                                    <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 px-4 py-3">
                                      <Clock className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                                      <div className="flex-1">
                                        <p className="text-sm text-blue-900 dark:text-blue-100 font-medium">
                                          Waiting for Seller Approval
                                        </p>
                                        <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                                          You have uploaded the proof. Please wait for the seller to verify and confirm your payment.
                                          Once confirmed, this page will automatically update to allow you to enter your shipping address.
                                        </p>
                                        <a
                                          href={paymentProofUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs text-blue-600 hover:underline mt-2 inline-block font-medium"
                                        >
                                          View uploaded proof
                                        </a>
                                      </div>
                                    </div>
                                    <div className="text-center pt-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => paymentProofInputRef.current?.click()}
                                        disabled={uploadingPaymentProof}
                                        className="text-xs text-muted-foreground"
                                      >
                                        Upload different proof if needed
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <p className="text-sm text-muted-foreground mb-4">
                                      Upload your screenshot here after payment.
                                    </p>
                                    <div
                                      className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer bg-muted/50"
                                      onClick={() => paymentProofInputRef.current?.click()}
                                    >
                                      {uploadingPaymentProof ? (
                                        <div className="flex flex-col items-center">
                                          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mb-2" />
                                          <p className="text-sm text-muted-foreground">Uploading...</p>
                                        </div>
                                      ) : (
                                        <>
                                          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                                          <p className="text-sm font-medium">Click to upload image</p>
                                          <p className="text-xs text-muted-foreground mt-1">Accepts JPG, PNG (Max 5MB)</p>
                                        </>
                                      )}
                                    </div>
                                  </>
                                )}
                                <input
                                  ref={paymentProofInputRef}
                                  type="file"
                                  accept="image/*"
                                  onChange={handlePaymentProofUpload}
                                  className="hidden"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}


                  {/* Step 2: Shipping Address */}
                  {
                    activeStep === 1 && isBuyer && (
                      <div className="space-y-6">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                            2
                          </div>
                          <h3 className="text-xl font-semibold">Shipping Address</h3>
                        </div>

                        <div className="rounded-lg border bg-card p-6 space-y-4">
                          <p className="text-sm text-muted-foreground mb-4">
                            Please enter your complete shipping address so the seller can ship the item.
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium mb-1.5 block">House Number *</label>
                              <Input
                                value={addressData.houseNumber}
                                onChange={(e) => setAddressData({ ...addressData, houseNumber: e.target.value })}
                                placeholder="e.g. 123"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium mb-1.5 block">Street Name *</label>
                              <Input
                                value={addressData.street}
                                onChange={(e) => setAddressData({ ...addressData, street: e.target.value })}
                                placeholder="e.g. Nguyen Van Linh"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium mb-1.5 block">City *</label>
                              <Input
                                value={addressData.city}
                                onChange={(e) => setAddressData({ ...addressData, city: e.target.value })}
                                placeholder="e.g. Ho Chi Minh City"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium mb-1.5 block">Country *</label>
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
                            className="w-full"
                            size="lg"
                          >
                            <Package className="h-5 w-5 mr-2" />
                            Confirm Address
                          </Button>
                        </div>
                      </div>
                    )
                  }

                  {/* Buyer waiting for seller to ship */}
                  {
                    ((activeStep === 1 && order?.status === 'pending_address' && order?.shippingAddress) || activeStep === 2) && isBuyer && order?.status !== 'pending_shipping' && order?.status !== 'pending_delivery' && (
                      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                        <AlertCircle className="h-4 w-4 mt-0.5" />
                        <p>You have sent the address. Please wait for the seller to confirm and ship.</p>
                      </div>
                    )
                  }

                  {/* Step 3: Seller confirms shipping */}
                  {
                    order?.status === 'pending_address' && order?.shippingAddress && isSeller && (
                      <div className="space-y-6">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                            3
                          </div>
                          <h3 className="text-xl font-semibold">Confirm Shipping</h3>
                        </div>

                        {/* Shipping Address Display */}
                        {order.shippingAddress && (
                          <div className="rounded-lg border bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 p-6">
                            <div className="flex items-start gap-3">
                              <Package className="h-6 w-6 text-amber-600 mt-1" />
                              <div className="flex-1">
                                <p className="font-semibold mb-2 text-amber-900 dark:text-amber-100">
                                  Shipping Address:
                                </p>
                                <p className="text-sm text-amber-800 dark:text-amber-200 bg-white/50 dark:bg-black/20 rounded p-3">
                                  {order.shippingAddress}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Payment Proof Display for Seller */}
                        {order.paymentProof && (
                          <div className="rounded-lg border bg-card p-6">
                            <div className="flex items-start gap-3">
                              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                              <div className="flex-1">
                                <h4 className="font-semibold mb-2">Payment Proof from Buyer</h4>
                                <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 px-4 py-3">
                                  <FileText className="h-4 w-4 text-green-600 mt-0.5" />
                                  <div className="flex-1">
                                    <p className="text-sm text-green-900 dark:text-green-100">
                                      Buyer has uploaded payment proof
                                    </p>
                                    <a
                                      href={order.paymentProof}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                                    >
                                      Xem hóa đơn / View proof
                                    </a>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Shipping Confirmation Section with Auto Invoice Generation */}
                        <div className="rounded-lg border bg-card p-6 space-y-6">
                          <div className="flex items-start gap-3">
                            <Truck className="h-5 w-5 text-blue-600 mt-0.5" />
                            <div className="flex-1 space-y-4">
                              <div>
                                <h4 className="font-semibold mb-1">Create Invoice & Ship</h4>
                                <p className="text-sm text-muted-foreground">
                                  Enter shipping details below. The system will automatically generate an invoice for the buyer.
                                </p>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium mb-1.5 block">Tracking Number *</label>
                                  <Input
                                    value={trackingNumber}
                                    onChange={(e) => setTrackingNumber(e.target.value)}
                                    placeholder="e.g. VN123456789"
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium mb-1.5 block">Carrier Name</label>
                                  <Input
                                    value={carrierName}
                                    onChange={(e) => setCarrierName(e.target.value)}
                                    placeholder="e.g. Viettel Post"
                                  />
                                </div>
                              </div>

                              <div className="space-y-3 pt-2 border-t">
                                <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">Confirmation Checklist</h5>

                                <div className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id="confirm-addr"
                                    checked={isAddressConfirmed}
                                    onChange={(e) => setIsAddressConfirmed(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                  />
                                  <label htmlFor="confirm-addr" className="text-sm cursor-pointer select-none">
                                    I verify that the address <strong>{order.shippingAddress}</strong> is correct and valid for delivery.
                                  </label>
                                </div>

                                <div className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id="confirm-pay"
                                    checked={isPaymentConfirmed}
                                    onChange={(e) => setIsPaymentConfirmed(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                  />
                                  <label htmlFor="confirm-pay" className="text-sm cursor-pointer select-none">
                                    I confirm that I have received full payment of <strong>{parseFloat(order.finalPrice.toString()).toLocaleString('vi-VN')} VNĐ</strong>.
                                  </label>
                                </div>
                              </div>

                              <Button
                                onClick={handleGenerateAndShip}
                                disabled={isGeneratingInvoice || !trackingNumber || !isAddressConfirmed || !isPaymentConfirmed}
                                className="w-full mt-4"
                                size="lg"
                              >
                                {isGeneratingInvoice ? (
                                  <>
                                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                                    Generating Invoice & Shipping...
                                  </>
                                ) : (
                                  <>
                                    <FileText className="h-4 w-4 mr-2" />
                                    Create Invoice & Confirm Shipping
                                  </>
                                )}
                              </Button>

                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  }

                  {/* Step 4: Delivery & Invoice */}
                  {
                    (order?.status === 'pending_shipping' || order?.status === 'pending_delivery') && (
                      <div className="space-y-6">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                            4
                          </div>
                          <h3 className="text-xl font-semibold">
                            {isBuyer ? 'Confirm Delivery' : 'Shipping & Invoice'}
                          </h3>
                        </div>

                        {/* Invoice Display - Visible to BOTH Buyer and Seller */}
                        <Card className="border-2 border-dashed bg-gray-50/50 dark:bg-gray-900/10">
                          <CardContent className="p-6">
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6 border-b pb-4">
                              <div>
                                <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                  <FileText className="h-5 w-5" />
                                  INVOICE
                                </h4>
                                <p className="text-sm text-muted-foreground">#{order.id}</p>
                              </div>
                              <div className="text-left sm:text-right">
                                <Badge variant="outline" className="mb-1 font-mono">
                                  {order.trackingNumber || 'No Tracking'}
                                </Badge>
                                <p className="text-sm font-medium">{order.carrierName || 'Standard Shipping'}</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                              <div className="space-y-1">
                                <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Bill To (Buyer)</h5>
                                <p className="font-semibold">{order.buyer.fullName}</p>
                                <p className="text-sm text-muted-foreground break-words">{order.shippingAddress || 'Address not provided'}</p>
                                <p className="text-sm text-muted-foreground">{order.buyer.email}</p>
                              </div>
                              <div className="space-y-1">
                                <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Ship From (Seller)</h5>
                                <p className="font-semibold">{order.seller.fullName}</p>
                                <p className="text-sm text-muted-foreground">{order.seller.email}</p>
                              </div>
                            </div>

                            <div className="bg-white dark:bg-black/20 rounded-lg border p-4 mb-6">
                              <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Item Details</h5>
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="font-medium text-lg">{order.product.name}</p>
                                  <Badge variant="secondary" className="text-xs">Auction Won</Badge>
                                </div>
                                <p className="font-bold text-lg text-brand whitespace-nowrap">
                                  {parseFloat(order.finalPrice.toString()).toLocaleString('vi-VN')} VNĐ
                                </p>
                              </div>
                            </div>

                            <div className="flex justify-end gap-2">
                              {order.shippingInvoice === 'generated_invoice' && (
                                <Button variant="outline" size="sm" onClick={() => setInvoiceDialogOpen(true)}>
                                  <FileText className="h-4 w-4 mr-2" />
                                  View Full Invoice
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>

                        {/* Buyer Actions */}
                        {isBuyer && (
                          <div className="rounded-lg border bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 p-6">
                            <div className="flex items-start gap-3 mb-4">
                              <AlertCircle className="h-5 w-5 text-green-600 mt-0.5" />
                              <div className="space-y-1">
                                <p className="text-sm text-green-900 dark:text-green-100 font-medium">
                                  Has the package arrived safely?
                                </p>
                                <p className="text-xs text-green-800 dark:text-green-200">
                                  Please inspect the item before confirming receipt. This will complete the order and release funds to the seller.
                                </p>
                              </div>
                            </div>
                            <Button
                              onClick={handleStep4}
                              className="w-full bg-green-600 hover:bg-green-700 text-white"
                              size="lg"
                            >
                              <CheckCircle2 className="h-5 w-5 mr-2" />
                              Already Received
                            </Button>
                          </div>
                        )}

                        {/* Seller Status */}
                        {isSeller && (
                          <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 px-4 py-3">
                            <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                Shipment in Progress
                              </p>
                              <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                                You have confirmed the shipment. The invoice is visible to the buyer.
                                Waiting for the buyer to confirm they have received the goods.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  }

                  {/* Completed */}
                  {
                    order.status === 'completed' && (
                      <div className="space-y-4">
                        <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
                          <CheckCircle2 className="h-4 w-4 mt-0.5" />
                          <p>Order completed! You can now review each other.</p>
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
                    )
                  }

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
                </div >
              )}
            </CardContent >
          </Card >

          {/* Chat Section */}
          < Card className="overflow-hidden" >
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
          </Card >
        </div >

        {/* Right column - Order info */}
        < div className="space-y-4 lg:sticky lg:top-20 lg:h-fit" >
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
        </div >
      </div >

      {/* Cancel Order Dialog */}
      < Dialog
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
      </Dialog >

      {/* Review Dialog */}
      < Dialog open={reviewDialogOpen} onOpenChange={(open) => {
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
      </Dialog >

      {/* Invoice Preview Dialog */}
      <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Shipping Invoice Preview</DialogTitle>
          </DialogHeader>

          <div className="border rounded-lg p-8 bg-white text-black font-sans shadow-sm my-2">
            <div className="flex justify-between border-b border-gray-100 pb-6 mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">INVOICE</h1>
                <p className="text-sm text-gray-500 mt-2 font-medium">No. INV-{order?.id}</p>
                <p className="text-sm text-gray-500">Date: {order && (order.updatedAt || order.createdAt) ? new Date(order.updatedAt || order.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <h3 className="font-semibold text-gray-800 uppercase text-xs tracking-wider mb-1">Shipping Details</h3>
                <p className="text-sm text-gray-700">Tracking: <strong className="font-mono bg-gray-100 px-1 rounded">{order?.trackingNumber || 'N/A'}</strong></p>
                <p className="text-sm text-gray-700 mt-1">Carrier: {order?.carrierName || 'Standard'}</p>
              </div>
            </div>

            <div className="flex justify-between mb-8 gap-8">
              <div className="w-1/2 bg-gray-50 p-4 rounded-md">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 border-b border-gray-200 pb-2">Bill To (Buyer)</h4>
                <p className="font-bold text-lg text-gray-900">{order?.buyer?.fullName}</p>
                <p className="text-sm text-gray-600 mt-1 leading-relaxed">{order?.shippingAddress}</p>
                <p className="text-sm text-gray-500 mt-2 flex items-center gap-1">
                  <span className="w-1 h-1 bg-gray-400 rounded-full"></span> {order?.buyer?.email}
                </p>
              </div>
              <div className="w-1/2 bg-gray-50 p-4 rounded-md">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 border-b border-gray-200 pb-2">Ship From (Seller)</h4>
                <p className="font-bold text-lg text-gray-900">{order?.seller?.fullName}</p>
                <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                  <span className="w-1 h-1 bg-gray-400 rounded-full"></span> {order?.seller?.email}
                </p>
              </div>
            </div>

            <table className="w-full mb-8 border-collapse">
              <thead>
                <tr className="bg-gray-50 border-y border-gray-100">
                  <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Item Description</th>
                  <th className="text-right py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-4 px-4 border-b border-gray-50">
                    <p className="font-medium text-gray-900 text-lg">{order?.product?.name}</p>
                    <Badge variant="secondary" className="mt-1 text-xs font-normal">Auction Item Winner</Badge>
                  </td>
                  <td className="py-4 px-4 border-b border-gray-50 text-right text-gray-900 font-medium">
                    {order && parseFloat(order.finalPrice.toString()).toLocaleString('vi-VN')} VNĐ
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-200">
                  <td className="py-4 px-4 text-right font-bold text-gray-700">Total Due</td>
                  <td className="py-4 px-4 text-right font-bold text-green-700 text-xl whitespace-nowrap">
                    {order && parseFloat(order.finalPrice.toString()).toLocaleString('vi-VN')} VNĐ
                  </td>
                </tr>
              </tfoot>
            </table>

            <div className="text-center text-xs text-gray-400 mt-12">
              <p>This is a computer-generated invoice used for shipping verification.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div >
  );
}