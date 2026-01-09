import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { format } from "date-fns";
import {
  AlertCircle,
  User,
  Star,
  Heart,
  Trophy,
  Edit,
  Lock,
  ThumbsUp,
  ThumbsDown,
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
  fullName: yup.string().required("Full name is required"),
  email: yup.string().email("Invalid email").required("Email is required"),
  dateOfBirth: yup.string().optional(),
  address: yup.string().optional(),
});

const passwordSchema = yup.object({
  oldPassword: yup.string().required("Old password is required"),
  newPassword: yup
    .string()
    .min(6, "Password must be at least 6 characters")
    .required("New password is required"),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref("newPassword")], "Passwords do not match")
    .required("Password confirmation is required"),
});

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user: authUser } = useAuthStore();
  const [user, setUser] = useState<User | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
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
      const [profileRes, reviewsRes, watchlistRes, wonRes] =
        await Promise.all([
          apiClient.get("/users/profile"),
          apiClient.get("/users/reviews"),
          apiClient.get("/users/watchlist"),
          apiClient.get("/users/won"),
        ]);

      setUser(profileRes.data.data);
      setReviews(reviewsRes.data.data || []);
      setWatchlist(watchlistRes.data.data || []);
      setWonProducts(wonRes.data.data || []);
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Unable to load information");
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
        toast.success("Profile updated successfully");
        fetchData();
      } catch (error: any) {
        toast.error(
          error.response?.data?.error?.message || "Failed to update"
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
        toast.success("Password changed successfully");
        setPasswordDialogOpen(false);
        passwordFormik.resetForm();
      } catch (error: any) {
        toast.error(
          error.response?.data?.error?.message || "Failed to change password"
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
          <span>User information not found</span>
        </div>
      </div>
    );
  }

  const ratingPercentage = getRatingPercentage(user.rating, user.totalRatings);
  const positiveCount = user.rating;
  const negativeCount = Math.max(user.totalRatings - user.rating, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-white mb-2">
          Profile
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        {/* Left Column - Profile Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={profileFormik.handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Full Name</label>
                  <Input
                    name="fullName"
                    value={profileFormik.values.fullName}
                    onChange={profileFormik.handleChange}
                    onBlur={profileFormik.handleBlur}
                    placeholder="Enter full name"
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
                    placeholder="Enter email"
                  />
                  {profileFormik.touched.email &&
                    profileFormik.errors.email && (
                      <p className="text-xs text-destructive">
                        {profileFormik.errors.email}
                      </p>
                    )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Date of Birth</label>
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
                  <label className="text-sm font-medium">Address</label>
                  <Textarea
                    name="address"
                    rows={3}
                    value={profileFormik.values.address}
                    onChange={profileFormik.handleChange}
                    onBlur={profileFormik.handleBlur}
                    placeholder="Enter address"
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
                  Update Information
                </Button>
              </form>

              <Separator />

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setPasswordDialogOpen(true)}
              >
                <Lock className="h-4 w-4 mr-2" />
                Change Password
              </Button>

              <Separator />


              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Role</span>
                  </div>
                  <Badge
                    variant={
                      user.role === "admin"
                        ? "destructive"
                        : user.role === "seller"
                          ? "default"
                          : "secondary"
                    }
                  >
                    {user.role === "admin"
                      ? "Admin"
                      : user.role === "seller"
                        ? "Seller"
                        : "Bidder"}
                  </Badge>
                </div>

                {user.role === "bidder" && (
                  <Card className="bg-muted/50 shadow-none">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">
                        Upgrade to Seller
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {user.upgradeRequestStatus === "pending" && (
                        <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
                          <AlertCircle className="h-4 w-4 mt-0.5" />
                          <p>Upgrade request is pending approval.</p>
                        </div>
                      )}
                      {user.upgradeRequestStatus === "approved" &&
                        user.upgradeExpireAt && (
                          <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-900">
                            <AlertCircle className="h-4 w-4 mt-0.5" />
                            <p>
                              You have seller privileges until{" "}
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
                            Previous upgrade request was rejected. You can
                            request again now.
                          </p>
                        </div>
                      )}
                      {user.upgradeExpireAt &&
                        new Date(user.upgradeExpireAt) < new Date() && (
                          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                            <AlertCircle className="h-4 w-4 mt-0.5" />
                            <p>
                              Your seller privileges have expired. You can
                              request an upgrade again now.
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
                              "Upgrade request submitted. Please wait for admin approval."
                            );
                            fetchData();
                          } catch (error: any) {
                            toast.error(
                              error.response?.data?.error?.message ||
                              "Failed to submit upgrade request"
                            );
                          }
                        }}
                      >
                        {user.upgradeRequestStatus === "pending"
                          ? "Request Submitted"
                          : "Request Seller Upgrade"}
                      </Button>
                    </CardContent>
                  </Card>
                )}

              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                    <Star className="h-5 w-5 text-yellow-600 dark:text-yellow-500 fill-yellow-600 dark:fill-yellow-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Rating</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-bold text-foreground">
                        {ratingPercentage.toFixed(0)}%
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({user.totalRatings} total)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-500 bg-emerald-100/50 dark:bg-emerald-900/20 px-2 py-1 rounded-md">
                    <ThumbsUp className="h-3.5 w-3.5" />
                    <span className="text-xs font-semibold">{positiveCount}</span>
                  </div>
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-500 bg-rose-100/50 dark:bg-rose-900/20 px-2 py-1 rounded-md">
                    <ThumbsDown className="h-3.5 w-3.5" />
                    <span className="text-xs font-semibold">{negativeCount}</span>
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>
        </div>

        {/* Right Column - Tabs */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>My Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="reviews" className="flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    <span className="hidden sm:inline">Reviews</span>
                    <Badge variant="secondary" className="ml-1">
                      {reviews.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="watchlist" className="flex items-center gap-2">
                    <Heart className="h-4 w-4" />
                    <span className="hidden sm:inline">Watchlist</span>
                    <Badge variant="secondary" className="ml-1">
                      {watchlist.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="won" className="flex items-center gap-2">
                    <Trophy className="h-4 w-4" />
                    <span className="hidden sm:inline">Won</span>
                    <Badge variant="secondary" className="ml-1">
                      {wonProducts.length}
                    </Badge>
                  </TabsTrigger>
                </TabsList>

                {/* Reviews Tab */}
                <TabsContent value="reviews" className="mt-4">
                  <div ref={reviewsRef} className="space-y-4">
                    {reviews.length === 0 ? (
                      <div className="flex items-center justify-center py-12 text-muted-foreground">
                        <div className="text-center space-y-2">
                          <Star className="h-12 w-12 mx-auto opacity-50" />
                          <p>No reviews yet</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {reviews.map((review) => (
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
                    )}
                  </div>
                </TabsContent>

                {/* Watchlist Tab */}
                <TabsContent value="watchlist" className="mt-4">
                  <div className="space-y-4">
                    {watchlist.length === 0 ? (
                      <div className="flex items-center justify-center py-12 text-muted-foreground">
                        <div className="text-center space-y-2">
                          <Heart className="h-12 w-12 mx-auto opacity-50" />
                          <p>No watchlist items yet</p>
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
                                  ? "Active"
                                  : "Ended"}
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
                          <p>No won products yet</p>
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
                                  Final price
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
                                  ? "Pending Payment"
                                  : order.status === "pending_address"
                                    ? "Pending Address"
                                    : order.status === "pending_shipping" ||
                                      order.status === "pending_delivery"
                                      ? "Shipping"
                                      : order.status === "completed"
                                        ? "Completed"
                                        : "Cancelled"}
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
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <form onSubmit={passwordFormik.handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Old Password</label>
              <Input
                name="oldPassword"
                type="password"
                value={passwordFormik.values.oldPassword}
                onChange={passwordFormik.handleChange}
                onBlur={passwordFormik.handleBlur}
                placeholder="Enter old password"
              />
              {passwordFormik.touched.oldPassword &&
                passwordFormik.errors.oldPassword && (
                  <p className="text-xs text-destructive">
                    {passwordFormik.errors.oldPassword}
                  </p>
                )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">New Password</label>
              <Input
                name="newPassword"
                type="password"
                value={passwordFormik.values.newPassword}
                onChange={passwordFormik.handleChange}
                onBlur={passwordFormik.handleBlur}
                placeholder="Enter new password"
              />
              {passwordFormik.touched.newPassword &&
                passwordFormik.errors.newPassword && (
                  <p className="text-xs text-destructive">
                    {passwordFormik.errors.newPassword}
                  </p>
                )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Confirm Password</label>
              <Input
                name="confirmPassword"
                type="password"
                value={passwordFormik.values.confirmPassword}
                onChange={passwordFormik.handleChange}
                onBlur={passwordFormik.handleBlur}
                placeholder="Confirm new password"
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
                Cancel
              </Button>
              <Button type="submit">Change Password</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
