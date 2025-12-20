import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Chip,
  Alert,
} from "@mui/material";
import { useFormik } from "formik";
import * as yup from "yup";
import apiClient from "../api/client";
import { useAuthStore } from "../store/authStore";
import toast from "react-hot-toast";
import { format } from "date-fns";

interface User {
  id: number;
  email: string;
  fullName: string;
  dateOfBirth?: string;
  address?: string;
  rating: number;
  totalRatings: number;
  role: string;
   upgradeRequestStatus?: 'pending' | 'approved' | 'rejected' | null;
   upgradeExpireAt?: string | null;
}

interface Review {
  id: number;
  rating: number;
  comment: string;
  reviewer: {
    id: number;
    fullName: string;
  };
  createdAt: string;
}

interface WatchlistItem {
  id: number;
  product: {
    id: number;
    name: string;
    mainImage: string;
    currentPrice: number;
    endDate: string;
    status: string;
  };
}

interface Bid {
  id: number;
  amount: number;
  product: {
    id: number;
    name: string;
    mainImage: string;
    currentPrice: number;
    endDate: string;
    status: string;
  };
  createdAt: string;
}

interface WonProduct {
  id: number;
  finalPrice: number;
  status: string;
  product: {
    id: number;
    name: string;
    mainImage: string;
  };
}

const profileSchema = yup.object({
  fullName: yup.string().required("Họ tên là bắt buộc"),
  email: yup.string().email("Email không hợp lệ").required("Email là bắt buộc"),
  dateOfBirth: yup.string().optional(),
  address: yup.string().optional(),
});

const passwordSchema = yup.object({
  oldPassword: yup.string().required("Mật khẩu cũ là bắt buộc"),
  newPassword: yup
    .string()
    .min(6, "Mật khẩu phải có ít nhất 6 ký tự")
    .required("Mật khẩu mới là bắt buộc"),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref("newPassword")], "Mật khẩu xác nhận không khớp")
    .required("Xác nhận mật khẩu là bắt buộc"),
});

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user: authUser } = useAuthStore();
  const [user, setUser] = useState<User | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [wonProducts, setWonProducts] = useState<WonProduct[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const reviewsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!authUser) {
      navigate("/login");
      return;
    }
    fetchData();
  }, [authUser, navigate]);

  const fetchData = async () => {
    try {
      const [profileRes, reviewsRes, watchlistRes, bidsRes, wonRes] =
        await Promise.all([
          apiClient.get("/users/profile"),
          apiClient.get("/users/reviews"),
          apiClient.get("/users/watchlist"),
          apiClient.get("/users/bids"),
          apiClient.get("/users/won"),
        ]);

      setUser(profileRes.data.data);
      setReviews(reviewsRes.data.data || []);
      setWatchlist(watchlistRes.data.data || []);
      setBids(bidsRes.data.data || []);
      setWonProducts(wonRes.data.data || []);
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Không thể tải thông tin");
    } finally {
      setLoading(false);
    }
  };

  const profileFormik = useFormik({
    initialValues: {
      fullName: user?.fullName || "",
      email: user?.email || "",
      dateOfBirth: user?.dateOfBirth
        ? format(new Date(user.dateOfBirth), "yyyy-MM-dd")
        : "",
      address: user?.address || "",
    },
    enableReinitialize: true,
    validationSchema: profileSchema,
    onSubmit: async (values) => {
      try {
        await apiClient.put("/users/profile", values);
        toast.success("Cập nhật thông tin thành công");
        fetchData();
      } catch (error: any) {
        toast.error(
          error.response?.data?.error?.message || "Cập nhật thất bại"
        );
      }
    },
  });

  const passwordFormik = useFormik({
    initialValues: {
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    validationSchema: passwordSchema,
    onSubmit: async (values) => {
      try {
        await apiClient.put("/users/password", {
          oldPassword: values.oldPassword,
          newPassword: values.newPassword,
        });
        toast.success("Đổi mật khẩu thành công");
        setPasswordDialogOpen(false);
        passwordFormik.resetForm();
      } catch (error: any) {
        toast.error(
          error.response?.data?.error?.message || "Đổi mật khẩu thất bại"
        );
      }
    },
  });

  const getRatingPercentage = (rating: number, totalRatings: number) => {
    if (totalRatings === 0) return 0;
    return (rating / totalRatings) * 100;
  };

  if (loading) {
    return <Typography>Đang tải...</Typography>;
  }

  if (!user) {
    return <Typography>Không tìm thấy thông tin người dùng</Typography>;
  }

  const ratingPercentage = getRatingPercentage(user.rating, user.totalRatings);
  const positiveCount = user.rating;
  const negativeCount = Math.max(user.totalRatings - user.rating, 0);
  const mockReviews: Review[] = [
    {
      id: -1,
      rating: 1,
      comment: "Giao dịch nhanh chóng, hàng đúng mô tả.",
      reviewer: { id: -1, fullName: "Nguyễn Văn A" },
      createdAt: new Date().toISOString(),
    },
    {
      id: -2,
      rating: -1,
      comment: "Giao hàng chậm hơn dự kiến, nhưng người bán vẫn hỗ trợ.",
      reviewer: { id: -2, fullName: "Trần Thị B" },
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Trang cá nhân
      </Typography>

      <Grid container spacing={3}>
        {/* Left Column - Profile Info */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Thông tin cá nhân
            </Typography>

            <form onSubmit={profileFormik.handleSubmit}>
              <TextField
                fullWidth
                label="Họ tên"
                name="fullName"
                value={profileFormik.values.fullName}
                onChange={profileFormik.handleChange}
                error={
                  profileFormik.touched.fullName &&
                  Boolean(profileFormik.errors.fullName)
                }
                helperText={
                  profileFormik.touched.fullName &&
                  profileFormik.errors.fullName
                }
                margin="normal"
              />

              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={profileFormik.values.email}
                onChange={profileFormik.handleChange}
                error={
                  profileFormik.touched.email &&
                  Boolean(profileFormik.errors.email)
                }
                helperText={
                  profileFormik.touched.email && profileFormik.errors.email
                }
                margin="normal"
              />

              <TextField
                fullWidth
                label="Ngày sinh"
                name="dateOfBirth"
                type="date"
                value={profileFormik.values.dateOfBirth}
                onChange={profileFormik.handleChange}
                error={
                  profileFormik.touched.dateOfBirth &&
                  Boolean(profileFormik.errors.dateOfBirth)
                }
                helperText={
                  profileFormik.touched.dateOfBirth &&
                  profileFormik.errors.dateOfBirth
                }
                margin="normal"
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                fullWidth
                label="Địa chỉ"
                name="address"
                multiline
                rows={3}
                value={profileFormik.values.address}
                onChange={profileFormik.handleChange}
                error={
                  profileFormik.touched.address &&
                  Boolean(profileFormik.errors.address)
                }
                helperText={
                  profileFormik.touched.address && profileFormik.errors.address
                }
                margin="normal"
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                sx={{ mt: 2 }}
              >
                Cập nhật thông tin
              </Button>
            </form>

            <Button
              variant="outlined"
              fullWidth
              sx={{ mt: 2 }}
              onClick={() => setPasswordDialogOpen(true)}
            >
              Đổi mật khẩu
            </Button>

            <Box sx={{ mt: 3, p: 2, bgcolor: "grey.100", borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Điểm đánh giá
              </Typography>
              <Typography variant="h4" color="primary">
                {ratingPercentage.toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tổng: {user.totalRatings} lượt đánh giá
              </Typography>
              <Typography variant="body2" color="text.secondary">
                + {positiveCount} đánh giá tích cực
              </Typography>
              <Typography variant="body2" color="text.secondary">
                - {negativeCount} đánh giá tiêu cực
              </Typography>
            </Box>

            <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Chip
                label={
                  user.role === "admin"
                    ? "Quản trị viên"
                    : user.role === "seller"
                    ? "Người bán"
                    : "Người đấu giá"
                }
              />

              {user.role === "bidder" && (
                <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Nâng cấp thành người bán
                  </Typography>
                  {user.upgradeRequestStatus === "pending" && (
                    <Alert severity="info" sx={{ mb: 1 }}>
                      Yêu cầu nâng cấp đang được xét duyệt.
                    </Alert>
                  )}
                  {user.upgradeRequestStatus === "approved" && user.upgradeExpireAt && (
                    <Alert severity="success" sx={{ mb: 1 }}>
                      Bạn đang có quyền bán đến{" "}
                      {format(new Date(user.upgradeExpireAt), "dd/MM/yyyy HH:mm")}.
                    </Alert>
                  )}
                  {user.upgradeRequestStatus === "rejected" && (
                    <Alert severity="warning" sx={{ mb: 1 }}>
                      Yêu cầu nâng cấp trước đó đã bị từ chối. Bạn có thể yêu cầu lại ngay.
                    </Alert>
                  )}
                  {/* Kiểm tra nếu đã hết hạn seller (upgradeExpireAt đã qua) */}
                  {user.upgradeExpireAt && new Date(user.upgradeExpireAt) < new Date() && (
                    <Alert severity="warning" sx={{ mb: 1 }}>
                      Quyền seller của bạn đã hết hạn. Bạn có thể yêu cầu nâng cấp lại ngay.
                    </Alert>
                  )}
                  <Button
                    variant="outlined"
                    size="small"
                    disabled={user.upgradeRequestStatus === "pending"}
                    onClick={async () => {
                      try {
                        await apiClient.post("/users/upgrade-request", {});
                        toast.success("Đã gửi yêu cầu nâng cấp. Vui lòng chờ admin xét duyệt.");
                        fetchData();
                      } catch (error: any) {
                        toast.error(
                          error.response?.data?.error?.message ||
                            "Gửi yêu cầu nâng cấp thất bại"
                        );
                      }
                    }}
                  >
                    {user.upgradeRequestStatus === "pending"
                      ? "Đã gửi yêu cầu"
                      : "Xin nâng cấp thành người bán"}
                  </Button>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Right Column - Tabs */}
        <Grid item xs={12} md={8}>
          <Paper>
            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
              <Tab label={`Đánh giá (${reviews.length})`} />
              <Tab label={`Yêu thích (${watchlist.length})`} />
              <Tab label={`Lịch sử đấu giá (${bids.length})`} />
              <Tab label={`Sản phẩm đã thắng (${wonProducts.length})`} />
            </Tabs>

            {/* Reviews Tab */}
            {activeTab === 0 && (
              <Box sx={{ p: 3 }} ref={reviewsRef}>
                {reviews.length === 0 && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Chưa có đánh giá nào. Hiển thị dữ liệu mẫu bên dưới.
                  </Alert>
                )}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {(reviews.length ? reviews : mockReviews).map((review) => (
                    <Card key={review.id} variant="outlined">
                      <CardContent>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "start",
                          }}
                        >
                          <Box>
                            <Typography variant="subtitle1">
                              {review.reviewer.fullName}
                            </Typography>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                mt: 1,
                              }}
                            >
                              {review.rating === 1 ? (
                                <Chip label="+1" color="success" size="small" />
                              ) : (
                                <Chip label="-1" color="error" size="small" />
                              )}
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {format(
                                  new Date(review.createdAt),
                                  "dd/MM/yyyy HH:mm"
                                )}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                        {review.comment && (
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            {review.comment}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </Box>
            )}

            {/* Watchlist Tab */}
            {activeTab === 1 && (
              <Box sx={{ p: 3 }}>
                {watchlist.length === 0 ? (
                  <Alert severity="info">Chưa có sản phẩm yêu thích nào</Alert>
                ) : (
                  <Grid container spacing={2}>
                    {watchlist.map((item) => (
                      <Grid item xs={12} sm={6} md={4} key={item.id}>
                        <Card>
                          <CardMedia
                            component="img"
                            height="200"
                            image={item.product.mainImage}
                            alt={item.product.name}
                          />
                          <CardContent>
                            <Typography variant="h6" noWrap>
                              {item.product.name}
                            </Typography>
                            <Typography
                              variant="h6"
                              color="primary"
                              sx={{ mt: 1 }}
                            >
                              {parseFloat(
                                item.product.currentPrice.toString()
                              ).toLocaleString("vi-VN")}{" "}
                              VNĐ
                            </Typography>
                          </CardContent>
                          <CardActions>
                            <Button
                              size="small"
                              onClick={() =>
                                navigate(`/products/${item.product.id}`)
                              }
                            >
                              Xem chi tiết
                            </Button>
                          </CardActions>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Box>
            )}

            {/* Bids Tab */}
            {activeTab === 2 && (
              <Box sx={{ p: 3 }}>
                {bids.length === 0 ? (
                  <Alert severity="info">Chưa có lượt đấu giá nào</Alert>
                ) : (
                  <Grid container spacing={2}>
                    {bids.map((bid) => (
                      <Grid item xs={12} sm={6} md={4} key={bid.id}>
                        <Card>
                          <CardMedia
                            component="img"
                            height="200"
                            image={bid.product.mainImage}
                            alt={bid.product.name}
                          />
                          <CardContent>
                            <Typography variant="h6" noWrap>
                              {bid.product.name}
                            </Typography>
                            <Typography
                              variant="h6"
                              color="primary"
                              sx={{ mt: 1 }}
                            >
                              {parseFloat(bid.amount.toString()).toLocaleString(
                                "vi-VN"
                              )}{" "}
                              VNĐ
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {format(
                                new Date(bid.createdAt),
                                "dd/MM/yyyy HH:mm"
                              )}
                            </Typography>
                            <Chip
                              label={
                                bid.product.status === "active"
                                  ? "Đang đấu giá"
                                  : "Đã kết thúc"
                              }
                              color={
                                bid.product.status === "active"
                                  ? "success"
                                  : "default"
                              }
                              size="small"
                              sx={{ mt: 1 }}
                            />
                          </CardContent>
                          <CardActions>
                            <Button
                              size="small"
                              onClick={() =>
                                navigate(`/products/${bid.product.id}`)
                              }
                            >
                              Xem chi tiết
                            </Button>
                          </CardActions>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Box>
            )}

            {/* Won Products Tab */}
            {activeTab === 3 && (
              <Box sx={{ p: 3 }}>
                {wonProducts.length === 0 ? (
                  <Alert severity="info">Chưa có sản phẩm nào đã thắng</Alert>
                ) : (
                  <Grid container spacing={2}>
                    {wonProducts.map((order) => (
                      <Grid item xs={12} sm={6} md={4} key={order.id}>
                        <Card>
                          <CardMedia
                            component="img"
                            height="200"
                            image={order.product.mainImage}
                            alt={order.product.name}
                          />
                          <CardContent>
                            <Typography variant="h6" noWrap>
                              {order.product.name}
                            </Typography>
                            <Typography
                              variant="h6"
                              color="primary"
                              sx={{ mt: 1 }}
                            >
                              {parseFloat(
                                order.finalPrice.toString()
                              ).toLocaleString("vi-VN")}{" "}
                              VNĐ
                            </Typography>
                            <Chip
                              label={
                                order.status === "pending_payment"
                                  ? "Chờ thanh toán"
                                  : order.status === "pending_address"
                                  ? "Chờ địa chỉ"
                                  : order.status === "pending_shipping" ||
                                    order.status === "pending_delivery"
                                  ? "Đang giao hàng"
                                  : order.status === "completed"
                                  ? "Hoàn thành"
                                  : "Đã hủy"
                              }
                              color={
                                order.status === "completed"
                                  ? "success"
                                  : order.status === "cancelled"
                                  ? "error"
                                  : order.status === "pending_shipping" ||
                                    order.status === "pending_delivery"
                                  ? "info"
                                  : "warning"
                              }
                              size="small"
                              sx={{ mt: 1 }}
                            />
                          </CardContent>
                          <CardActions>
                            <Button
                              size="small"
                              onClick={() => navigate(`/orders/${order.id}`)}
                            >
                              Xem đơn hàng
                            </Button>
                          </CardActions>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Change Password Dialog */}
      <Dialog
        open={passwordDialogOpen}
        onClose={() => setPasswordDialogOpen(false)}
      >
        <form onSubmit={passwordFormik.handleSubmit}>
          <DialogTitle>Đổi mật khẩu</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Mật khẩu cũ"
              name="oldPassword"
              type="password"
              value={passwordFormik.values.oldPassword}
              onChange={passwordFormik.handleChange}
              error={
                passwordFormik.touched.oldPassword &&
                Boolean(passwordFormik.errors.oldPassword)
              }
              helperText={
                passwordFormik.touched.oldPassword &&
                passwordFormik.errors.oldPassword
              }
              margin="normal"
            />
            <TextField
              fullWidth
              label="Mật khẩu mới"
              name="newPassword"
              type="password"
              value={passwordFormik.values.newPassword}
              onChange={passwordFormik.handleChange}
              error={
                passwordFormik.touched.newPassword &&
                Boolean(passwordFormik.errors.newPassword)
              }
              helperText={
                passwordFormik.touched.newPassword &&
                passwordFormik.errors.newPassword
              }
              margin="normal"
            />
            <TextField
              fullWidth
              label="Xác nhận mật khẩu"
              name="confirmPassword"
              type="password"
              value={passwordFormik.values.confirmPassword}
              onChange={passwordFormik.handleChange}
              error={
                passwordFormik.touched.confirmPassword &&
                Boolean(passwordFormik.errors.confirmPassword)
              }
              helperText={
                passwordFormik.touched.confirmPassword &&
                passwordFormik.errors.confirmPassword
              }
              margin="normal"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPasswordDialogOpen(false)}>Hủy</Button>
            <Button type="submit" variant="contained">
              Đổi mật khẩu
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
