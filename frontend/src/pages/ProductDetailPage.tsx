import { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Button,
  Grid,
  Paper,
  TextField,
  Card,
  CardMedia,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Checkbox,
  FormControlLabel,
  Alert,
} from '@mui/material';
import {
  Favorite,
  FavoriteBorder,
  Image as ImageIcon,
  Person,
  AccessTime,
  Gavel,
} from '@mui/icons-material';
import { useParams, useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { formatDistanceToNow, format } from 'date-fns';

interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  startingPrice: number;
  currentPrice: number;
  bidStep: number;
  buyNowPrice?: number;
  categoryId: number;
  sellerId: number;
  mainImage: string;
  images: string[];
  startDate: string;
  endDate: string;
  status: string;
  autoExtend: boolean;
  bidCount: number;
  viewCount: number;
  isNew: boolean;
  category: {
    id: number;
    name: string;
  };
  seller: {
    id: number;
    fullName: string;
    email: string;
    rating: number;
    totalRatings: number;
  };
  bids: Array<{
    bidder: {
      id: number;
      fullName: string;
    };
    amount: number;
  }>;
  questions: Array<{
    id: number;
    question: string;
    answer?: string;
    answeredAt?: string;
    user: {
      id: number;
      fullName: string;
    };
    createdAt: string;
  }>;
}

interface BidHistory {
  id: number;
  amount: number;
  createdAt: string;
  bidder: {
    fullName: string;
  };
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [bidHistory, setBidHistory] = useState<BidHistory[]>([]);
  const [bidAmount, setBidAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [isAutoBid, setIsAutoBid] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bidHistoryOpen, setBidHistoryOpen] = useState(false);
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [answerDialogOpen, setAnswerDialogOpen] = useState(false);
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [selectedImage, setSelectedImage] = useState(0);
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productRes, bidHistoryRes] = await Promise.all([
          apiClient.get(`/products/${id}`),
          apiClient.get(`/bids/history/${id}`),
        ]);

        const productData = productRes.data.data.product;
        setProduct(productData);
        setRelatedProducts(productRes.data.data.relatedProducts || []);
        setBidHistory(bidHistoryRes.data.data || []);

        // Calculate suggested bid
        if (productData.bids && productData.bids[0]) {
          const suggestedBid = parseFloat(productData.currentPrice.toString()) + parseFloat(productData.bidStep.toString());
          setBidAmount(suggestedBid.toString());
        } else {
          setBidAmount(productData.startingPrice.toString());
        }

        // Check if in watchlist
        if (user) {
          try {
            const watchlistRes = await apiClient.get('/users/watchlist');
            const inWatchlist = watchlistRes.data.data.some(
              (item: any) => item.product?.id === parseInt(id!)
            );
            setIsInWatchlist(inWatchlist);
          } catch (error) {
            // Not in watchlist
          }

          // Check if there's an order for this product
          try {
            const ordersRes = await apiClient.get('/orders');
            const productOrder = ordersRes.data.data.find(
              (o: any) => o.productId === parseInt(id!) && (o.sellerId === user.id || o.buyerId === user.id)
            );
            if (productOrder) {
              setOrder(productOrder);
            }
          } catch (error) {
            // No order
          }
        }
      } catch (error) {
        console.error('Error fetching product:', error);
        toast.error('Không thể tải thông tin sản phẩm');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, user]);

  const handlePlaceBid = async () => {
    if (!user) {
      toast.error('Vui lòng đăng nhập để đấu giá');
      navigate('/login');
      return;
    }

    if (!isAutoBid && !bidAmount) {
      toast.error('Vui lòng nhập số tiền đấu giá');
      return;
    }

    if (isAutoBid && !maxAmount) {
      toast.error('Vui lòng nhập giá tối đa');
      return;
    }

    try {
      await apiClient.post('/bids', {
        productId: id,
        amount: bidAmount,
        maxAmount: isAutoBid ? maxAmount : undefined,
        isAutoBid,
      });
      toast.success('Ra giá thành công');
      // Refresh data
      const [productRes, bidHistoryRes] = await Promise.all([
        apiClient.get(`/products/${id}`),
        apiClient.get(`/bids/history/${id}`),
      ]);
      setProduct(productRes.data.data.product);
      setBidHistory(bidHistoryRes.data.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Ra giá thất bại');
    }
  };

  const handleToggleWatchlist = async () => {
    if (!user) {
      toast.error('Vui lòng đăng nhập');
      navigate('/login');
      return;
    }

    try {
      if (isInWatchlist) {
        await apiClient.delete(`/users/watchlist/${id}`);
        toast.success('Đã xóa khỏi danh sách yêu thích');
      } else {
        await apiClient.post('/users/watchlist', { productId: id });
        toast.success('Đã thêm vào danh sách yêu thích');
      }
      setIsInWatchlist(!isInWatchlist);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Thao tác thất bại');
    }
  };

  const handleAskQuestion = async () => {
    if (!question.trim()) {
      toast.error('Vui lòng nhập câu hỏi');
      return;
    }

    try {
      await apiClient.post('/users/questions', {
        productId: id,
        question,
      });
      toast.success('Đã gửi câu hỏi');
      setQuestion('');
      setQuestionDialogOpen(false);
      // Refresh product
      const response = await apiClient.get(`/products/${id}`);
      setProduct(response.data.data.product);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Gửi câu hỏi thất bại');
    }
  };

  const handleAnswerQuestion = async () => {
    if (!answer.trim()) {
      toast.error('Vui lòng nhập câu trả lời');
      return;
    }

    try {
      await apiClient.put(`/users/questions/${selectedQuestionId}/answer`, {
        answer,
      });
      toast.success('Đã trả lời câu hỏi');
      setAnswer('');
      setAnswerDialogOpen(false);
      // Refresh product
      const response = await apiClient.get(`/products/${id}`);
      setProduct(response.data.data.product);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Trả lời thất bại');
    }
  };

  const handleRejectBid = async (bidId: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn từ chối lượt ra giá này?')) return;

    try {
      await apiClient.put(`/bids/${bidId}/reject`);
      toast.success('Đã từ chối lượt ra giá');
      // Refresh data
      const [productRes, bidHistoryRes] = await Promise.all([
        apiClient.get(`/products/${id}`),
        apiClient.get(`/bids/history/${id}`),
      ]);
      setProduct(productRes.data.data.product);
      setBidHistory(bidHistoryRes.data.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Từ chối thất bại');
    }
  };

  const getRatingPercentage = (rating: number, totalRatings: number) => {
    if (totalRatings === 0) return 0;
    return (rating / totalRatings) * 100;
  };

  const formatRelativeTime = (date: string) => {
    const endDate = new Date(date);
    const now = new Date();
    const diffMs = endDate.getTime() - now.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays < 3) {
      return formatDistanceToNow(endDate, { addSuffix: true });
    }
    return format(endDate, 'dd/MM/yyyy HH:mm');
  };

  if (loading) {
    return <Typography>Đang tải...</Typography>;
  }

  if (!product) {
    return <Typography>Sản phẩm không tồn tại</Typography>;
  }

  // If product ended and user is seller/buyer, show link to order page
  const shouldShowOrderLink = product.status === 'ended' && order && user && (user.id === order.sellerId || user.id === order.buyerId);

  const isSeller = user?.id === product.sellerId;
  const isEnded = product.status === 'ended' || new Date(product.endDate) <= new Date();
  const sellerRating = getRatingPercentage(product.seller.rating, product.seller.totalRatings);
  const highestBidder = product.bids && product.bids[0];
  const allImages = [product.mainImage, ...(product.images || [])];

  return (
    <Box>
      {/* Redirect to order page if ended */}
      {shouldShowOrderLink && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Đấu giá đã kết thúc. <Link to={`/orders/${order.id}`}>Hoàn tất đơn hàng</Link>
        </Alert>
      )}

      {product.status === 'ended' && !order && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Sản phẩm đã kết thúc đấu giá
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Left Column - Images and Description */}
        <Grid item xs={12} md={8}>
          {/* Image Gallery */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Box sx={{ mb: 2 }}>
              <img
                src={allImages[selectedImage] || product.mainImage}
                alt={product.name}
                style={{ width: '100%', maxHeight: 500, objectFit: 'contain' }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {allImages.map((img, idx) => (
                <Box
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  sx={{
                    width: 80,
                    height: 80,
                    border: selectedImage === idx ? 2 : 1,
                    borderColor: selectedImage === idx ? 'primary.main' : 'grey.300',
                    borderRadius: 1,
                    overflow: 'hidden',
                    cursor: 'pointer',
                  }}
                >
                  <img
                    src={img}
                    alt={`${product.name} ${idx + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </Box>
              ))}
            </Box>
          </Paper>

          {/* Product Info */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
              <Typography variant="h4">{product.name}</Typography>
              {product.isNew && (
                <Chip label="Mới" color="success" size="small" />
              )}
            </Box>

            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <Chip
                icon={<AccessTime />}
                label={`Kết thúc: ${formatRelativeTime(product.endDate)}`}
                color={isEnded ? 'error' : 'primary'}
              />
              <Chip icon={<Gavel />} label={`${product.bidCount} lượt đấu giá`} />
              <Chip label={`${product.viewCount} lượt xem`} />
            </Box>

            <Typography variant="h4" color="primary" gutterBottom>
              {parseFloat(product.currentPrice.toString()).toLocaleString('vi-VN')} VNĐ
            </Typography>

            {product.buyNowPrice && (
              <Typography variant="h6" color="secondary" gutterBottom>
                Giá mua ngay: {parseFloat(product.buyNowPrice.toString()).toLocaleString('vi-VN')} VNĐ
              </Typography>
            )}

            <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Thông tin đấu giá
              </Typography>
              <Typography variant="body2">Giá khởi điểm: {parseFloat(product.startingPrice.toString()).toLocaleString('vi-VN')} VNĐ</Typography>
              <Typography variant="body2">Bước giá: {parseFloat(product.bidStep.toString()).toLocaleString('vi-VN')} VNĐ</Typography>
              <Typography variant="body2">Ngày đăng: {format(new Date(product.startDate), 'dd/MM/yyyy HH:mm')}</Typography>
              {highestBidder && (
                <Typography variant="body2">
                  Người đặt giá cao nhất: {highestBidder.bidder.fullName}
                </Typography>
              )}
            </Box>

            {/* Seller Info */}
            <Box sx={{ mt: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                <Person sx={{ mr: 1, verticalAlign: 'middle' }} />
                Người bán: {product.seller.fullName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Điểm đánh giá: {sellerRating.toFixed(1)}% ({product.seller.rating}/{product.seller.totalRatings})
              </Typography>
            </Box>

            {/* Description */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Mô tả sản phẩm
              </Typography>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                {product.description}
              </Typography>
            </Box>

            {/* Questions & Answers */}
            <Box sx={{ mt: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Câu hỏi và trả lời</Typography>
                {user && !isSeller && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setQuestionDialogOpen(true)}
                  >
                    Đặt câu hỏi
                  </Button>
                )}
              </Box>
              {product.questions && product.questions.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {product.questions.map((q) => (
                    <Paper key={q.id} sx={{ p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        {q.user.fullName} hỏi:
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        {q.question}
                      </Typography>
                      {q.answer ? (
                        <>
                          <Typography variant="subtitle2" color="primary" gutterBottom>
                            Người bán trả lời:
                          </Typography>
                          <Typography variant="body2">{q.answer}</Typography>
                        </>
                      ) : isSeller ? (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            setSelectedQuestionId(q.id);
                            setAnswerDialogOpen(true);
                          }}
                        >
                          Trả lời
                        </Button>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Chưa có câu trả lời
                        </Typography>
                      )}
                    </Paper>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Chưa có câu hỏi nào
                </Typography>
              )}
            </Box>
          </Paper>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                5 sản phẩm khác cùng chuyên mục
              </Typography>
              <Grid container spacing={2}>
                {relatedProducts.map((p) => (
                  <Grid item xs={6} sm={4} md={3} key={p.id}>
                    <Card component={Link} to={`/products/${p.id}`} sx={{ textDecoration: 'none' }}>
                      <CardMedia
                        component="img"
                        height="140"
                        image={p.mainImage}
                        alt={p.name}
                      />
                      <CardContent>
                        <Typography variant="body2" noWrap>
                          {p.name}
                        </Typography>
                        <Typography variant="h6" color="primary">
                          {parseFloat(p.currentPrice.toString()).toLocaleString('vi-VN')} VNĐ
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          )}
        </Grid>

        {/* Right Column - Bidding */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, position: 'sticky', top: 20 }}>
            {!isEnded ? (
              <>
                {user ? (
                  <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">Đấu giá</Typography>
                      <IconButton onClick={handleToggleWatchlist} color={isInWatchlist ? 'error' : 'default'}>
                        {isInWatchlist ? <Favorite /> : <FavoriteBorder />}
                      </IconButton>
                    </Box>

                    {!isSeller && (
                      <>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={isAutoBid}
                              onChange={(e) => setIsAutoBid(e.target.checked)}
                            />
                          }
                          label="Đấu giá tự động"
                        />

                        {!isAutoBid ? (
                          <TextField
                            label="Số tiền đấu giá"
                            type="number"
                            fullWidth
                            value={bidAmount}
                            onChange={(e) => setBidAmount(e.target.value)}
                            margin="normal"
                            helperText={`Giá đề nghị: ${(parseFloat(product.currentPrice.toString()) + parseFloat(product.bidStep.toString())).toLocaleString('vi-VN')} VNĐ`}
                          />
                        ) : (
                          <>
                            <TextField
                              label="Giá tối đa"
                              type="number"
                              fullWidth
                              value={maxAmount}
                              onChange={(e) => setMaxAmount(e.target.value)}
                              margin="normal"
                            />
                            <Typography variant="caption" color="text.secondary">
                              Hệ thống sẽ tự động đấu giá cho bạn đến mức giá tối đa này
                            </Typography>
                          </>
                        )}

                        <Button
                          variant="contained"
                          fullWidth
                          onClick={handlePlaceBid}
                          sx={{ mt: 2 }}
                          disabled={!bidAmount && !isAutoBid}
                        >
                          {isAutoBid ? 'Đặt đấu giá tự động' : 'Ra giá'}
                        </Button>
                      </>
                    )}

                    {isSeller && (
                      <Alert severity="info">
                        Đây là sản phẩm của bạn. Bạn không thể đấu giá.
                      </Alert>
                    )}

                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => setBidHistoryOpen(true)}
                      sx={{ mt: 2 }}
                    >
                      Xem lịch sử đấu giá
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => navigate('/login')}
                  >
                    Đăng nhập để đấu giá
                  </Button>
                )}
              </>
            ) : (
              <Alert severity="warning">
                Đấu giá đã kết thúc
              </Alert>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Bid History Dialog */}
      <Dialog open={bidHistoryOpen} onClose={() => setBidHistoryOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Lịch sử đấu giá</DialogTitle>
        <DialogContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Thời điểm</TableCell>
                  <TableCell>Người mua</TableCell>
                  <TableCell>Giá</TableCell>
                  {isSeller && <TableCell>Thao tác</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {bidHistory.map((bid) => (
                  <TableRow key={bid.id}>
                    <TableCell>
                      {format(new Date(bid.createdAt), 'dd/MM/yyyy HH:mm')}
                    </TableCell>
                    <TableCell>{bid.bidder.fullName}</TableCell>
                    <TableCell>
                      {parseFloat(bid.amount.toString()).toLocaleString('vi-VN')} VNĐ
                    </TableCell>
                    {isSeller && (
                      <TableCell>
                        <Button
                          size="small"
                          color="error"
                          onClick={() => {
                            const bidToReject = bidHistory.find(b => b.id === bid.id);
                            if (bidToReject) {
                              // Need to get actual bid ID from backend
                              handleRejectBid(bid.id);
                            }
                          }}
                        >
                          Từ chối
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBidHistoryOpen(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>

      {/* Ask Question Dialog */}
      <Dialog open={questionDialogOpen} onClose={() => setQuestionDialogOpen(false)}>
        <DialogTitle>Đặt câu hỏi</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Câu hỏi"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQuestionDialogOpen(false)}>Hủy</Button>
          <Button onClick={handleAskQuestion} variant="contained">
            Gửi
          </Button>
        </DialogActions>
      </Dialog>

      {/* Answer Question Dialog */}
      <Dialog open={answerDialogOpen} onClose={() => setAnswerDialogOpen(false)}>
        <DialogTitle>Trả lời câu hỏi</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Câu trả lời"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAnswerDialogOpen(false)}>Hủy</Button>
          <Button onClick={handleAnswerQuestion} variant="contained">
            Gửi
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
