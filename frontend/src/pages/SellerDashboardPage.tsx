import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import { format } from "date-fns";
import {
  Plus,
  Trash2,
  Edit,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle2,
  Clock,
  Package,
  Gavel,
  X,
  Star,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import RichTextEditor from "@/components/RichTextEditor";

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
  "Payment",
  "Address",
  "Shipping",
  "Delivery",
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
  name: yup.string().required("Product name is required"),
  description: yup.string().required("Description is required"),
  startingPrice: yup
    .number()
    .min(0, "Starting price must be greater than 0")
    .required("Starting price is required"),
  bidStep: yup
    .number()
    .min(0, "Bid step must be greater than 0")
    .required("Bid step is required"),
  buyNowPrice: yup.number().min(0).optional(),
  categoryId: yup.number().required("Category is required"),
  endDate: yup.string().required("End date is required"),
  autoExtend: yup.boolean(),
  allowUnratedBidders: yup.boolean(),
});

export default function SellerDashboardPage() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState("active");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [autoExtendConfig, setAutoExtendConfig] = useState({
    thresholdMinutes: 5,
    durationMinutes: 10,
  });
  const [appendDescriptionDialogOpen, setAppendDescriptionDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [additionalDescription, setAdditionalDescription] = useState("");
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [reviewRating, setReviewRating] = useState<1 | -1>(1);
  const [reviewComment, setReviewComment] = useState("");

  useEffect(() => {
    if (user?.role !== "seller") {
      navigate("/");
      return;
    }
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
          setExpired(true);
          updateUser({ role: "bidder" });
          toast.error(
            "Your seller account has expired. Please request an upgrade again."
          );
          setTimeout(() => {
            navigate("/profile");
          }, 2000);
          return;
        }
      }

      fetchData();
    } catch (error: any) {
      console.error("Error checking seller status:", error);
      if (
        error.response?.status === 403 &&
        error.response?.data?.message?.includes("expired")
      ) {
        setExpired(true);
        updateUser({ role: "bidder" });
        toast.error(
          error.response.data.message ||
            "Your seller account has expired."
        );
        setTimeout(() => {
          navigate("/profile");
        }, 2000);
        return;
      }
      fetchData();
    }
  };

  const fetchData = async () => {
    try {
      const [categoriesRes, productsRes, ordersRes, settingsRes] = await Promise.all([
        apiClient.get("/categories"),
        apiClient.get("/products/seller/my-products"),
        apiClient.get("/products/seller/orders"),
        apiClient.get("/admin/settings/auto-extend/public").catch(() => null),
      ]);

      setCategories(categoriesRes.data.data);
      setProducts(productsRes.data.data);
      setOrders(ordersRes.data.data);
      if (settingsRes?.data?.data) {
        setAutoExtendConfig(settingsRes.data.data);
      }
    } catch (error: any) {
      console.error("Error fetching data:", error);
      if (
        error.response?.status === 403 &&
        error.response?.data?.message?.includes("expired")
      ) {
        setExpired(true);
        updateUser({ role: "bidder" });
        toast.error(
          error.response.data.message || "Your seller account has expired."
        );
        setTimeout(() => {
          navigate("/profile");
        }, 2000);
      } else {
        toast.error("Unable to load data");
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch auto-extend config when dialog opens
  useEffect(() => {
    if (createDialogOpen) {
      apiClient
        .get("/admin/settings/auto-extend/public")
        .then((res) => {
          if (res.data?.data) {
            setAutoExtendConfig(res.data.data);
          }
        })
        .catch((error) => {
          console.error("Error fetching auto-extend config:", error);
        });
    }
  }, [createDialogOpen]);

  // Setup Socket.IO để nhận cập nhật real-time
  useEffect(() => {
    if (!user || user.role !== "seller" || expired) return;

    const newSocket = io("http://localhost:3000");

    newSocket.on("connect", () => {
      newSocket.emit("join-room", `user-${user.id}`);
    });

    newSocket.on("order-list-updated", () => {
      apiClient
        .get("/products/seller/orders")
        .then((res) => {
          setOrders(res.data.data);
        })
        .catch((error) => {
          console.error("Error refreshing orders:", error);
        });
    });

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
        toast.error("Please upload at least 3 images");
        return;
      }

      try {
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

        toast.success("Product created successfully");
        setCreateDialogOpen(false);
        formik.resetForm();
        setSelectedImages([]);
        setImagePreviews([]);
        fetchData();
      } catch (error: any) {
        toast.error(
          error.response?.data?.error?.message || "Failed to create product"
        );
      }
    },
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + selectedImages.length > 10) {
      toast.error("Maximum 10 images");
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

  const handleCancelOrder = async (orderId: number) => {
    if (
      !window.confirm(
        "Bạn có chắc chắn muốn hủy giao dịch này? Người thắng sẽ tự động nhận đánh giá -1 với nhận xét 'Người thắng không thanh toán'."
      )
    )
      return;

    try {
      await apiClient.put(`/orders/${orderId}`, {
        status: "cancelled",
      });
      toast.success("Đã hủy giao dịch");
      fetchData();
    } catch (error: any) {
      toast.error(
        error.response?.data?.error?.message || "Hủy giao dịch thất bại"
      );
    }
  };

  const handleOpenReviewDialog = (order: Order) => {
    setSelectedOrder(order);
    setReviewRating(1);
    setReviewComment("");
    setReviewDialogOpen(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedOrder || !reviewComment.trim()) {
      toast.error("Vui lòng nhập nhận xét");
      return;
    }

    try {
      await apiClient.post("/users/rate", {
        orderId: selectedOrder.id,
        rating: reviewRating,
        comment: reviewComment,
      });
      toast.success("Đánh giá thành công");
      setReviewDialogOpen(false);
      setSelectedOrder(null);
      setReviewComment("");
      fetchData();
    } catch (error: any) {
      toast.error(
        error.response?.data?.error?.message || "Đánh giá thất bại"
      );
    }
  };

  const activeProducts = products.filter(
    (p) => p.status === "active" && new Date(p.endDate) > new Date()
  );
  const endedProducts = products.filter(
    (p) => p.status === "ended" || new Date(p.endDate) <= new Date()
  );

  if (loading) {
    return <Loading />;
  }

  if (expired) {
    return (
      <div className="space-y-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Seller Account Expired
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your seller account has expired. You can no longer access the
              dashboard as a seller. Please request an upgrade again in the
              Profile page.
            </p>
            <Button onClick={() => navigate("/profile")}>
              Go to Profile Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-white">
          Seller Dashboard
        </h1>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create New Product
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Products & Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="active" className="flex items-center gap-2">
                <Gavel className="h-4 w-4" />
                <span>Active Products</span>
                <Badge variant="secondary">{activeProducts.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="ended" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Ended Products</span>
                <Badge variant="secondary">{endedProducts.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="orders" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                <span>Orders</span>
                <Badge variant="secondary">{orders.length}</Badge>
              </TabsTrigger>
            </TabsList>

            {/* Active Products Tab */}
            <TabsContent value="active" className="mt-4">
              <div className="space-y-4">
                {activeProducts.length === 0 ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    <div className="text-center space-y-2">
                      <Gavel className="h-12 w-12 mx-auto opacity-50" />
                      <p>No active products yet</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activeProducts.map((product) => (
                      <div
                        key={product.id}
                        className="group rounded-lg border bg-card overflow-hidden hover:shadow-sm transition-shadow"
                      >
                        <Link to={`/products/${product.id}`}>
                          <div className="aspect-video overflow-hidden">
                            <img
                              src={product.mainImage}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                          <div className="p-4 space-y-2">
                            <h3 className="font-semibold line-clamp-2">
                              {product.name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {product.category.name}
                            </p>
                            <p className="text-lg font-semibold text-brand">
                              {Number(product.currentPrice).toLocaleString("vi-VN")}{" "}
                              VNĐ
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>{product.bidCount} bids</span>
                              <span>
                                Ends: {format(new Date(product.endDate), "dd/MM/yyyy HH:mm")}
                              </span>
                            </div>
                            {product.bids && product.bids[0] && (
                              <p className="text-xs text-muted-foreground">
                                Highest bidder: {product.bids[0].bidder.fullName}
                              </p>
                            )}
                          </div>
                        </Link>
                        <div className="p-4 pt-0">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={(e) => {
                              e.preventDefault();
                              setSelectedProduct(product);
                              setAdditionalDescription("");
                              setAppendDescriptionDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Append Description
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Ended Products Tab */}
            <TabsContent value="ended" className="mt-4">
              <div className="space-y-4">
                {endedProducts.length === 0 ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    <div className="text-center space-y-2">
                      <Clock className="h-12 w-12 mx-auto opacity-50" />
                      <p>No ended products yet</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {endedProducts.map((product) => (
                      <Link
                        key={product.id}
                        to={`/products/${product.id}`}
                        className="group rounded-lg border bg-card overflow-hidden hover:shadow-sm transition-shadow"
                      >
                        <div className="aspect-video overflow-hidden">
                          <img
                            src={product.mainImage}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <div className="p-4 space-y-2">
                          <h3 className="font-semibold line-clamp-2">
                            {product.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {product.category.name}
                          </p>
                          <p className="text-lg font-semibold text-brand">
                            {Number(product.currentPrice).toLocaleString("vi-VN")}{" "}
                            VNĐ
                          </p>
                          <Badge
                            variant={
                              product.status === "ended"
                                ? "destructive"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {product.status === "ended" ? "Ended" : "Expired"}
                          </Badge>
                          {product.bids && product.bids[0] && (
                            <p className="text-xs text-muted-foreground">
                              Winner: {product.bids[0].bidder.fullName}
                            </p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Orders Tab */}
            <TabsContent value="orders" className="mt-4">
              <div className="space-y-4">
                {orders.length === 0 ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    <div className="text-center space-y-2">
                      <Package className="h-12 w-12 mx-auto opacity-50" />
                      <p>No orders yet</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => {
                      const currentStep = getOrderStepIndex(order.status);
                      const isCompleted = order.status === "completed";
                      const isCancelled = order.status === "cancelled";

                      return (
                        <Card key={order.id}>
                          <CardContent className="p-4">
                            <div className="flex gap-4">
                              <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                                <img
                                  src={order.product.mainImage}
                                  alt={order.product.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="flex-1 space-y-3">
                                <div>
                                  <h3 className="font-semibold text-lg">
                                    {order.product.name}
                                  </h3>
                                  <p className="text-sm text-muted-foreground">
                                    Buyer: {order.buyer.fullName}
                                  </p>
                                  <p className="text-lg font-semibold text-brand mt-1">
                                    {Number(order.finalPrice).toLocaleString("vi-VN")}{" "}
                                    VNĐ
                                  </p>
                                </div>

                                {/* Order Steps Progress */}
                                {!isCancelled && (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      {orderSteps.map((step, index) => {
                                        const isStepCompleted =
                                          isCompleted || index < currentStep;
                                        const isStepActive =
                                          !isCompleted && index === currentStep;

                                        return (
                                          <div
                                            key={step}
                                            className="flex items-center flex-1"
                                          >
                                            <div className="flex items-center gap-2 flex-1">
                                              <div
                                                className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                                                  isStepCompleted
                                                    ? "bg-green-500 border-green-500 text-white"
                                                    : isStepActive
                                                    ? "border-primary text-primary"
                                                    : "border-muted-foreground text-muted-foreground"
                                                }`}
                                              >
                                                {isStepCompleted ? (
                                                  <CheckCircle2 className="h-4 w-4" />
                                                ) : (
                                                  <span className="text-xs font-medium">
                                                    {index + 1}
                                                  </span>
                                                )}
                                              </div>
                                              {index < orderSteps.length - 1 && (
                                                <div
                                                  className={`flex-1 h-0.5 ${
                                                    isStepCompleted
                                                      ? "bg-green-500"
                                                      : "bg-muted"
                                                  }`}
                                                />
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                      {orderSteps.map((step, index) => (
                                        <div key={step} className="flex-1 text-center">
                                          <span
                                            className={
                                              index <= currentStep
                                                ? "text-foreground font-medium"
                                                : "text-muted-foreground"
                                            }
                                          >
                                            {step}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                <Badge
                                  variant={
                                    isCompleted
                                      ? "default"
                                      : isCancelled
                                      ? "destructive"
                                      : "secondary"
                                  }
                                  className="text-xs"
                                >
                                  {order.status === "pending_payment"
                                    ? "Pending Payment"
                                    : order.status === "pending_address"
                                    ? "Pending Address"
                                    : order.status === "pending_shipping"
                                    ? "Pending Shipping"
                                    : order.status === "pending_delivery"
                                    ? "Pending Delivery"
                                    : order.status === "completed"
                                    ? "Completed"
                                    : "Cancelled"}
                                </Badge>

                                {/* Completed steps info */}
                                {!isCancelled && (
                                  <div className="space-y-1 text-xs text-green-600">
                                    {currentStep > 0 && (
                                      <p className="flex items-center gap-1">
                                        <CheckCircle2 className="h-3 w-3" />
                                        Payment completed
                                      </p>
                                    )}
                                    {currentStep > 1 && (
                                      <p className="flex items-center gap-1">
                                        <CheckCircle2 className="h-3 w-3" />
                                        Address received
                                      </p>
                                    )}
                                    {currentStep > 2 && (
                                      <p className="flex items-center gap-1">
                                        <CheckCircle2 className="h-3 w-3" />
                                        Shipped
                                      </p>
                                    )}
                                    {isCompleted && (
                                      <p className="flex items-center gap-1">
                                        <CheckCircle2 className="h-3 w-3" />
                                        Delivered
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="mt-4 flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/orders/${order.id}`)}
                                className="flex-1"
                              >
                                View Order Details
                              </Button>
                              {!isCancelled &&
                                (order.status === "pending_payment" ||
                                  order.status === "pending_address") && (
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleCancelOrder(order.id)}
                                  >
                                    <X className="h-4 w-4 mr-2" />
                                    Hủy giao dịch
                                  </Button>
                                )}
                              {isCompleted && (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleOpenReviewDialog(order)}
                                >
                                  <Star className="h-4 w-4 mr-2" />
                                  Đánh giá
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Create Product Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Product</DialogTitle>
          </DialogHeader>
          <form onSubmit={formik.handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                name="name"
                value={formik.values.name}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                placeholder="Enter product name"
              />
              {formik.touched.name && formik.errors.name && (
                <p className="text-xs text-destructive">
                  {formik.errors.name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoryId">Category *</Label>
              <Select
                value={formik.values.categoryId}
                onValueChange={(value) =>
                  formik.setFieldValue("categoryId", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    .filter((c) => !c.parentId)
                    .map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {formik.touched.categoryId && formik.errors.categoryId && (
                <p className="text-xs text-destructive">
                  {formik.errors.categoryId}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Product Description *</Label>
              <RichTextEditor
                value={formik.values.description}
                onChange={(value) => formik.setFieldValue("description", value)}
                placeholder="Enter product description..."
                className="bg-background"
              />
              {formik.touched.description && formik.errors.description && (
                <p className="text-xs text-destructive">
                  {formik.errors.description}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startingPrice">Starting Price (VNĐ) *</Label>
                <Input
                  id="startingPrice"
                  name="startingPrice"
                  type="number"
                  value={formik.values.startingPrice}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  placeholder="0"
                />
                {formik.touched.startingPrice &&
                  formik.errors.startingPrice && (
                    <p className="text-xs text-destructive">
                      {formik.errors.startingPrice}
                    </p>
                  )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bidStep">Bid Step (VNĐ) *</Label>
                <Input
                  id="bidStep"
                  name="bidStep"
                  type="number"
                  value={formik.values.bidStep}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  placeholder="0"
                />
                {formik.touched.bidStep && formik.errors.bidStep && (
                  <p className="text-xs text-destructive">
                    {formik.errors.bidStep}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="buyNowPrice">Buy Now Price (VNĐ) - Optional</Label>
                <Input
                  id="buyNowPrice"
                  name="buyNowPrice"
                  type="number"
                  value={formik.values.buyNowPrice}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  placeholder="0"
                />
                {formik.touched.buyNowPrice && formik.errors.buyNowPrice && (
                  <p className="text-xs text-destructive">
                    {formik.errors.buyNowPrice}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date *</Label>
                <Input
                  id="endDate"
                  name="endDate"
                  type="datetime-local"
                  value={formik.values.endDate}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
                {formik.touched.endDate && formik.errors.endDate && (
                  <p className="text-xs text-destructive">
                    {formik.errors.endDate}
                  </p>
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Product Images * (Minimum 3 images)</Label>
              <input
                accept="image/*"
                style={{ display: "none" }}
                id="image-upload"
                type="file"
                multiple
                onChange={handleImageSelect}
              />
              <label htmlFor="image-upload">
                <Button variant="outline" type="button" asChild>
                  <span>
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Upload Images
                  </span>
                </Button>
              </label>
              {imagePreviews.length > 0 && (
                <div className="flex gap-2 flex-wrap mt-2">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-24 h-24 object-cover rounded-md border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                        onClick={() => handleRemoveImage(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {selectedImages.length < 3 && (
                <p className="text-xs text-destructive">
                  Need at least 3 images (selected: {selectedImages.length}/3)
                </p>
              )}
              {selectedImages.length >= 3 && (
                <p className="text-xs text-green-600">
                  ✓ Selected {selectedImages.length} images
                </p>
              )}
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoExtend"
                  checked={formik.values.autoExtend}
                  onChange={(e) =>
                    formik.setFieldValue("autoExtend", e.target.checked)
                  }
                  className="h-4 w-4 rounded border border-input"
                />
                <Label htmlFor="autoExtend" className="text-sm font-normal cursor-pointer">
                  Auto-extend: When there is a new bid within {autoExtendConfig.thresholdMinutes} minutes before the end, the product will automatically extend by {autoExtendConfig.durationMinutes} minutes
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="allowUnratedBidders"
                  checked={formik.values.allowUnratedBidders}
                  onChange={(e) =>
                    formik.setFieldValue("allowUnratedBidders", e.target.checked)
                  }
                  className="h-4 w-4 rounded border border-input"
                />
                <Label htmlFor="allowUnratedBidders" className="text-sm font-normal cursor-pointer">
                  Allow unrated bidders to participate
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={selectedImages.length < 3}>
                Create Product
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Append Description Dialog */}
      <Dialog open={appendDescriptionDialogOpen} onOpenChange={setAppendDescriptionDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Append Product Description</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-1">Product:</p>
                <p className="text-sm text-muted-foreground">{selectedProduct.name}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="additionalDescription">
                  Additional Information (will be appended to current description)
                </Label>
                <RichTextEditor
                  value={additionalDescription}
                  onChange={setAdditionalDescription}
                  placeholder="Enter additional information..."
                  className="bg-background"
                />
                <p className="text-xs text-muted-foreground">
                  New information will be appended to the existing description with automatic timestamp
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAppendDescriptionDialogOpen(false);
                setSelectedProduct(null);
                setAdditionalDescription("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!selectedProduct || !additionalDescription.trim()) {
                  toast.error("Please enter additional information");
                  return;
                }

                try {
                  await apiClient.put(`/products/${selectedProduct.id}/description`, {
                    additionalDescription: additionalDescription.trim(),
                  });
                  toast.success("Description appended successfully");
                  setAppendDescriptionDialogOpen(false);
                  setSelectedProduct(null);
                  setAdditionalDescription("");
                  fetchData();
                } catch (error: any) {
                  toast.error(
                    error.response?.data?.error?.message || "Failed to append description"
                  );
                }
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Buyer Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đánh giá người thắng đấu giá</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-1">Sản phẩm:</p>
                <p className="text-sm text-muted-foreground">
                  {selectedOrder.product.name}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Người mua:</p>
                <p className="text-sm text-muted-foreground">
                  {selectedOrder.buyer.fullName}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Đánh giá:</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={reviewRating === 1 ? "default" : "outline"}
                    className={reviewRating === 1 ? "bg-green-500 hover:bg-green-600" : ""}
                    onClick={() => setReviewRating(1)}
                  >
                    +1 (Tích cực)
                  </Button>
                  <Button
                    type="button"
                    variant={reviewRating === -1 ? "destructive" : "outline"}
                    onClick={() => setReviewRating(-1)}
                  >
                    -1 (Tiêu cực)
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reviewComment">Nhận xét:</Label>
                <Textarea
                  id="reviewComment"
                  rows={4}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Nhập nhận xét về người mua..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReviewDialogOpen(false);
                setSelectedOrder(null);
                setReviewComment("");
              }}
            >
              Hủy
            </Button>
            <Button onClick={handleSubmitReview}>Gửi đánh giá</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
