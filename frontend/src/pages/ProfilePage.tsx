import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { format } from "date-fns";
import {
  AlertCircle,
  User,
  Star,
  Heart,
  Gavel,
  Trophy,
  Edit,
  Lock,
} from "lucide-react";
import { useFormik } from "formik";
import * as yup from "yup";
import apiClient from "../api/client";
import { useAuthStore } from "../store/authStore";
import toast from "react-hot-toast";
import Loading from "@/components/Loading";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

interface User {
  id: number;
  email: string;
  fullName: string;
  dateOfBirth?: string;
  address?: string;
  rating: number;
  totalRatings: number;
  role: string;
  upgradeRequestStatus?: "pending" | "approved" | "rejected" | null;
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
  const [activeTab, setActiveTab] = useState("reviews");
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
    return <Loading />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex items-center gap-2 text-muted-foreground">
          <AlertCircle className="h-5 w-5" />
          <span>Không tìm thấy thông tin người dùng</span>
        </div>
      </div>
    );
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-white mb-2">
          Trang cá nhân
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        {/* Left Column - Profile Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Thông tin cá nhân
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={profileFormik.handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Họ tên</label>
                  <Input
                    name="fullName"
                    value={profileFormik.values.fullName}
                    onChange={profileFormik.handleChange}
                    onBlur={profileFormik.handleBlur}
                    placeholder="Nhập họ tên"
                  />
                  {profileFormik.touched.fullName &&
                    profileFormik.errors.fullName && (
                      <p className="text-xs text-destructive">
                        {profileFormik.errors.fullName}
                      </p>
                    )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    name="email"
                    type="email"
                    value={profileFormik.values.email}
                    onChange={profileFormik.handleChange}
                    onBlur={profileFormik.handleBlur}
                    placeholder="Nhập email"
                  />
                  {profileFormik.touched.email &&
                    profileFormik.errors.email && (
                      <p className="text-xs text-destructive">
                        {profileFormik.errors.email}
                      </p>
                    )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Ngày sinh</label>
                  <Input
                    name="dateOfBirth"
                    type="date"
                    value={profileFormik.values.dateOfBirth}
                    onChange={profileFormik.handleChange}
                    onBlur={profileFormik.handleBlur}
                  />
                  {profileFormik.touched.dateOfBirth &&
                    profileFormik.errors.dateOfBirth && (
                      <p className="text-xs text-destructive">
                        {profileFormik.errors.dateOfBirth}
                      </p>
                    )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Địa chỉ</label>
                  <Textarea
                    name="address"
                    rows={3}
                    value={profileFormik.values.address}
                    onChange={profileFormik.handleChange}
                    onBlur={profileFormik.handleBlur}
                    placeholder="Nhập địa chỉ"
                  />
                  {profileFormik.touched.address &&
                    profileFormik.errors.address && (
                      <p className="text-xs text-destructive">
                        {profileFormik.errors.address}
                      </p>
                    )}
                </div>

                <Button type="submit" className="w-full">
                  <Edit className="h-4 w-4 mr-2" />
                  Cập nhật thông tin
                </Button>
              </form>

              <Separator />

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setPasswordDialogOpen(true)}
              >
                <Lock className="h-4 w-4 mr-2" />
                Đổi mật khẩu
              </Button>

              <Separator />

              <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                  <h3 className="text-sm font-semibold">Điểm đánh giá</h3>
                </div>
                <div>
                  <p className="text-3xl font-bold text-brand">
                    {ratingPercentage.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tổng: {user.totalRatings} lượt đánh giá
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-green-600 font-medium">
                      + {positiveCount}
                    </span>{" "}
                    <span className="text-muted-foreground">tích cực</span>
                  </div>
                  <div>
                    <span className="text-red-600 font-medium">
                      - {negativeCount}
                    </span>{" "}
                    <span className="text-muted-foreground">tiêu cực</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Badge
                  variant={
                    user.role === "admin"
                      ? "destructive"
                      : user.role === "seller"
                      ? "default"
                      : "secondary"
                  }
                  className="w-full justify-center py-2"
                >
                  {user.role === "admin"
                    ? "Quản trị viên"
                    : user.role === "seller"
                    ? "Người bán"
                    : "Người đấu giá"}
                </Badge>

                {user.role === "bidder" && (
                  <Card className="bg-muted/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">
                        Nâng cấp thành người bán
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {user.upgradeRequestStatus === "pending" && (
                        <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
                          <AlertCircle className="h-4 w-4 mt-0.5" />
                          <p>Yêu cầu nâng cấp đang được xét duyệt.</p>
                        </div>
                      )}
                      {user.upgradeRequestStatus === "approved" &&
                        user.upgradeExpireAt && (
                          <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-900">
                            <AlertCircle className="h-4 w-4 mt-0.5" />
                            <p>
                              Bạn đang có quyền bán đến{" "}
                              {format(
                                new Date(user.upgradeExpireAt),
                                "dd/MM/yyyy HH:mm"
                              )}
                              .
                            </p>
                          </div>
                        )}
                      {user.upgradeRequestStatus === "rejected" && (
                        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                          <AlertCircle className="h-4 w-4 mt-0.5" />
                          <p>
                            Yêu cầu nâng cấp trước đó đã bị từ chối. Bạn có thể
                            yêu cầu lại ngay.
                          </p>
                        </div>
                      )}
                      {user.upgradeExpireAt &&
                        new Date(user.upgradeExpireAt) < new Date() && (
                          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                            <AlertCircle className="h-4 w-4 mt-0.5" />
                            <p>
                              Quyền seller của bạn đã hết hạn. Bạn có thể yêu
                              cầu nâng cấp lại ngay.
                            </p>
                          </div>
                        )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        disabled={user.upgradeRequestStatus === "pending"}
                        onClick={async () => {
                          try {
                            await apiClient.post("/users/upgrade-request", {});
                            toast.success(
                              "Đã gửi yêu cầu nâng cấp. Vui lòng chờ admin xét duyệt."
                            );
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
                    </CardContent>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Tabs */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Hoạt động của tôi</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="reviews" className="flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    <span className="hidden sm:inline">Đánh giá</span>
                    <Badge variant="secondary" className="ml-1">
                      {reviews.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="watchlist" className="flex items-center gap-2">
                    <Heart className="h-4 w-4" />
                    <span className="hidden sm:inline">Yêu thích</span>
                    <Badge variant="secondary" className="ml-1">
                      {watchlist.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="bids" className="flex items-center gap-2">
                    <Gavel className="h-4 w-4" />
                    <span className="hidden sm:inline">Đấu giá</span>
                    <Badge variant="secondary" className="ml-1">
                      {bids.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="won" className="flex items-center gap-2">
                    <Trophy className="h-4 w-4" />
                    <span className="hidden sm:inline">Đã thắng</span>
                    <Badge variant="secondary" className="ml-1">
                      {wonProducts.length}
                    </Badge>
                  </TabsTrigger>
                </TabsList>

                {/* Reviews Tab */}
                <TabsContent value="reviews" className="mt-4">
                  <div ref={reviewsRef} className="space-y-4">
                    {reviews.length === 0 && (
                      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                        <AlertCircle className="h-4 w-4 mt-0.5" />
                        <p>Chưa có đánh giá nào. Hiển thị dữ liệu mẫu bên dưới.</p>
                      </div>
                    )}
                    <div className="space-y-3">
                      {(reviews.length ? reviews : mockReviews).map((review) => (
                        <Card key={review.id}>
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <p className="text-sm font-semibold">
                                  {review.reviewer.fullName}
                                </p>
                                <div className="flex items-center gap-2">
                                  {review.rating === 1 ? (
                                    <Badge
                                      variant="default"
                                      className="bg-green-500 hover:bg-green-600"
                                    >
                                      +1
                                    </Badge>
                                  ) : (
                                    <Badge variant="destructive">-1</Badge>
                                  )}
                                  <span className="text-xs text-muted-foreground">
                                    {format(
                                      new Date(review.createdAt),
                                      "dd/MM/yyyy HH:mm"
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>
                            {review.comment && (
                              <p className="text-sm text-foreground">
                                {review.comment}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* Watchlist Tab */}
                <TabsContent value="watchlist" className="mt-4">
                  <div className="space-y-4">
                    {watchlist.length === 0 ? (
                      <div className="flex items-center justify-center py-12 text-muted-foreground">
                        <div className="text-center space-y-2">
                          <Heart className="h-12 w-12 mx-auto opacity-50" />
                          <p>Chưa có sản phẩm yêu thích nào</p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {watchlist.map((item) => (
                          <Link
                            key={item.id}
                            to={`/products/${item.product.id}`}
                            className="group rounded-lg border bg-card overflow-hidden hover:shadow-sm transition-shadow"
                          >
                            <div className="aspect-video overflow-hidden">
                              <img
                                src={item.product.mainImage}
                                alt={item.product.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                            <div className="p-3 space-y-1">
                              <p className="text-sm font-medium line-clamp-2">
                                {item.product.name}
                              </p>
                              <p className="text-sm font-semibold text-brand">
                                {Number(
                                  item.product.currentPrice
                                ).toLocaleString("vi-VN")}{" "}
                                VNĐ
                              </p>
                              <Badge
                                variant={
                                  item.product.status === "active"
                                    ? "default"
                                    : "secondary"
                                }
                                className="text-xs"
                              >
                                {item.product.status === "active"
                                  ? "Đang đấu giá"
                                  : "Đã kết thúc"}
                              </Badge>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Bids Tab */}
                <TabsContent value="bids" className="mt-4">
                  <div className="space-y-4">
                    {bids.length === 0 ? (
                      <div className="flex items-center justify-center py-12 text-muted-foreground">
                        <div className="text-center space-y-2">
                          <Gavel className="h-12 w-12 mx-auto opacity-50" />
                          <p>Chưa có lượt đấu giá nào</p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {bids.map((bid) => (
                          <Link
                            key={bid.id}
                            to={`/products/${bid.product.id}`}
                            className="group rounded-lg border bg-card overflow-hidden hover:shadow-sm transition-shadow"
                          >
                            <div className="aspect-video overflow-hidden">
                              <img
                                src={bid.product.mainImage}
                                alt={bid.product.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                            <div className="p-3 space-y-2">
                              <p className="text-sm font-medium line-clamp-2">
                                {bid.product.name}
                              </p>
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Giá đấu của bạn
                                </p>
                                <p className="text-sm font-semibold text-brand">
                                  {Number(bid.amount).toLocaleString("vi-VN")}{" "}
                                  VNĐ
                                </p>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {format(
                                  new Date(bid.createdAt),
                                  "dd/MM/yyyy HH:mm"
                                )}
                              </p>
                              <Badge
                                variant={
                                  bid.product.status === "active"
                                    ? "default"
                                    : "secondary"
                                }
                                className="text-xs"
                              >
                                {bid.product.status === "active"
                                  ? "Đang đấu giá"
                                  : "Đã kết thúc"}
                              </Badge>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Won Products Tab */}
                <TabsContent value="won" className="mt-4">
                  <div className="space-y-4">
                    {wonProducts.length === 0 ? (
                      <div className="flex items-center justify-center py-12 text-muted-foreground">
                        <div className="text-center space-y-2">
                          <Trophy className="h-12 w-12 mx-auto opacity-50" />
                          <p>Chưa có sản phẩm nào đã thắng</p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {wonProducts.map((order) => (
                          <Link
                            key={order.id}
                            to={`/orders/${order.id}`}
                            className="group rounded-lg border bg-card overflow-hidden hover:shadow-sm transition-shadow"
                          >
                            <div className="aspect-video overflow-hidden">
                              <img
                                src={order.product.mainImage}
                                alt={order.product.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                            <div className="p-3 space-y-2">
                              <p className="text-sm font-medium line-clamp-2">
                                {order.product.name}
                              </p>
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Giá cuối cùng
                                </p>
                                <p className="text-sm font-semibold text-brand">
                                  {Number(order.finalPrice).toLocaleString(
                                    "vi-VN"
                                  )}{" "}
                                  VNĐ
                                </p>
                              </div>
                              <Badge
                                variant={
                                  order.status === "completed"
                                    ? "default"
                                    : order.status === "cancelled"
                                    ? "destructive"
                                    : "secondary"
                                }
                                className="text-xs"
                              >
                                {order.status === "pending_payment"
                                  ? "Chờ thanh toán"
                                  : order.status === "pending_address"
                                  ? "Chờ địa chỉ"
                                  : order.status === "pending_shipping" ||
                                    order.status === "pending_delivery"
                                  ? "Đang giao hàng"
                                  : order.status === "completed"
                                  ? "Hoàn thành"
                                  : "Đã hủy"}
                              </Badge>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đổi mật khẩu</DialogTitle>
          </DialogHeader>
          <form onSubmit={passwordFormik.handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Mật khẩu cũ</label>
              <Input
                name="oldPassword"
                type="password"
                value={passwordFormik.values.oldPassword}
                onChange={passwordFormik.handleChange}
                onBlur={passwordFormik.handleBlur}
                placeholder="Nhập mật khẩu cũ"
              />
              {passwordFormik.touched.oldPassword &&
                passwordFormik.errors.oldPassword && (
                  <p className="text-xs text-destructive">
                    {passwordFormik.errors.oldPassword}
                  </p>
                )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Mật khẩu mới</label>
              <Input
                name="newPassword"
                type="password"
                value={passwordFormik.values.newPassword}
                onChange={passwordFormik.handleChange}
                onBlur={passwordFormik.handleBlur}
                placeholder="Nhập mật khẩu mới"
              />
              {passwordFormik.touched.newPassword &&
                passwordFormik.errors.newPassword && (
                  <p className="text-xs text-destructive">
                    {passwordFormik.errors.newPassword}
                  </p>
                )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Xác nhận mật khẩu</label>
              <Input
                name="confirmPassword"
                type="password"
                value={passwordFormik.values.confirmPassword}
                onChange={passwordFormik.handleChange}
                onBlur={passwordFormik.handleBlur}
                placeholder="Xác nhận mật khẩu mới"
              />
              {passwordFormik.touched.confirmPassword &&
                passwordFormik.errors.confirmPassword && (
                  <p className="text-xs text-destructive">
                    {passwordFormik.errors.confirmPassword}
                  </p>
                )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPasswordDialogOpen(false)}
              >
                Hủy
              </Button>
              <Button type="submit">Đổi mật khẩu</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
