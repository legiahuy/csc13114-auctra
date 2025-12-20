import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  Tabs,
  Tab,
  IconButton,
  Alert,
  Stepper,
  Step,
  StepLabel,
} from "@mui/material";
import { Add, Delete, Edit, Image as ImageIcon } from "@mui/icons-material";
import { useFormik } from "formik";
import * as yup from "yup";
import apiClient from "../api/client";
import { useAuthStore } from "../store/authStore";
import toast from "react-hot-toast";
import { format } from "date-fns";

interface Category {
  id: number;
  name: string;
  parentId?: number;
}

interface Product {
  id: number;
  name: string;
  description: string;
  startingPrice: number;
  currentPrice: number;
  bidStep: number;
  buyNowPrice?: number;
  mainImage: string;
  images: string[];
  endDate: string;
  status: string;
  bidCount: number;
  category: {
    id: number;
    name: string;
  };
  bids: Array<{
    bidder: {
      id: number;
      fullName: string;
    };
    amount: number;
  }>;
}

interface Order {
  id: number;
  status: string;
  finalPrice: number;
  paymentMethod?: string;
  paymentProof?: string;
  shippingAddress?: string;
  shippingInvoice?: string;
  product: {
    id: number;
    name: string;
    mainImage: string;
  };
  buyer: {
    id: number;
    fullName: string;
  };
}

const orderSteps = [
  'Thanh toán',
  'Gửi địa chỉ',
  'Gửi hàng',
  'Nhận hàng',
];

const getOrderStepIndex = (status: string): number => {
  const statusSteps: Record<string, number> = {
    pending_payment: 0,
    pending_address: 1,
    pending_shipping: 2,
    pending_delivery: 3,
    completed: 4,
    cancelled: -1,
  };
  return statusSteps[status] ?? 0;
};

const validationSchema = yup.object({
  name: yup.string().required("Tên sản phẩm là bắt buộc"),
  description: yup.string().required("Mô tả là bắt buộc"),
  startingPrice: yup
    .number()
    .min(0, "Giá khởi điểm phải lớn hơn 0")
    .required("Giá khởi điểm là bắt buộc"),
  bidStep: yup
    .number()
    .min(0, "Bước giá phải lớn hơn 0")
    .required("Bước giá là bắt buộc"),
  buyNowPrice: yup.number().min(0).optional(),
  categoryId: yup.number().required("Danh mục là bắt buộc"),
  endDate: yup.string().required("Ngày kết thúc là bắt buộc"),
  autoExtend: yup.boolean(),
  allowUnratedBidders: yup.boolean(),
});

export default function SellerDashboardPage() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (user?.role !== "seller") {
      navigate("/");
      return;
    }
    // Kiểm tra upgradeExpireAt từ profile
    checkSellerStatus();
  }, [user, navigate]);

  const checkSellerStatus = async () => {
    try {
      const profileRes = await apiClient.get("/users/profile");
      const userData = profileRes.data.data;
      
      if (userData.role === "seller" && userData.upgradeExpireAt) {
        const expireDate = new Date(userData.upgradeExpireAt);
        const now = new Date();
        
        if (expireDate < now) {
          // Đã hết hạn
          setExpired(true);
          updateUser({ role: "bidder" });
          toast.error("Tài khoản seller của bạn đã hết thời hạn. Vui lòng yêu cầu nâng cấp lại.");
          setTimeout(() => {
            navigate("/profile");
          }, 2000);
          return;
        }
      }
      
      // Nếu chưa hết hạn, tiếp tục fetch data
      fetchData();
    } catch (error: any) {
      console.error("Error checking seller status:", error);
      // Nếu lỗi 403 với thông báo hết hạn
      if (error.response?.status === 403 && error.response?.data?.message?.includes("hết thời hạn")) {
        setExpired(true);
        updateUser({ role: "bidder" });
        toast.error(error.response.data.message || "Tài khoản seller của bạn đã hết thời hạn.");
        setTimeout(() => {
          navigate("/profile");
        }, 2000);
        return;
      }
      // Nếu không phải lỗi hết hạn, vẫn thử fetch data
      fetchData();
    }
  };

  const fetchData = async () => {
    try {
      const [categoriesRes, productsRes, ordersRes] = await Promise.all([
        apiClient.get("/categories"),
        apiClient.get("/products/seller/my-products"),
        apiClient.get("/products/seller/orders"),
      ]);

      setCategories(categoriesRes.data.data);
      setProducts(productsRes.data.data);
      setOrders(ordersRes.data.data);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      // Nếu lỗi 403 về seller expired
      if (error.response?.status === 403 && error.response?.data?.message?.includes("hết thời hạn")) {
        setExpired(true);
        updateUser({ role: "bidder" });
        toast.error(error.response.data.message || "Tài khoản seller của bạn đã hết thời hạn.");
        setTimeout(() => {
          navigate("/profile");
        }, 2000);
      } else {
        toast.error("Không thể tải dữ liệu");
      }
    } finally {
      setLoading(false);
    }
  };

  // Setup Socket.IO để nhận cập nhật real-time
  useEffect(() => {
    if (!user || user.role !== "seller" || expired) return;

    const newSocket = io("http://localhost:3000");

    newSocket.on("connect", () => {
      // Join vào room của user để nhận thông báo order-list-updated
      newSocket.emit("join-room", `user-${user.id}`);
    });

    // Listen cho order-list-updated event
    newSocket.on("order-list-updated", () => {
      // Refresh orders list khi có cập nhật
      apiClient
        .get("/products/seller/orders")
        .then((res) => {
          setOrders(res.data.data);
        })
        .catch((error) => {
          console.error("Error refreshing orders:", error);
        });
    });

    // Listen cho order-updated event (cập nhật order cụ thể)
    newSocket.on("order-updated", (updatedOrder: Order) => {
      setOrders((prevOrders) => {
        const index = prevOrders.findIndex((o) => o.id === updatedOrder.id);
        if (index !== -1) {
          const newOrders = [...prevOrders];
          newOrders[index] = updatedOrder;
          return newOrders;
        }
        return prevOrders;
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user, expired]);

  // Join vào order rooms khi orders thay đổi
  useEffect(() => {
    if (!socket || !socket.connected || !orders.length) return;

    orders.forEach((order) => {
      socket.emit("join-room", `order-${order.id}`);
    });
  }, [socket, orders]);

  const formik = useFormik({
    initialValues: {
      name: "",
      description: "",
      startingPrice: "",
      bidStep: "",
      buyNowPrice: "",
      categoryId: "",
      endDate: "",
      autoExtend: false,
      allowUnratedBidders: true,
    },
    validationSchema,
    onSubmit: async (values) => {
      if (selectedImages.length < 3) {
        toast.error("Vui lòng upload ít nhất 3 ảnh");
        return;
      }

      try {
        // Upload images first
        const imageUrls: string[] = [];
        for (const image of selectedImages) {
          const uploadFormData = new FormData();
          uploadFormData.append("file", image);
          const uploadRes = await apiClient.post("/upload", uploadFormData, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          });
          imageUrls.push(uploadRes.data.data.url);
        }

        // Create product with image URLs
        await apiClient.post("/products", {
          name: values.name,
          description: values.description,
          startingPrice: parseFloat(values.startingPrice),
          bidStep: parseFloat(values.bidStep),
          buyNowPrice: values.buyNowPrice
            ? parseFloat(values.buyNowPrice)
            : undefined,
          categoryId: parseInt(values.categoryId),
          mainImage: imageUrls[0],
          images: imageUrls.slice(1),
          endDate: values.endDate,
          autoExtend: values.autoExtend,
          allowUnratedBidders: values.allowUnratedBidders,
        });

        toast.success("Đăng sản phẩm thành công");
        setCreateDialogOpen(false);
        formik.resetForm();
        setSelectedImages([]);
        setImagePreviews([]);
        fetchData();
      } catch (error: any) {
        toast.error(
          error.response?.data?.error?.message || "Đăng sản phẩm thất bại"
        );
      }
    },
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + selectedImages.length > 10) {
      toast.error("Tối đa 10 ảnh");
      return;
    }

    const newImages = [...selectedImages, ...files];
    setSelectedImages(newImages);

    const newPreviews = newImages.map((file) => URL.createObjectURL(file));
    setImagePreviews(newPreviews);
  };

  const handleRemoveImage = (index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setSelectedImages(newImages);
    setImagePreviews(newPreviews);
  };

  const activeProducts = products.filter(
    (p) => p.status === "active" && new Date(p.endDate) > new Date()
  );
  const endedProducts = products.filter(
    (p) => p.status === "ended" || new Date(p.endDate) <= new Date()
  );

  if (loading) {
    return <Typography>Đang tải...</Typography>;
  }

  if (expired) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Tài khoản seller đã hết thời hạn
          </Typography>
          <Typography>
            Tài khoản seller của bạn đã hết thời hạn. Bạn không thể truy cập dashboard với tư cách seller nữa.
            Vui lòng yêu cầu nâng cấp lại trong trang Profile.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            sx={{ mt: 2 }}
            onClick={() => navigate("/profile")}
          >
            Đi đến trang Profile
          </Button>
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4">Dashboard người bán</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Đăng sản phẩm mới
        </Button>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label={`Sản phẩm đang đăng (${activeProducts.length})`} />
          <Tab label={`Sản phẩm đã kết thúc (${endedProducts.length})`} />
          <Tab label={`Đơn hàng (${orders.length})`} />
        </Tabs>

        {/* Active Products Tab */}
        {activeTab === 0 && (
          <Box sx={{ p: 3 }}>
            {activeProducts.length === 0 ? (
              <Alert severity="info">Chưa có sản phẩm nào đang đăng</Alert>
            ) : (
              <Grid container spacing={2}>
                {activeProducts.map((product) => (
                  <Grid item xs={12} sm={6} md={4} key={product.id}>
                    <Card>
                      <CardMedia
                        component="img"
                        height="200"
                        image={product.mainImage}
                        alt={product.name}
                      />
                      <CardContent>
                        <Typography variant="h6" noWrap>
                          {product.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {product.category.name}
                        </Typography>
                        <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
                          {parseFloat(
                            product.currentPrice.toString()
                          ).toLocaleString("vi-VN")}{" "}
                          VNĐ
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {product.bidCount} lượt đấu giá
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Kết thúc:{" "}
                          {format(
                            new Date(product.endDate),
                            "dd/MM/yyyy HH:mm"
                          )}
                        </Typography>
                        {product.bids && product.bids[0] && (
                          <Typography variant="body2" color="text.secondary">
                            Người đặt giá cao nhất:{" "}
                            {product.bids[0].bidder.fullName}
                          </Typography>
                        )}
                      </CardContent>
                      <CardActions>
                        <Button
                          size="small"
                          onClick={() => navigate(`/products/${product.id}`)}
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

        {/* Ended Products Tab */}
        {activeTab === 1 && (
          <Box sx={{ p: 3 }}>
            {endedProducts.length === 0 ? (
              <Alert severity="info">Chưa có sản phẩm nào đã kết thúc</Alert>
            ) : (
              <Grid container spacing={2}>
                {endedProducts.map((product) => (
                  <Grid item xs={12} sm={6} md={4} key={product.id}>
                    <Card>
                      <CardMedia
                        component="img"
                        height="200"
                        image={product.mainImage}
                        alt={product.name}
                      />
                      <CardContent>
                        <Typography variant="h6" noWrap>
                          {product.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {product.category.name}
                        </Typography>
                        <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
                          {parseFloat(
                            product.currentPrice.toString()
                          ).toLocaleString("vi-VN")}{" "}
                          VNĐ
                        </Typography>
                        <Chip
                          label={
                            product.status === "ended"
                              ? "Đã kết thúc"
                              : "Đã hết hạn"
                          }
                          color="error"
                          size="small"
                          sx={{ mt: 1 }}
                        />
                        {product.bids && product.bids[0] && (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mt: 1 }}
                          >
                            Người thắng: {product.bids[0].bidder.fullName}
                          </Typography>
                        )}
                      </CardContent>
                      <CardActions>
                        <Button
                          size="small"
                          onClick={() => navigate(`/products/${product.id}`)}
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

        {/* Orders Tab */}
        {activeTab === 2 && (
          <Box sx={{ p: 3 }}>
            {orders.length === 0 ? (
              <Alert severity="info">Chưa có đơn hàng nào</Alert>
            ) : (
              <Grid container spacing={2}>
                {orders.map((order) => {
                  const currentStep = getOrderStepIndex(order.status);
                  const isCompleted = order.status === "completed";
                  const isCancelled = order.status === "cancelled";
                  
                  return (
                    <Grid item xs={12} key={order.id}>
                      <Card>
                        <CardContent>
                          <Box sx={{ display: "flex", gap: 2 }}>
                            <CardMedia
                              component="img"
                              sx={{ width: 100, height: 100, objectFit: "cover" }}
                              image={order.product.mainImage}
                              alt={order.product.name}
                            />
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="h6">
                                {order.product.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Người mua: {order.buyer.fullName}
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
                              
                              {/* Hiển thị Stepper cho các bước */}
                              {!isCancelled && (
                                <Box sx={{ mt: 2, mb: 1 }}>
                                  <Stepper 
                                    activeStep={isCompleted ? orderSteps.length : currentStep} 
                                    alternativeLabel
                                  >
                                    {orderSteps.map((label, index) => {
                                      const isStepCompleted = isCompleted || index < currentStep;
                                      const isStepActive = !isCompleted && index === currentStep;
                                      
                                      return (
                                        <Step key={label} completed={isStepCompleted}>
                                          <StepLabel
                                            StepIconProps={{
                                              sx: {
                                                "&.Mui-completed": {
                                                  color: "success.main",
                                                },
                                                "&.Mui-active": {
                                                  color: "primary.main",
                                                },
                                              },
                                            }}
                                          >
                                            <Typography variant="caption">
                                              {label}
                                            </Typography>
                                          </StepLabel>
                                        </Step>
                                      );
                                    })}
                                  </Stepper>
                                </Box>
                              )}
                              
                              <Chip
                                label={
                                  order.status === "pending_payment"
                                    ? "Chờ thanh toán"
                                    : order.status === "pending_address"
                                    ? "Chờ địa chỉ"
                                    : order.status === "pending_shipping"
                                    ? "Chờ gửi hàng"
                                    : order.status === "pending_delivery"
                                    ? "Chờ nhận hàng"
                                    : order.status === "completed"
                                    ? "Hoàn thành"
                                    : "Đã hủy"
                                }
                                color={
                                  isCompleted
                                    ? "success"
                                    : isCancelled
                                    ? "error"
                                    : "warning"
                                }
                                size="small"
                                sx={{ mt: 1 }}
                              />
                              
                              {/* Hiển thị thông tin chi tiết về các bước đã hoàn thành dựa trên status */}
                              {currentStep > 0 && (
                                <Typography variant="caption" color="success.main" display="block" sx={{ mt: 0.5 }}>
                                  ✓ Đã thanh toán
                                </Typography>
                              )}
                              {currentStep > 1 && (
                                <Typography variant="caption" color="success.main" display="block" sx={{ mt: 0.5 }}>
                                  ✓ Đã gửi địa chỉ
                                </Typography>
                              )}
                              {currentStep > 2 && (
                                <Typography variant="caption" color="success.main" display="block" sx={{ mt: 0.5 }}>
                                  ✓ Đã gửi hàng
                                </Typography>
                              )}
                              {isCompleted && (
                                <Typography variant="caption" color="success.main" display="block" sx={{ mt: 0.5 }}>
                                  ✓ Đã nhận hàng
                                </Typography>
                              )}
                            </Box>
                          </Box>
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
                  );
                })}
              </Grid>
            )}
          </Box>
        )}
      </Paper>

      {/* Create Product Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <form onSubmit={formik.handleSubmit}>
          <DialogTitle>Đăng sản phẩm mới</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Tên sản phẩm"
              name="name"
              value={formik.values.name}
              onChange={formik.handleChange}
              error={formik.touched.name && Boolean(formik.errors.name)}
              helperText={formik.touched.name && formik.errors.name}
              margin="normal"
              required
            />

            <FormControl fullWidth margin="normal" required>
              <InputLabel>Danh mục</InputLabel>
              <Select
                name="categoryId"
                value={formik.values.categoryId}
                onChange={formik.handleChange}
                label="Danh mục"
              >
                {categories
                  .filter((c) => !c.parentId)
                  .map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Mô tả sản phẩm"
              name="description"
              multiline
              rows={6}
              value={formik.values.description}
              onChange={formik.handleChange}
              error={
                formik.touched.description && Boolean(formik.errors.description)
              }
              helperText={
                formik.touched.description && formik.errors.description
              }
              margin="normal"
              required
            />

            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Giá khởi điểm (VNĐ)"
                  name="startingPrice"
                  type="number"
                  value={formik.values.startingPrice}
                  onChange={formik.handleChange}
                  error={
                    formik.touched.startingPrice &&
                    Boolean(formik.errors.startingPrice)
                  }
                  helperText={
                    formik.touched.startingPrice && formik.errors.startingPrice
                  }
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Bước giá (VNĐ)"
                  name="bidStep"
                  type="number"
                  value={formik.values.bidStep}
                  onChange={formik.handleChange}
                  error={
                    formik.touched.bidStep && Boolean(formik.errors.bidStep)
                  }
                  helperText={formik.touched.bidStep && formik.errors.bidStep}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Giá mua ngay (VNĐ) - Tùy chọn"
                  name="buyNowPrice"
                  type="number"
                  value={formik.values.buyNowPrice}
                  onChange={formik.handleChange}
                  error={
                    formik.touched.buyNowPrice &&
                    Boolean(formik.errors.buyNowPrice)
                  }
                  helperText={
                    formik.touched.buyNowPrice && formik.errors.buyNowPrice
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Ngày kết thúc"
                  name="endDate"
                  type="datetime-local"
                  value={formik.values.endDate}
                  onChange={formik.handleChange}
                  error={
                    formik.touched.endDate && Boolean(formik.errors.endDate)
                  }
                  helperText={formik.touched.endDate && formik.errors.endDate}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 2 }}>
              <input
                accept="image/*"
                style={{ display: "none" }}
                id="image-upload"
                type="file"
                multiple
                onChange={handleImageSelect}
              />
              <label htmlFor="image-upload">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<ImageIcon />}
                >
                  Upload ảnh (tối thiểu 3 ảnh)
                </Button>
              </label>
              {imagePreviews.length > 0 && (
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 2 }}>
                  {imagePreviews.map((preview, index) => (
                    <Box key={index} sx={{ position: "relative" }}>
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        style={{
                          width: 100,
                          height: 100,
                          objectFit: "cover",
                          borderRadius: 4,
                        }}
                      />
                      <IconButton
                        size="small"
                        sx={{
                          position: "absolute",
                          top: 0,
                          right: 0,
                          bgcolor: "white",
                        }}
                        onClick={() => handleRemoveImage(index)}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              )}
              {selectedImages.length < 3 && (
                <Typography
                  variant="caption"
                  color="error"
                  display="block"
                  sx={{ mt: 1 }}
                >
                  Cần ít nhất 3 ảnh (đã chọn: {selectedImages.length})
                </Typography>
              )}
            </Box>

            <Box sx={{ mt: 2 }}>
              <input
                type="checkbox"
                id="autoExtend"
                checked={formik.values.autoExtend}
                onChange={(e) => formik.setFieldValue("autoExtend", e.target.checked)}
                name="autoExtend"
              />
              <label htmlFor="autoExtend" style={{ marginLeft: 8 }}>
                Tự động gia hạn nếu có đấu giá trong 3 phút cuối
              </label>
            </Box>

            <Box sx={{ mt: 1 }}>
              <input
                type="checkbox"
                id="allowUnratedBidders"
                checked={formik.values.allowUnratedBidders}
                onChange={(e) => formik.setFieldValue("allowUnratedBidders", e.target.checked)}
                name="allowUnratedBidders"
              />
              <label htmlFor="allowUnratedBidders" style={{ marginLeft: 8 }}>
                Cho phép người chưa từng được đánh giá tham gia đấu giá
              </label>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>Hủy</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={selectedImages.length < 3}
            >
              Đăng sản phẩm
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
