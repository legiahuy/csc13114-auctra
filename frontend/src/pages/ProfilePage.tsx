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
  Loader2,
} from "lucide-react";
import { useFormik } from "formik";
import * as yup from "yup";
import apiClient from "../api/client";
import { useAuthStore } from "../store/authStore";
import toast from "react-hot-toast";
import Loading from "@/components/Loading";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  order: {
    product: {
      id: number;
      name: string;
    };
  };
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
  isRejected: boolean; // Add this
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
  const [bids, setBids] = useState<Bid[]>([]);
  const [bidsPagination, setBidsPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });
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
          apiClient.get("/users/bids", {
            params: { page: bidsPagination.page, limit: 9 },
          }),
          apiClient.get("/users/won"),
        ]);

      setUser(profileRes.data.data);
      setReviews(reviewsRes.data.data || []);
      setWatchlist(watchlistRes.data.data || []);
      setBids(bidsRes.data.data?.bids || bidsRes.data.data || []);
      setBidsPagination(
        bidsRes.data.data?.pagination || { page: 1, totalPages: 1, total: 0 }
      );
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

        // Update global auth store particularly for the header
        const { updateUser } = useAuthStore.getState();
        updateUser({ fullName: values.fullName, email: values.email });

        toast.success("Profile updated successfully");
        fetchData();
      } catch (error: any) {
        toast.error(error.response?.data?.error?.message || "Failed to update");
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

                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    profileFormik.isSubmitting ||
                    profileFormik.isValid === false
                  }
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {profileFormik.isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Information"
                  )}
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
                          <p className="text-xs my-0">Upgrade request is pending approval.</p>
                        </div>
                      )}
                      {user.upgradeRequestStatus === "approved" &&
                        user.upgradeExpireAt && (
                          <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-900">
                            <AlertCircle className="h-4 w-4 mt-0.5" />
                            <p className="text-xs my-0">
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
                          <p className="text-xs my-0">
                            Previous upgrade request was rejected. You can
                            request again now.
                          </p>
                        </div>
                      )}
                      {user.upgradeExpireAt &&
                        new Date(user.upgradeExpireAt) < new Date() && (
                          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                            <AlertCircle className="h-4 w-4 mt-0.5" />
                            <p className="text-xs my-0">
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

              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border">
                <div className="flex flex-col items-center justify-center h-20 w-20 rounded-full bg-background border-2 border-primary/20">
                  <span className="text-xl font-bold">
                    {ratingPercentage.toFixed(0)}%
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase">
                    Positive
                  </span>
                </div>

                <div className="space-y-2 flex-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-500">
                      <ThumbsUp className="h-4 w-4" /> Positive
                    </span>
                    <span className="font-semibold">{positiveCount}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-500">
                      <ThumbsDown className="h-4 w-4" /> Negative
                    </span>
                    <span className="font-semibold">{negativeCount}</span>
                  </div>
                  <div className="text-xs text-muted-foreground text-right pt-1">
                    Based on {user.totalRatings} total ratings
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
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger
                    value="reviews"
                    className="flex items-center gap-2"
                  >
                    <Star className="h-4 w-4" />
                    <span className="hidden sm:inline">Reviews</span>
                    <Badge variant="secondary" className="ml-1">
                      {reviews.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger
                    value="watchlist"
                    className="flex items-center gap-2"
                  >
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
                      <div className="space-y-4">
                        {reviews.map((review) => (
                          <div
                            key={review.id}
                            className="border-b last:border-0 pb-4 last:pb-0 space-y-2"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold uppercase">
                                  {review.reviewer.fullName.charAt(0)}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold">
                                    {review.reviewer.fullName}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(
                                      new Date(review.createdAt),
                                      "dd MMM yyyy, HH:mm"
                                    )}
                                  </p>
                                </div>
                              </div>
                              {review.rating === 1 ? (
                                <Badge
                                  variant="outline"
                                  className="text-emerald-600 border-emerald-200 bg-emerald-50"
                                >
                                  <ThumbsUp className="h-3 w-3 mr-1" /> Positive
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-rose-600 border-rose-200 bg-rose-50"
                                >
                                  <ThumbsDown className="h-3 w-3 mr-1" />{" "}
                                  Negative
                                </Badge>
                              )}
                            </div>

                            {review.comment && (
                              <p className="text-sm text-foreground bg-muted/30 p-3 rounded-md">
                                {review.comment}
                              </p>
                            )}

                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>Product:</span>
                              <span className="font-medium text-foreground">
                                <Link
                                  to={`/products/${review.order?.product?.id}`}
                                  className="hover:underline hover:text-primary"
                                >
                                  {review.order?.product?.name ||
                                    "Product unavailable"}
                                </Link>
                              </span>
                            </div>
                          </div>
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
                                className={`text-xs ${
                                  item.product.status === "active"
                                    ? "bg-emerald-500 hover:bg-emerald-600"
                                    : "bg-red-500 hover:bg-red-600"
                                }`}
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

                {/* Bids Tab */}
                <TabsContent value="bids" className="mt-4">
                  <div className="space-y-4">
                    {bids.length === 0 ? (
                      <div className="flex items-center justify-center py-12 text-muted-foreground">
                        <div className="text-center space-y-2">
                          <Gavel className="h-12 w-12 mx-auto opacity-50" />
                          <p>No bids yet</p>
                        </div>
                      </div>
                    ) : (
                      <>
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
                                    Your bid amount
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
                                    bid.isRejected 
                                      ? "destructive"
                                      : bid.product.status === "active"
                                      ? "default"
                                      : bid.product.status === "cancelled"
                                      ? "destructive"
                                      : "outline"
                                  }
                                  className={
                                    bid.isRejected
                                      ? "text-xs bg-red-500 hover:bg-red-600 text-white"
                                      : bid.product.status === "active"
                                      ? "text-xs bg-emerald-500 hover:bg-emerald-600 text-white"
                                      : "text-xs bg-red-500 hover:bg-red-600 text-white"
                                  }
                                >
                                  {bid.isRejected 
                                    ? "Rejected"
                                    : bid.product.status === "active"
                                    ? "Active"
                                    : bid.product.status === "cancelled"
                                    ? "Cancelled"
                                    : "Ended"}
                                </Badge>
                              </div>
                            </Link>
                          ))}
                        </div>
                        {bidsPagination.totalPages > 1 && (
                          <div className="flex justify-center items-center gap-2 mt-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setBidsPagination((prev) => ({
                                  ...prev,
                                  page: prev.page - 1,
                                }));
                              }}
                              disabled={bidsPagination.page === 1}
                            >
                              Previous
                            </Button>
                            <span className="text-sm text-muted-foreground">
                              Page {bidsPagination.page} /{" "}
                              {bidsPagination.totalPages}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setBidsPagination((prev) => ({
                                  ...prev,
                                  page: prev.page + 1,
                                }));
                              }}
                              disabled={
                                bidsPagination.page ===
                                bidsPagination.totalPages
                              }
                            >
                              Next
                            </Button>
                          </div>
                        )}
                      </>
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
                          <div
                            key={order.id}
                            className="group rounded-lg border bg-card overflow-hidden hover:shadow-sm transition-shadow flex flex-col"
                          >
                            <Link to={`/orders/${order.id}`} className="block flex-1">
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
                              </div>
                            </Link>
                            <div className="p-3 pt-0 flex items-center justify-between mt-auto">
                              <Badge
                                variant={
                                  order.status === "completed"
                                    ? "default"
                                    : order.status === "cancelled"
                                      ? "destructive"
                                      : "secondary"
                                }
                                className={`text-xs ${
                                    order.status === "completed"
                                      ? "bg-emerald-500 hover:bg-emerald-600"
                                      : order.status === "cancelled"
                                      ? "bg-red-500 hover:bg-red-600"
                                      : "bg-amber-500 hover:bg-amber-600"
                                  }`}
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

                              <Button variant="outline" size="sm" asChild>
                                <Link to={`/products/${order.product.id}`}>
                                  View details
                                </Link>
                              </Button>
                            </div>
                          </div>
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
              <Button
                type="submit"
                disabled={
                  passwordFormik.isSubmitting ||
                  passwordFormik.isValid === false
                }
              >
                {passwordFormik.isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Change Password"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
