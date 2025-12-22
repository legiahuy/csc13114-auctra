import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Button,
  TextField,
  Grid,
  Card,
  CardMedia,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Alert,
} from '@mui/material';
import { io, Socket } from 'socket.io-client';
import apiClient from '../api/client';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

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
          // Không gửi status để chỉ lưu draft, không thay đổi trạng thái
        });
        // Lưu lại giá trị đã save
        lastSavedRef.current = { ...data };
      } catch (error) {
        console.error('Auto-save failed:', error);
        // Không hiển thị error để không làm phiền user
      }
    }, 1000); // Debounce 1 giây
  };

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await apiClient.get(`/orders/${orderId}`);
        const orderData = response.data.data;
        setOrder(orderData);
        
        // Set active step based on status
        // pending_address: bidder đã gửi địa chỉ, seller cần xác nhận gửi hàng (bước 3)
        // pending_shipping: seller đã gửi hàng, bidder cần xác nhận nhận hàng (bước 4)
        const statusSteps: Record<string, number> = {
          pending_payment: 0,
          pending_address: 1, // Bidder đã gửi địa chỉ, seller thấy bước 3
          pending_shipping: 3, // Seller đã gửi hàng, bidder thấy bước 4
          pending_delivery: 3, // Tương tự pending_shipping
          completed: 4,
          cancelled: -1,
        };
        setActiveStep(statusSteps[orderData.status] || 0);
        setPaymentMethod(orderData.paymentMethod || '');
        setPaymentTransactionId(orderData.paymentTransactionId || '');
        setPaymentProofUrl(orderData.paymentProof || '');
        setShippingAddress(orderData.shippingAddress || '');
        setShippingInvoiceUrl(orderData.shippingInvoice || '');
        
        // Lưu giá trị ban đầu để so sánh
        lastSavedRef.current = {
          paymentMethod: orderData.paymentMethod || undefined,
          paymentTransactionId: orderData.paymentTransactionId || undefined,
          paymentProof: orderData.paymentProof || undefined,
          shippingAddress: orderData.shippingAddress || undefined,
          shippingInvoice: orderData.shippingInvoice || undefined,
        };
        
        // Đánh dấu đã load xong
        isInitialLoadRef.current = false;
      } catch (error) {
        console.error('Error fetching order:', error);
        toast.error('Không thể tải thông tin đơn hàng');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  // Socket.IO setup
  useEffect(() => {
    if (!order || !user) return;

    const newSocket = io('http://localhost:3000');

    newSocket.on('connect', () => {
      newSocket.emit('join-room', `order-${orderId}`);
      // Join vào user room để nhận order-list-updated
      newSocket.emit('join-room', `user-${user.id}`);
    });

    newSocket.on('new-message', (message: ChatMessage) => {
      setMessages((prev) => [...prev, message]);
    });

    // Listen cho order-updated event
    newSocket.on('order-updated', (updatedOrder: Order) => {
      setOrder(updatedOrder);
      // Cập nhật active step
      // pending_address: bidder đã gửi địa chỉ, seller cần xác nhận gửi hàng (bước 3)
      // pending_shipping: seller đã gửi hàng, bidder cần xác nhận nhận hàng (bước 4)
      const statusSteps: Record<string, number> = {
        pending_payment: 0,
        pending_address: 1, // Bidder đã gửi địa chỉ, seller thấy bước 3
        pending_shipping: 3, // Seller đã gửi hàng, bidder thấy bước 4
        pending_delivery: 3, // Tương tự pending_shipping
        completed: 4,
        cancelled: -1,
      };
      setActiveStep(statusSteps[updatedOrder.status] || 0);
      // Cập nhật các field
      setPaymentMethod(updatedOrder.paymentMethod || '');
      setPaymentTransactionId(updatedOrder.paymentTransactionId || '');
      setPaymentProofUrl(updatedOrder.paymentProof || '');
      setShippingAddress(updatedOrder.shippingAddress || '');
      setShippingInvoiceUrl(updatedOrder.shippingInvoice || '');
      
      // Cập nhật lastSavedRef để tránh auto-save không cần thiết
      lastSavedRef.current = {
        paymentMethod: updatedOrder.paymentMethod || undefined,
        paymentTransactionId: updatedOrder.paymentTransactionId || undefined,
        paymentProof: updatedOrder.paymentProof || undefined,
        shippingAddress: updatedOrder.shippingAddress || undefined,
        shippingInvoice: updatedOrder.shippingInvoice || undefined,
      };
    });

    setSocket(newSocket);

    // Load existing messages
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

  // Auto-save khi các field thay đổi (chỉ khi order đã được load và user đã thay đổi)
  useEffect(() => {
    if (!order || !orderId || isInitialLoadRef.current) return;

    // Chỉ auto-save nếu user là buyer và đang ở các bước tương ứng
    const isBuyer = user?.id === order.buyerId;
    const isSeller = user?.id === order.sellerId;
    
    // Kiểm tra xem có thay đổi không
    const hasPaymentChanges = 
      (paymentMethod || '') !== (lastSavedRef.current.paymentMethod || '') ||
      (paymentTransactionId || '') !== (lastSavedRef.current.paymentTransactionId || '') ||
      (paymentProofUrl || '') !== (lastSavedRef.current.paymentProof || '');
    
    const hasShippingAddressChanges = 
      (shippingAddress || '') !== (lastSavedRef.current.shippingAddress || '');
    
    const hasShippingInvoiceChanges = 
      (shippingInvoiceUrl || '') !== (lastSavedRef.current.shippingInvoice || '');

    // Auto-save payment info (bước 1) - chỉ khi có thay đổi
    if (isBuyer && hasPaymentChanges && (order.status === 'pending_payment' || order.status === 'pending_address')) {
      autoSave({
        paymentMethod: paymentMethod || undefined,
        paymentTransactionId: paymentTransactionId || undefined,
        paymentProof: paymentProofUrl || undefined,
      });
    }

    // Auto-save shipping address (bước 2) - chỉ khi có thay đổi
    if (isBuyer && hasShippingAddressChanges && (order.status === 'pending_address' || order.status === 'pending_shipping')) {
      autoSave({
        shippingAddress: shippingAddress || undefined,
      });
    }

    // Auto-save shipping invoice (bước 3 - seller) - chỉ khi có thay đổi
    if (isSeller && hasShippingInvoiceChanges && shippingInvoiceUrl && (order.status === 'pending_shipping' || order.status === 'pending_delivery')) {
      autoSave({
        shippingInvoice: shippingInvoiceUrl || undefined,
      });
    }
  }, [paymentMethod, paymentTransactionId, paymentProofUrl, shippingAddress, shippingInvoiceUrl, order, orderId, user]);

  // Cleanup timeout khi unmount
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
      // Auto-save payment proof
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
      // Auto-save shipping invoice
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
      // Chỉ lưu địa chỉ, không thay đổi status (vẫn ở pending_address)
      await apiClient.put(`/orders/${orderId}`, {
        shippingAddress,
        // Không gửi status để giữ nguyên pending_address
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
      // Seller xác nhận đã gửi hàng, chuyển từ pending_address → pending_shipping
      await apiClient.put(`/orders/${orderId}`, {
        status: 'pending_shipping',
        shippingInvoice: shippingInvoiceUrl,
      });
      toast.success('Xác nhận đã gửi hàng thành công');
      setActiveStep(2); // Seller đã hoàn thành bước 3
      if (order) {
        setOrder({ ...order, status: 'pending_shipping', shippingInvoice: shippingInvoiceUrl });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Xác nhận thất bại');
    }
  };

  const handleStep4 = async () => {
    try {
      // Bidder xác nhận đã nhận hàng, chuyển từ pending_shipping → completed
      await apiClient.put(`/orders/${orderId}`, {
        status: 'completed',
      });
      toast.success('Xác nhận đã nhận hàng thành công');
      setActiveStep(4);
      if (order) {
        setOrder({ ...order, status: 'completed' });
      }
      setReviewDialogOpen(true);
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
      toast.success('Đánh giá thành công');
      setReviewDialogOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Đánh giá thất bại');
    }
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
    return <Typography>Đang tải...</Typography>;
  }

  if (!order) {
    return <Typography>Đơn hàng không tồn tại</Typography>;
  }

  const isBuyer = user?.id === order.buyerId;
  const isSeller = user?.id === order.sellerId;
  const canCancel = isSeller && order.status !== 'completed' && order.status !== 'cancelled';
  const canReset =
    isBuyer &&
    order.status !== 'completed' &&
    order.status !== 'cancelled';

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Hoàn tất đơn hàng
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Card sx={{ display: 'flex', mb: 3 }}>
              <CardMedia
                component="img"
                sx={{ width: 200 }}
                image={order.product.mainImage}
                alt={order.product.name}
              />
              <CardContent>
                <Typography variant="h6">{order.product.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {order.product.category.name}
                </Typography>
                <Typography variant="h5" color="primary" sx={{ mt: 2 }}>
                  {parseFloat(order.finalPrice.toString()).toLocaleString('vi-VN')} VNĐ
                </Typography>
              </CardContent>
            </Card>

            <Stepper activeStep={activeStep} alternativeLabel>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            {order.status === 'cancelled' && (
              <Alert severity="error" sx={{ mt: 3 }}>
                Đơn hàng đã bị hủy
              </Alert>
            )}

            {order.status !== 'cancelled' && (
              <Box sx={{ mt: 4 }}>
                {/* Step 1: Payment */}
                {activeStep === 0 && isBuyer && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Bước 1: Xác nhận thanh toán
                    </Typography>
                    <TextField
                      label="Phương thức thanh toán"
                      fullWidth
                      margin="normal"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      placeholder="VD: MoMo, ZaloPay, VNPay, Chuyển khoản..."
                    />
                    <TextField
                      label="Mã giao dịch (nếu có)"
                      fullWidth
                      margin="normal"
                      value={paymentTransactionId}
                      onChange={(e) => setPaymentTransactionId(e.target.value)}
                    />
                    <Box sx={{ mt: 2 }}>
                      <input
                        accept="image/*"
                        style={{ display: 'none' }}
                        id="payment-proof-upload"
                        type="file"
                        onChange={handlePaymentProofUpload}
                      />
                      <label htmlFor="payment-proof-upload">
                        <Button variant="outlined" component="span">
                          Upload ảnh chứng từ thanh toán
                        </Button>
                      </label>
                      {paymentProofUrl && (
                        <Box sx={{ mt: 2 }}>
                          <img
                            src={`http://localhost:3000${paymentProofUrl}`}
                            alt="Payment proof"
                            style={{ maxWidth: '100%', maxHeight: 300 }}
                          />
                        </Box>
                      )}
                    </Box>
                    <Button
                      variant="contained"
                      onClick={handleStep1}
                      sx={{ mt: 3 }}
                      disabled={!paymentProofUrl && !paymentTransactionId}
                    >
                      Xác nhận thanh toán
                    </Button>
                  </Box>
                )}

                {/* Step 2: Shipping Address */}
                {activeStep === 1 && isBuyer && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Bước 2: Gửi địa chỉ giao hàng
                    </Typography>
                    <TextField
                      label="Địa chỉ giao hàng"
                      fullWidth
                      multiline
                      rows={4}
                      margin="normal"
                      value={shippingAddress}
                      onChange={(e) => {
                        setShippingAddress(e.target.value);
                        // Auto-save sẽ được trigger bởi useEffect
                      }}
                      required
                    />
                    <Button
                      variant="contained"
                      onClick={handleStep2}
                      sx={{ mt: 3 }}
                      disabled={!shippingAddress.trim()}
                    >
                      Xác nhận địa chỉ
                    </Button>
                  </Box>
                )}

                {/* Buyer waiting for seller to ship */}
                {activeStep === 1 && order?.status === 'pending_address' && order?.shippingAddress && isBuyer && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    Bạn đã gửi địa chỉ. Vui lòng chờ người bán xác nhận và gửi hàng.
                  </Alert>
                )}

                {/* Step 3: Seller confirms shipping - hiển thị khi status là pending_address và đã có shippingAddress */}
                {order?.status === 'pending_address' && order?.shippingAddress && isSeller && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Bước 3: Xác nhận đã nhận tiền và gửi hàng
                    </Typography>
                    {order.shippingAddress && (
                      <Alert severity="info" sx={{ mb: 2 }}>
                        Địa chỉ giao hàng: {order.shippingAddress}
                      </Alert>
                    )}
                    <Box sx={{ mt: 2 }}>
                      <input
                        accept="image/*,.pdf"
                        style={{ display: 'none' }}
                        id="shipping-invoice-upload"
                        type="file"
                        onChange={handleShippingInvoiceUpload}
                      />
                      <label htmlFor="shipping-invoice-upload">
                        <Button variant="outlined" component="span">
                          Upload hóa đơn vận chuyển
                        </Button>
                      </label>
                      {shippingInvoiceUrl && (
                        <Box sx={{ mt: 2 }}>
                          <img
                            src={`http://localhost:3000${shippingInvoiceUrl}`}
                            alt="Shipping invoice"
                            style={{ maxWidth: '100%', maxHeight: 300 }}
                          />
                        </Box>
                      )}
                    </Box>
                    <Button
                      variant="contained"
                      onClick={handleStep3}
                      sx={{ mt: 3 }}
                      disabled={!shippingInvoiceUrl}
                    >
                      Xác nhận đã gửi hàng
                    </Button>
                  </Box>
                )}

                {/* Step 4: Buyer confirms delivery - hiển thị khi status là pending_shipping */}
                {order?.status === 'pending_shipping' && isBuyer && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Bước 4: Xác nhận đã nhận hàng
                    </Typography>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Vui lòng kiểm tra hàng hóa trước khi xác nhận
                    </Alert>
                    <Button variant="contained" onClick={handleStep4} sx={{ mt: 3 }}>
                      Xác nhận đã nhận hàng
                    </Button>
                  </Box>
                )}

                {/* Completed */}
                {activeStep === 4 && (
                  <Alert severity="success">
                    Đơn hàng đã hoàn tất thành công!
                  </Alert>
                )}

                {/* Actions for order */}
                <Box sx={{ display: 'flex', gap: 2, mt: 3, flexWrap: 'wrap' }}>
                  {canCancel && (
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={handleCancelOrder}
                    >
                      Hủy đơn hàng
                    </Button>
                  )}
                  {canReset && (
                    <Button
                      variant="outlined"
                      color="secondary"
                      onClick={handleResetOrder}
                    >
                      Nhập lại từ đầu
                    </Button>
                  )}
                </Box>
              </Box>
            )}
          </Paper>

          {/* Chat Section */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Tin nhắn
            </Typography>
            <Box
              sx={{
                height: 400,
                overflowY: 'auto',
                border: '1px solid #e0e0e0',
                borderRadius: 1,
                p: 2,
                mb: 2,
              }}
            >
              {messages.map((msg) => (
                <Box
                  key={msg.id}
                  sx={{
                    mb: 2,
                    display: 'flex',
                    justifyContent: msg.senderId === user?.id ? 'flex-end' : 'flex-start',
                  }}
                >
                  <Paper
                    sx={{
                      p: 2,
                      maxWidth: '70%',
                      bgcolor: msg.senderId === user?.id ? 'primary.light' : 'grey.200',
                    }}
                  >
                    <Typography variant="caption" display="block" gutterBottom>
                      {msg.sender.fullName}
                    </Typography>
                    <Typography>{msg.message}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                    </Typography>
                  </Paper>
                </Box>
              ))}
              <div ref={messagesEndRef} />
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
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
              <Button variant="contained" onClick={handleSendMessage}>
                Gửi
              </Button>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Thông tin đơn hàng
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Mã đơn: #{order.id}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Trạng thái:{' '}
              <Chip
                label={
                  order.status === 'pending_payment'
                    ? 'Chờ thanh toán'
                    : order.status === 'pending_address'
                    ? 'Chờ địa chỉ'
                    : order.status === 'pending_shipping'
                    ? 'Chờ gửi hàng'
                    : order.status === 'pending_delivery'
                    ? 'Chờ nhận hàng'
                    : order.status === 'completed'
                    ? 'Hoàn thành'
                    : 'Đã hủy'
                }
                color={
                  order.status === 'completed'
                    ? 'success'
                    : order.status === 'cancelled'
                    ? 'error'
                    : 'warning'
                }
                size="small"
              />
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Người bán: {order.seller.fullName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Người mua: {order.buyer.fullName}
            </Typography>
            <Typography variant="h6" sx={{ mt: 2 }}>
              Tổng tiền: {parseFloat(order.finalPrice.toString()).toLocaleString('vi-VN')} VNĐ
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onClose={() => setReviewDialogOpen(false)}>
        <DialogTitle>Đánh giá giao dịch</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography gutterBottom>Đánh giá:</Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Button
                variant={reviewRating === 1 ? 'contained' : 'outlined'}
                color="success"
                onClick={() => setReviewRating(1)}
              >
                +1 (Tích cực)
              </Button>
              <Button
                variant={reviewRating === -1 ? 'contained' : 'outlined'}
                color="error"
                onClick={() => setReviewRating(-1)}
              >
                -1 (Tiêu cực)
              </Button>
            </Box>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Nhận xét"
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewDialogOpen(false)}>Bỏ qua</Button>
          <Button onClick={handleSubmitReview} variant="contained">
            Gửi đánh giá
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
