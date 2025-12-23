import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { formatDistanceToNow } from 'date-fns';
import { AlertCircle, CheckCircle2, XCircle, Send } from 'lucide-react';

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
  'Thanh toán',
  'Gửi địa chỉ giao hàng',
  'Xác nhận đã gửi hàng',
  'Xác nhận đã nhận hàng',
  'Đánh giá giao dịch',
];

export default function OrderPage() {
  const { orderId } = useParams();
  const { user } = useAuthStore();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [paymentProofUrl, setPaymentProofUrl] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentTransactionId, setPaymentTransactionId] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingInvoiceUrl, setShippingInvoiceUrl] = useState('');
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState<1 | -1>(1);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewingFor, setReviewingFor] = useState<'seller' | 'buyer' | null>(null);
  const [myReview, setMyReview] = useState<Review | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
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
        setPaymentMethod(orderData.paymentMethod || '');
        setPaymentTransactionId(orderData.paymentTransactionId || '');
        setPaymentProofUrl(orderData.paymentProof || '');
        setShippingAddress(orderData.shippingAddress || '');
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
        toast.error('Không thể tải thông tin đơn hàng');
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
      setMessages((prev) => [...prev, message]);
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
      setPaymentMethod(updatedOrder.paymentMethod || '');
      setPaymentTransactionId(updatedOrder.paymentTransactionId || '');
      setPaymentProofUrl(updatedOrder.paymentProof || '');
      setShippingAddress(updatedOrder.shippingAddress || '');
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

  useEffect(() => {
    if (!order || !orderId || isInitialLoadRef.current) return;

    const isBuyer = user?.id === order.buyerId;
    const isSeller = user?.id === order.sellerId;
    
    const hasPaymentChanges = 
      (paymentMethod || '') !== (lastSavedRef.current.paymentMethod || '') ||
      (paymentTransactionId || '') !== (lastSavedRef.current.paymentTransactionId || '') ||
      (paymentProofUrl || '') !== (lastSavedRef.current.paymentProof || '');
    
    const hasShippingAddressChanges = 
      (shippingAddress || '') !== (lastSavedRef.current.shippingAddress || '');
    
    const hasShippingInvoiceChanges = 
      (shippingInvoiceUrl || '') !== (lastSavedRef.current.shippingInvoice || '');

    if (isBuyer && hasPaymentChanges && (order.status === 'pending_payment' || order.status === 'pending_address')) {
      autoSave({
        paymentMethod: paymentMethod || undefined,
        paymentTransactionId: paymentTransactionId || undefined,
        paymentProof: paymentProofUrl || undefined,
      });
    }

    if (isBuyer && hasShippingAddressChanges && (order.status === 'pending_address' || order.status === 'pending_shipping')) {
      autoSave({
        shippingAddress: shippingAddress || undefined,
      });
    }

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

  const handlePaymentProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await apiClient.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      const url = response.data.data.url;
      setPaymentProofUrl(url);
      toast.success('Upload ảnh thành công');
      await autoSave({ paymentProof: url });
    } catch (error) {
      toast.error('Upload ảnh thất bại');
    }
  };

  const handleShippingInvoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await apiClient.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      const url = response.data.data.url;
      setShippingInvoiceUrl(url);
      toast.success('Upload hóa đơn thành công');
      await autoSave({ shippingInvoice: url });
    } catch (error) {
      toast.error('Upload hóa đơn thất bại');
    }
  };

  const handleStep1 = async () => {
    if (!paymentProofUrl && !paymentTransactionId) {
      toast.error('Vui lòng upload ảnh thanh toán hoặc nhập mã giao dịch');
      return;
    }

    try {
      await apiClient.put(`/orders/${orderId}`, {
        status: 'pending_address',
        paymentMethod: paymentMethod || 'Other',
        paymentTransactionId: paymentTransactionId || undefined,
        paymentProof: paymentProofUrl || undefined,
      });
      toast.success('Xác nhận thanh toán thành công');
      setActiveStep(1);
      if (order) {
        setOrder({ ...order, status: 'pending_address' });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Xác nhận thanh toán thất bại');
    }
  };

  const handleStep2 = async () => {
    if (!shippingAddress.trim()) {
      toast.error('Vui lòng nhập địa chỉ giao hàng');
      return;
    }

    try {
      await apiClient.put(`/orders/${orderId}`, {
        shippingAddress,
      });
      toast.success('Đã gửi địa chỉ. Vui lòng chờ người bán xác nhận và gửi hàng.');
      if (order) {
        setOrder({ ...order, shippingAddress });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Gửi địa chỉ thất bại');
    }
  };

  const handleStep3 = async () => {
    if (!shippingInvoiceUrl) {
      toast.error('Vui lòng upload hóa đơn vận chuyển');
      return;
    }

    try {
      await apiClient.put(`/orders/${orderId}`, {
        status: 'pending_shipping',
        shippingInvoice: shippingInvoiceUrl,
      });
      toast.success('Xác nhận đã gửi hàng thành công');
      setActiveStep(3);
      if (order) {
        setOrder({ ...order, status: 'pending_shipping', shippingInvoice: shippingInvoiceUrl });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Xác nhận thất bại');
    }
  };

  const handleStep4 = async () => {
    try {
      await apiClient.put(`/orders/${orderId}`, {
        status: 'completed',
      });
      toast.success('Xác nhận đã nhận hàng thành công');
      setActiveStep(4);
      if (order) {
        setOrder({ ...order, status: 'completed' });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Xác nhận thất bại');
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewComment.trim()) {
      toast.error('Vui lòng nhập nhận xét');
      return;
    }

    try {
      await apiClient.post('/users/rate', {
        orderId,
        rating: reviewRating,
        comment: reviewComment,
      });
      toast.success(myReview ? 'Cập nhật đánh giá thành công' : 'Đánh giá thành công');
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
      toast.error(error.response?.data?.error?.message || 'Đánh giá thất bại');
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

  const handleCancelOrder = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) return;

    try {
      await apiClient.put(`/orders/${orderId}`, {
        status: 'cancelled',
      });
      toast.success('Đã hủy đơn hàng');
      if (order) {
        setOrder({ ...order, status: 'cancelled' });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Hủy đơn hàng thất bại');
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !socket) return;

    try {
      await apiClient.post(`/chat/${orderId}`, { message: newMessage });
      setNewMessage('');
    } catch (error) {
      toast.error('Gửi tin nhắn thất bại');
    }
  };

  const handleResetOrder = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn nhập lại toàn bộ thông tin đơn hàng từ đầu?')) return;

    try {
      await apiClient.put(`/orders/${orderId}`, {
        status: 'pending_payment',
        paymentMethod: '',
        paymentTransactionId: '',
        paymentProof: '',
        shippingAddress: '',
        shippingInvoice: '',
      });
      toast.success('Đã reset quy trình đơn hàng, vui lòng nhập lại từ bước 1');
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
      setPaymentMethod('');
      setPaymentTransactionId('');
      setPaymentProofUrl('');
      setShippingAddress('');
      setShippingInvoiceUrl('');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Không thể reset đơn hàng');
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
          <span>Đơn hàng không tồn tại</span>
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
      pending_payment: { label: 'Chờ thanh toán', variant: 'outline' },
      pending_address: { label: 'Chờ địa chỉ', variant: 'outline' },
      pending_shipping: { label: 'Chờ gửi hàng', variant: 'outline' },
      pending_delivery: { label: 'Chờ nhận hàng', variant: 'outline' },
      completed: { label: 'Hoàn thành', variant: 'default' },
      cancelled: { label: 'Đã hủy', variant: 'destructive' },
    };
    return statusMap[order.status] || { label: order.status, variant: 'outline' };
  };

  const statusBadge = getStatusBadge();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold">Hoàn tất đơn hàng</h1>

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
                  <p>Đơn hàng đã bị hủy</p>
                </div>
              )}

              {order.status !== 'cancelled' && (
                <div className="space-y-6">
                  {/* Step 1: Payment */}
                  {activeStep === 0 && isBuyer && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Bước 1: Xác nhận thanh toán</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium mb-1.5 block">Phương thức thanh toán</label>
                          <Input
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            placeholder="VD: MoMo, ZaloPay, VNPay, Chuyển khoản..."
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1.5 block">Mã giao dịch (nếu có)</label>
                          <Input
                            value={paymentTransactionId}
                            onChange={(e) => setPaymentTransactionId(e.target.value)}
                            placeholder="Nhập mã giao dịch..."
                          />
                        </div>
                        <div>
                          <input
                            accept="image/*"
                            style={{ display: 'none' }}
                            id="payment-proof-upload"
                            type="file"
                            onChange={handlePaymentProofUpload}
                          />
                          <label htmlFor="payment-proof-upload">
                            <Button variant="outline" asChild>
                              <span>Upload ảnh chứng từ thanh toán</span>
                            </Button>
                          </label>
                          {paymentProofUrl && (
                            <div className="mt-3">
                              <img
                                src={`http://localhost:3000${paymentProofUrl}`}
                                alt="Payment proof"
                                className="max-w-full max-h-[300px] rounded-lg border"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        onClick={handleStep1}
                        disabled={!paymentProofUrl && !paymentTransactionId}
                      >
                        Xác nhận thanh toán
                      </Button>
                    </div>
                  )}

                  {/* Step 2: Shipping Address */}
                  {activeStep === 1 && isBuyer && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Bước 2: Gửi địa chỉ giao hàng</h3>
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Địa chỉ giao hàng</label>
                        <Textarea
                          rows={4}
                          value={shippingAddress}
                          onChange={(e) => setShippingAddress(e.target.value)}
                          placeholder="Nhập địa chỉ giao hàng đầy đủ..."
                        />
                      </div>
                      <Button
                        onClick={handleStep2}
                        disabled={!shippingAddress.trim()}
                      >
                        Xác nhận địa chỉ
                      </Button>
                    </div>
                  )}

                  {/* Buyer waiting for seller to ship */}
                  {activeStep === 1 && order?.status === 'pending_address' && order?.shippingAddress && isBuyer && (
                    <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                      <AlertCircle className="h-4 w-4 mt-0.5" />
                      <p>Bạn đã gửi địa chỉ. Vui lòng chờ người bán xác nhận và gửi hàng.</p>
                    </div>
                  )}

                  {/* Step 3: Seller confirms shipping */}
                  {order?.status === 'pending_address' && order?.shippingAddress && isSeller && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Bước 3: Xác nhận đã nhận tiền và gửi hàng</h3>
                      {order.shippingAddress && (
                        <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                          <AlertCircle className="h-4 w-4 mt-0.5" />
                          <div>
                            <p className="font-medium mb-1">Địa chỉ giao hàng:</p>
                            <p>{order.shippingAddress}</p>
                          </div>
                        </div>
                      )}
                      <div>
                        <input
                          accept="image/*,.pdf"
                          style={{ display: 'none' }}
                          id="shipping-invoice-upload"
                          type="file"
                          onChange={handleShippingInvoiceUpload}
                        />
                        <label htmlFor="shipping-invoice-upload">
                          <Button variant="outline" asChild>
                            <span>Upload hóa đơn vận chuyển</span>
                          </Button>
                        </label>
                        {shippingInvoiceUrl && (
                          <div className="mt-3">
                            <img
                              src={`http://localhost:3000${shippingInvoiceUrl}`}
                              alt="Shipping invoice"
                              className="max-w-full max-h-[300px] rounded-lg border"
                            />
                          </div>
                        )}
                      </div>
                      <Button
                        onClick={handleStep3}
                        disabled={!shippingInvoiceUrl}
                      >
                        Xác nhận đã gửi hàng
                      </Button>
                    </div>
                  )}

                  {/* Step 4: Buyer confirms delivery */}
                  {order?.status === 'pending_shipping' && isBuyer && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Bước 4: Xác nhận đã nhận hàng</h3>
                      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                        <AlertCircle className="h-4 w-4 mt-0.5" />
                        <p>Vui lòng kiểm tra hàng hóa trước khi xác nhận</p>
                      </div>
                      <Button onClick={handleStep4}>
                        Xác nhận đã nhận hàng
                      </Button>
                    </div>
                  )}

                  {/* Completed */}
                  {order.status === 'completed' && (
                    <div className="space-y-4">
                      <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
                        <CheckCircle2 className="h-4 w-4 mt-0.5" />
                        <p>Đơn hàng đã hoàn tất thành công!</p>
                      </div>
                      
                      {/* Step 5: Review */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Bước 5: Đánh giá giao dịch</h3>
                        
                        {/* Hiển thị đánh giá hiện tại nếu có */}
                        {order.reviews && order.reviews.length > 0 && (
                          <div className="space-y-3">
                            <p className="text-sm font-medium">Đánh giá hiện tại:</p>
                            {order.reviews.map((review) => (
                              <Card key={review.id}>
                                <CardContent className="p-4">
                                  <div className="flex justify-between items-center mb-2">
                                    <p className="text-sm font-semibold">
                                      {review.reviewer.fullName} đánh giá{' '}
                                      {review.reviewerId === order.sellerId ? order.buyer.fullName : order.seller.fullName}
                                    </p>
                                    <Badge variant={review.rating === 1 ? 'default' : 'destructive'}>
                                      {review.rating === 1 ? '+1 (Tích cực)' : '-1 (Tiêu cực)'}
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
                        
                        {/* Form đánh giá cho user hiện tại */}
                        {user && (
                          <div className="space-y-3">
                            {myReview ? (
                              <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                                <AlertCircle className="h-4 w-4 mt-0.5" />
                                <p>Bạn đã đánh giá. Bạn có thể thay đổi đánh giá của mình bất kỳ lúc nào.</p>
                              </div>
                            ) : (
                              <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                                <AlertCircle className="h-4 w-4 mt-0.5" />
                                <p>Vui lòng đánh giá {isBuyer ? 'người bán' : 'người mua'} để hoàn tất giao dịch.</p>
                              </div>
                            )}
                            
                            <Button
                              variant={myReview ? 'outline' : 'default'}
                              onClick={() => handleOpenReviewDialog(isBuyer ? 'seller' : 'buyer')}
                            >
                              {myReview ? 'Thay đổi đánh giá' : 'Đánh giá'}
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
                        onClick={handleCancelOrder}
                        className="text-destructive hover:text-destructive"
                      >
                        Hủy đơn hàng
                      </Button>
                    )}
                    {canReset && (
                      <Button
                        variant="outline"
                        onClick={handleResetOrder}
                      >
                        Nhập lại từ đầu
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chat Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tin nhắn</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-[400px] overflow-y-auto border rounded-lg p-4 space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        msg.senderId === user?.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {msg.sender.fullName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium">{msg.sender.fullName}</span>
                      </div>
                      <p className="text-sm">{msg.message}</p>
                      <p className={`text-xs mt-1 ${msg.senderId === user?.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Nhập tin nhắn..."
                />
                <Button onClick={handleSendMessage} size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column - Order info */}
        <div className="space-y-4 lg:sticky lg:top-20 lg:h-fit">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Thông tin đơn hàng</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Mã đơn</p>
                <p className="text-sm font-medium">#{order.id}</p>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Trạng thái</p>
                <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Người bán</p>
                <p className="text-sm font-medium">{order.seller.fullName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Người mua</p>
                <p className="text-sm font-medium">{order.buyer.fullName}</p>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Tổng tiền</p>
                <p className="text-xl font-bold text-brand">
                  {parseFloat(order.finalPrice.toString()).toLocaleString('vi-VN')} VNĐ
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={(open) => {
        setReviewDialogOpen(open);
        if (!open) setReviewingFor(null);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {myReview ? 'Thay đổi đánh giá' : 'Đánh giá giao dịch'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {reviewingFor && order && (
              <p className="text-sm text-muted-foreground">
                Bạn đang đánh giá: {reviewingFor === 'seller' ? order.seller.fullName : order.buyer.fullName}
              </p>
            )}
            <div>
              <p className="text-sm font-medium mb-2">Đánh giá:</p>
              <div className="flex gap-2">
                <Button
                  variant={reviewRating === 1 ? 'default' : 'outline'}
                  onClick={() => setReviewRating(1)}
                  className="flex-1"
                >
                  +1 (Tích cực)
                </Button>
                <Button
                  variant={reviewRating === -1 ? 'destructive' : 'outline'}
                  onClick={() => setReviewRating(-1)}
                  className="flex-1"
                >
                  -1 (Tiêu cực)
                </Button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Nhận xét</label>
              <Textarea
                rows={4}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Nhập nhận xét của bạn về giao dịch này..."
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
              Hủy
            </Button>
            <Button onClick={handleSubmitReview}>
              {myReview ? 'Cập nhật đánh giá' : 'Gửi đánh giá'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
