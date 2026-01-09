import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  TrendingUp,
  Users,
  Gavel,
  DollarSign,
  Search,
  ChevronLeft,
  ChevronRight,
  Circle,
  Eye,
  Loader2,
} from "lucide-react";
import apiClient from "../api/client";
import { useAuthStore } from "../store/authStore";
import toast from "react-hot-toast";
import Loading from "@/components/Loading";
import ConfirmDialog from "@/components/ConfirmDialog";
import DashboardCharts from "@/components/DashboardCharts";
import UserDetailsModal from "@/components/UserDetailsModal";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DashboardStats {
  newAuctions: number;
  revenue: number;
  newUsers: number;
  upgradeRequests: number;
  newUpgradeRequests: number;
  activeProducts: number;
  totalUsers: number;
  totalProducts: number;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  parentId?: number;
  children?: Category[];
}

interface User {
  id: number;
  email: string;
  fullName: string;
  role: string;
  upgradeRequestStatus?: string;
  upgradeRequestDate?: string;
  upgradeExpireAt?: string | null;
  upgradeRejectionReason?: string | null;
}

interface Product {
  id: number;
  name: string;
  status: string;
  seller: {
    fullName: string;
  };
  category: {
    name: string;
  };
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Category Dialog State
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [parentCategoryId, setParentCategoryId] = useState("0");
  const [actionLoading, setActionLoading] = useState(false);

  // Auto-extend settings (admin)
  const [autoExtendSettings, setAutoExtendSettings] = useState({
    thresholdMinutes: 5,
    durationMinutes: 10,
  });
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);

  // Users Management State
  const [usersPage, setUsersPage] = useState(1);
  const [usersLimit] = useState(10);
  const [usersSearch, setUsersSearch] = useState("");
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [usersRole, setUsersRole] = useState("");

  // Products Management State
  const [productsPage, setProductsPage] = useState(1);
  const [productsLimit] = useState(10);
  const [productsSearch, setProductsSearch] = useState("");
  const [productsTotalPages, setProductsTotalPages] = useState(1);
  const [productsStatus, setProductsStatus] = useState("");

  // Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    variant?: "default" | "destructive";
  }>({
    open: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });

  // Rejection Reason Dialog State
  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean;
    userId: number | null;
  }>({ open: false, userId: null });
  const [rejectReason, setRejectReason] = useState("");

  // Time period filter
  const [period, setPeriod] = useState<"today" | "week" | "month" | "year">("week");

  // User details modal
  const [userDetailsModal, setUserDetailsModal] = useState<{
    open: boolean;
    userId: number | null;
  }>({ open: false, userId: null });

  // Initial page load
  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/");
      return;
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate]);

  // Refetch stats when period changes (without full page reload)
  useEffect(() => {
    if (stats) {
      fetchStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const fetchData = async (isInitial = true) => {
    try {
      if (isInitial) setLoading(true);

      const [dashboardRes, categoriesRes, settingsRes] = await Promise.all([
        apiClient.get("/admin/dashboard", { params: { period } }),
        apiClient.get("/categories"),
        apiClient.get("/admin/settings/auto-extend").catch(() => null),
      ]);

      setStats(dashboardRes.data.data);
      setCategories(categoriesRes.data.data);

      if (settingsRes?.data?.data) {
        setAutoExtendSettings(settingsRes.data.data);
      }

      // Fetch users and products with current filters
      await Promise.all([
        fetchUsers(usersPage, usersSearch, usersRole),
        fetchProducts(productsPage, productsSearch, productsStatus),
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Unable to load data");
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const dashboardRes = await apiClient.get("/admin/dashboard", { params: { period } });
      setStats(dashboardRes.data.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast.error("Unable to load stats");
    }
  };

  const fetchUsers = async (page: number, search: string, role: string) => {
    try {
      const res = await apiClient.get("/admin/users", {
        params: {
          page,
          limit: usersLimit,
          search: search || undefined,
          role: role || undefined,
        },
      });
      setUsers(res.data.data.users || []);
      setUsersTotalPages(res.data.data.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    }
  };

  const fetchProducts = async (page: number, search: string, status: string) => {
    try {
      const res = await apiClient.get("/admin/products", {
        params: {
          page,
          limit: productsLimit,
          search: search || undefined,
          status: status || undefined,
        },
      });
      setProducts(res.data.data.products || []);
      setProductsTotalPages(res.data.data.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Failed to load products");
    }
  };

  const handleUsersSearch = (value: string) => {
    setUsersSearch(value);
    setUsersPage(1);
    fetchUsers(1, value, usersRole);
  };

  const handleUsersRoleFilter = (value: string) => {
    const role = value === "all" ? "" : value;
    setUsersRole(role);
    setUsersPage(1);
    fetchUsers(1, usersSearch, role);
  };

  const handleProductsSearch = (value: string) => {
    setProductsSearch(value);
    setProductsPage(1);
    fetchProducts(1, value, productsStatus);
  };

  const handleProductsStatusFilter = (value: string) => {
    const status = value === "all" ? "" : value;
    setProductsStatus(status);
    setProductsPage(1);
    fetchProducts(1, productsSearch, status);
  };

  const handleUpdateAutoExtendSettings = async () => {
    try {
      setActionLoading(true);
      await apiClient.put("/admin/settings/auto-extend", autoExtendSettings);
      toast.success("Auto-extend settings updated successfully");
      setSettingsDialogOpen(false);
      fetchData(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || "Unable to update settings");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!categoryName.trim()) {
      toast.error("Please enter category name");
      return;
    }

    try {
      setActionLoading(true);
      await apiClient.post("/categories", {
        name: categoryName,
        parentId:
          parentCategoryId && parentCategoryId !== "0"
            ? parseInt(parentCategoryId)
            : undefined,
      });
      toast.success("Category created successfully");
      setCategoryDialogOpen(false);
      setCategoryName("");
      setParentCategoryId("0");
      fetchData(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || "Failed to create category");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateCategory = async () => {
    if (!selectedCategory || !categoryName.trim()) {
      toast.error("Please enter category name");
      return;
    }

    try {
      setActionLoading(true);
      await apiClient.put(`/categories/${selectedCategory.id}`, {
        name: categoryName,
        parentId:
          parentCategoryId && parentCategoryId !== "0"
            ? parseInt(parentCategoryId)
            : undefined,
      });
      toast.success("Category updated successfully");
      setCategoryDialogOpen(false);
      setSelectedCategory(null);
      setCategoryName("");
      setParentCategoryId("0");
      fetchData(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || "Failed to update");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    setConfirmDialog({
      open: true,
      title: "Delete Category",
      description: "Are you sure you want to delete this category? This action cannot be undone.",
      variant: "destructive",
      onConfirm: async () => {
        try {
          await apiClient.delete(`/categories/${id}`);
          toast.success("Category deleted successfully");
          fetchData(false);
        } catch (error: any) {
          toast.error(error.response?.data?.error?.message || "Failed to delete");
        }
      },
    });
  };

  const handleDeleteProduct = async (id: number) => {
    setConfirmDialog({
      open: true,
      title: "Delete Product",
      description: "Are you sure you want to delete this product? This action cannot be undone.",
      variant: "destructive",
      onConfirm: async () => {
        try {
          await apiClient.delete(`/products/${id}`);
          toast.success("Product deleted successfully");
          fetchData(false);
        } catch (error: any) {
          toast.error(error.response?.data?.error?.message || "Failed to delete");
        }
      },
    });
  };

  const handleDeleteUser = async (id: number) => {
    setConfirmDialog({
      open: true,
      title: "Delete User",
      description: "Are you sure you want to delete this user? This action cannot be undone.",
      variant: "destructive",
      onConfirm: async () => {
        try {
          await apiClient.delete(`/admin/users/${id}`);
          toast.success("User deleted successfully");
          fetchData(false);
        } catch (error: any) {
          toast.error(error.response?.data?.error?.message || "Failed to delete");
        }
      },
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "text-green-500";
      case "ended":
        return "text-gray-500";
      case "cancelled":
        return "text-red-500";
      default:
        return "text-gray-400";
    }
  };

  if (loading) return <Loading />;

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex items-center gap-2 text-muted-foreground">
          <AlertCircle className="h-5 w-5" />
          <span>Unable to load data</span>
        </div>
      </div>
    );
  }

  const parentCategories = categories.filter((c) => !c.parentId);

  const flattenedCategories = categories.reduce((acc: Category[], parent) => {
    acc.push(parent);
    if (parent.children && parent.children.length > 0) {
      acc.push(...parent.children);
    }
    return acc;
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
            Admin Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage categories, products, and users
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(value: any) => setPeriod(value)}>
            <SelectTrigger className="w-40 bg-background hover:bg-accent h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={() => setSettingsDialogOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Configure Auto-Extend
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">New Auctions</p>
              <p className="text-xl font-bold">{stats.newAuctions}</p>
            </div>
            <Gavel className="h-5 w-5 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Revenue</p>
              <p className="text-lg font-bold text-green-600">
                {(stats.revenue / 1000000).toFixed(1)}M
              </p>
            </div>
            <DollarSign className="h-5 w-5 text-green-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">New Users</p>
              <p className="text-xl font-bold">{stats.newUsers}</p>
            </div>
            <Users className="h-5 w-5 text-purple-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Pending Upgrades</p>
              <p className="text-xl font-bold">{stats.upgradeRequests}</p>
            </div>
            <TrendingUp className="h-5 w-5 text-orange-500" />
          </div>
        </Card>
      </div>

      {/* Charts */}
      <DashboardCharts period={period} />

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Categories */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Categories</CardTitle>
              <Button
                size="sm"
                onClick={() => {
                  setSelectedCategory(null);
                  setCategoryName("");
                  setParentCategoryId("0");
                  setCategoryDialogOpen(true);
                }}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-hidden">
              <Table className="text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-24">Parent</TableHead>
                    <TableHead className="w-20 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flattenedCategories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4 text-xs text-muted-foreground">
                        No categories
                      </TableCell>
                    </TableRow>
                  ) : (
                    flattenedCategories.map((cat) => (
                      <TableRow key={cat.id}>
                        <TableCell className="text-xs">{cat.id}</TableCell>
                        <TableCell className="text-xs font-medium">{cat.name}</TableCell>
                        <TableCell className="text-xs">
                          {cat.parentId
                            ? flattenedCategories.find((c) => c.id === cat.parentId)?.name?.substring(0, 8)
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 justify-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => {
                                setSelectedCategory(cat);
                                setCategoryName(cat.name);
                                setParentCategoryId(cat.parentId?.toString() || "0");
                                setCategoryDialogOpen(true);
                              }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                              onClick={() => handleDeleteCategory(cat.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Pending Upgrades */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {stats.upgradeRequests > 0 ? (
                <span>
                  Pending Upgrades{" "}
                  <Badge className="ml-2 text-xs" variant="destructive">
                    {stats.upgradeRequests}
                  </Badge>
                </span>
              ) : (
                "Pending Upgrades"
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-hidden">
              <Table className="text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">ID</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="w-32 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.filter((u) => u.upgradeRequestStatus === "pending").length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-4 text-xs text-muted-foreground">
                        No pending requests
                      </TableCell>
                    </TableRow>
                  ) : (
                    users
                      .filter((u) => u.upgradeRequestStatus === "pending")
                      .map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="text-xs">{u.id}</TableCell>
                          <TableCell className="text-xs truncate">{u.email}</TableCell>
                          <TableCell>
                            <div className="flex gap-1 justify-center">
                              <Button
                                size="sm"
                                variant="default"
                                className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700"
                                onClick={async () => {
                                  try {
                                    await apiClient.put(`/admin/upgrade-requests/${u.id}/approve`);
                                    toast.success("Approved");
                                    await Promise.all([
                                      fetchUsers(usersPage, usersSearch, usersRole),
                                      fetchStats()
                                    ]);
                                    // Refresh users list gently
                                    fetchUsers(usersPage, usersSearch, usersRole);
                                  } catch (error: any) {
                                    toast.error(error.response?.data?.error?.message || "Failed to approve");
                                  }
                                }}
                              >
                                ✓
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs"
                                onClick={() => {
                                  setRejectDialog({ open: true, userId: u.id });
                                  setRejectReason("");
                                }}
                              >
                                ✗
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Products */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">Products</CardTitle>
            <div className="flex gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  className="pl-8 h-9 text-sm"
                  value={productsSearch}
                  onChange={(e) => handleProductsSearch(e.target.value)}
                />
              </div>
              <Select value={productsStatus || "all"} onValueChange={handleProductsStatusFilter}>
                <SelectTrigger className="w-32 h-9 text-sm">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="ended">Ended</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-x-auto">
            <Table className="text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-24">Category</TableHead>
                  <TableHead className="w-24">Seller</TableHead>
                  <TableHead className="w-20 text-center">Status</TableHead>
                  <TableHead className="w-24 text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4 text-xs text-muted-foreground">
                      No products
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs">{p.id}</TableCell>
                      <TableCell className="text-xs font-medium truncate max-w-xs">{p.name}</TableCell>
                      <TableCell className="text-xs">{p.category.name.substring(0, 12)}</TableCell>
                      <TableCell className="text-xs truncate">{p.seller.fullName.substring(0, 15)}</TableCell>
                      <TableCell className="text-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center justify-center">
                                <Circle className={`h-2.5 w-2.5 fill-current ${getStatusColor(p.status)}`} />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="capitalize">{p.status}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex gap-1 justify-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => navigate(`/products/${p.id}`)}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                            onClick={() => handleDeleteProduct(p.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {productsTotalPages > 1 && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t">
              <span className="text-xs text-muted-foreground">
                Page {productsPage} of {productsTotalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => {
                    if (productsPage > 1) {
                      setProductsPage(productsPage - 1);
                      fetchProducts(productsPage - 1, productsSearch, productsStatus);
                    }
                  }}
                  disabled={productsPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => {
                    if (productsPage < productsTotalPages) {
                      setProductsPage(productsPage + 1);
                      fetchProducts(productsPage + 1, productsSearch, productsStatus);
                    }
                  }}
                  disabled={productsPage === productsTotalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Users */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">Users</CardTitle>
            <div className="flex gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email or name..."
                  className="pl-8 h-9 text-sm"
                  value={usersSearch}
                  onChange={(e) => handleUsersSearch(e.target.value)}
                />
              </div>
              <Select value={usersRole || "all"} onValueChange={handleUsersRoleFilter}>
                <SelectTrigger className="w-32 h-9 text-sm">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="bidder">Bidder</SelectItem>
                  <SelectItem value="seller">Seller</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-x-auto">
            <Table className="text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">ID</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-20">Name</TableHead>
                  <TableHead className="w-16">Role</TableHead>
                  <TableHead className="w-24">Upgrade</TableHead>
                  <TableHead className="w-24 text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4 text-xs text-muted-foreground">
                      No users
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="text-xs">{u.id}</TableCell>
                      <TableCell className="text-xs truncate">{u.email}</TableCell>
                      <TableCell className="text-xs truncate">{u.fullName.substring(0, 15)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={u.role === "admin" ? "destructive" : "default"}
                          className="text-xs"
                        >
                          {u.role === "admin" ? "Admin" : u.role === "seller" ? "Seller" : "Bidder"}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        {(() => {
                          const isExpired =
                            u.upgradeExpireAt && new Date(u.upgradeExpireAt) < new Date();
                          const status = isExpired ? null : u.upgradeRequestStatus;

                          return (
                            <Badge
                              variant={
                                status === "pending"
                                  ? "outline"
                                  : status === "approved"
                                  ? "default"
                                  : status === "rejected"
                                  ? "destructive"
                                  : "secondary"
                              }
                              className={`text-xs ${
                                status === "approved" ? "bg-green-500 hover:bg-green-600" : ""
                              }`}
                            >
                              {status ? status.charAt(0).toUpperCase() + status.slice(1) : "-"}
                            </Badge>
                          );
                        })()}
                      </TableCell>

                      <TableCell className="text-center">
                        <div className="flex gap-1 justify-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => setUserDetailsModal({ open: true, userId: u.id })}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                            onClick={() => handleDeleteUser(u.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {usersTotalPages > 1 && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t">
              <span className="text-xs text-muted-foreground">
                Page {usersPage} of {usersTotalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => {
                    if (usersPage > 1) {
                      setUsersPage(usersPage - 1);
                      fetchUsers(usersPage - 1, usersSearch, usersRole);
                    }
                  }}
                  disabled={usersPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => {
                    if (usersPage < usersTotalPages) {
                      setUsersPage(usersPage + 1);
                      fetchUsers(usersPage + 1, usersSearch, usersRole);
                    }
                  }}
                  disabled={usersPage === usersTotalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedCategory ? "Edit Category" : "New Category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Category name"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
            />
            <Select value={parentCategoryId} onValueChange={setParentCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Parent category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">None</SelectItem>
                {parentCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button 
              onClick={selectedCategory ? handleUpdateCategory : handleCreateCategory}
              disabled={!categoryName.trim() || actionLoading}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4" />
                  {selectedCategory ? "Updating..." : "Creating..."}
                </>
              ) : (
                selectedCategory ? "Update" : "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Auto-Extend Settings Dialog */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Auto-Extend Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Minutes before end to trigger (minutes)</label>
              <Input
                type="number"
                min="1"
                value={autoExtendSettings.thresholdMinutes}
                onChange={(e) =>
                  setAutoExtendSettings({
                    ...autoExtendSettings,
                    thresholdMinutes: parseInt(e.target.value) || 5,
                  })
                }
                placeholder="5"
              />
              <p className="text-xs text-muted-foreground">
                When there is a new bid within this time period before the end, the product will automatically extend
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Extension duration (minutes)</label>
              <Input
                type="number"
                min="1"
                value={autoExtendSettings.durationMinutes}
                onChange={(e) =>
                  setAutoExtendSettings({
                    ...autoExtendSettings,
                    durationMinutes: parseInt(e.target.value) || 10,
                  })
                }
                placeholder="10"
              />
              <p className="text-xs text-muted-foreground">
                Number of minutes to add to the end time when there is a new bid
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsDialogOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button onClick={handleUpdateAutoExtendSettings} disabled={actionLoading}>
              {actionLoading ? (
                 <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                 </>
              ) : "Save Settings"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
        title={confirmDialog.title}
        description={confirmDialog.description}
        onConfirm={confirmDialog.onConfirm}
        variant={confirmDialog.variant}
      />

      {/* Rejection Reason Dialog */}
      <Dialog
        open={rejectDialog.open}
        onOpenChange={(open) => setRejectDialog({ ...rejectDialog, open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Upgrade Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason for rejection</label>
              <Input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter reason..."
                className="bg-background"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialog({ open: false, userId: null })}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || actionLoading}
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={async () => {
                if (!rejectDialog.userId) return;
                try {
                  setActionLoading(true);
                  await apiClient.put(`/admin/upgrade-requests/${rejectDialog.userId}/reject`, {
                    reason: rejectReason,
                  });
                  toast.success("Request rejected");
                  setRejectDialog({ open: false, userId: null });
                  setRejectReason("");
                  await Promise.all([
                    fetchUsers(usersPage, usersSearch, usersRole),
                    fetchStats()
                  ]);
                } catch (error: any) {
                  toast.error(error.response?.data?.error?.message || "Failed to reject request");
                } finally {
                  setActionLoading(false);
                }
              }}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                "Reject"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Details Modal */}
      <UserDetailsModal
        userId={userDetailsModal.userId}
        open={userDetailsModal.open}
        onClose={() => setUserDetailsModal({ open: false, userId: null })}
        onRoleUpdated={() => fetchData(false)}
      />
    </div>
  );
}
