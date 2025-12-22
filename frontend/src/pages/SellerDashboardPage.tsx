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
                            <div className="mt-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/orders/${order.id}`)}
                                className="w-full"
                              >
                                View Order Details
                              </Button>
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
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                name="description"
                rows={6}
                value={formik.values.description}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                placeholder="Enter product description"
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
              <Label>Images * (Minimum 3 images)</Label>
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
                  Need at least 3 images (selected: {selectedImages.length})
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
                  Auto-extend if there are bids in the last 3 minutes
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
    </div>
  );
}
