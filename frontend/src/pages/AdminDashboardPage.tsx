import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  TrendingUp,
  Users,
  ShoppingBag,
  Gavel,
  DollarSign,
  Package,
} from "lucide-react";
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
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );
  const [categoryName, setCategoryName] = useState("");
  const [parentCategoryId, setParentCategoryId] = useState("");
  const [loading, setLoading] = useState(true);
  const [autoExtendSettings, setAutoExtendSettings] = useState({
    thresholdMinutes: 5,
    durationMinutes: 10,
  });
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/");
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      const [dashboardRes, categoriesRes, usersRes, productsRes, settingsRes] =
        await Promise.all([
          apiClient.get("/admin/dashboard"),
          apiClient.get("/categories"),
          apiClient.get("/admin/users"),
          apiClient.get("/admin/products"),
          apiClient.get("/admin/settings/auto-extend").catch(() => null),
        ]);

      setStats(dashboardRes.data.data);
      setCategories(categoriesRes.data.data);
      setUsers(usersRes.data.data.users || []);
      setProducts(productsRes.data.data.products || []);
      if (settingsRes?.data?.data) {
        setAutoExtendSettings(settingsRes.data.data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Unable to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAutoExtendSettings = async () => {
    try {
      await apiClient.put("/admin/settings/auto-extend", autoExtendSettings);
      toast.success("Cấu hình tự động gia hạn đã được cập nhật");
      setSettingsDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(
        error.response?.data?.error?.message || "Không thể cập nhật cấu hình"
      );
    }
  };

  const handleCreateCategory = async () => {
    if (!categoryName.trim()) {
      toast.error("Please enter category name");
      return;
    }

    try {
      await apiClient.post("/categories", {
        name: categoryName,
        parentId: parentCategoryId || undefined,
      });
      toast.success("Category created successfully");
      setCategoryDialogOpen(false);
      setCategoryName("");
      setParentCategoryId("");
      fetchData();
    } catch (error: any) {
      toast.error(
        error.response?.data?.error?.message || "Failed to create category"
      );
    }
  };

  const handleUpdateCategory = async () => {
    if (!selectedCategory || !categoryName.trim()) {
      toast.error("Please enter category name");
      return;
    }

    try {
      await apiClient.put(`/categories/${selectedCategory.id}`, {
        name: categoryName,
        parentId: parentCategoryId || undefined,
      });
      toast.success("Category updated successfully");
      setCategoryDialogOpen(false);
      setSelectedCategory(null);
      setCategoryName("");
      setParentCategoryId("");
      fetchData();
    } catch (error: any) {
      toast.error(
        error.response?.data?.error?.message || "Failed to update"
      );
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this category?")) return;

    try {
      await apiClient.delete(`/categories/${id}`);
      toast.success("Category deleted successfully");
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || "Failed to delete");
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;

    try {
      await apiClient.delete(`/products/${id}`);
      toast.success("Product deleted successfully");
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || "Failed to delete");
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;

    try {
      await apiClient.delete(`/admin/users/${id}`);
      toast.success("User deleted successfully");
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || "Failed to delete");
    }
  };

  if (loading) {
    return <Loading />;
  }

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
  const hasPendingUpgrade = users.some(
    (u) => u.upgradeRequestStatus === "pending"
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-white mb-2">
          Admin Dashboard
        </h1>
        <Button
          variant="outline"
          onClick={() => setSettingsDialogOpen(true)}
        >
          <Edit className="h-4 w-4 mr-2" />
          Cấu hình tự động gia hạn
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              New Auctions (30 days)
            </CardTitle>
            <Gavel className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.newAuctions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Revenue (30 days)
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-brand">
              {stats.revenue.toLocaleString("vi-VN")} VNĐ
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              New Users (30 days)
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.newUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Upgrade Requests
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upgradeRequests}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Products
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeProducts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
          </CardContent>
        </Card>
      </div>

      {/* Categories Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Category Management</CardTitle>
            <Button
              onClick={() => {
                setSelectedCategory(null);
                setCategoryName("");
                setParentCategoryId("");
                setCategoryDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px] text-center">ID</TableHead>
                  <TableHead className="min-w-[200px] text-left">Name</TableHead>
                  <TableHead className="min-w-[150px] text-left">Parent Category</TableHead>
                  <TableHead className="w-[250px] text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No categories yet
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="text-center">{category.id}</TableCell>
                      <TableCell className="font-medium">
                        {category.name}
                      </TableCell>
                      <TableCell>
                        {category.parentId
                          ? categories.find((c) => c.id === category.parentId)
                              ?.name || "-"
                          : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedCategory(category);
                              setCategoryName(category.name);
                              setParentCategoryId(
                                category.parentId?.toString() || ""
                              );
                              setCategoryDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteCategory(category.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
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

      {/* Products Management */}
      <Card>
        <CardHeader>
          <CardTitle>Product Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px] text-center">ID</TableHead>
                  <TableHead className="min-w-[250px] text-left">Name</TableHead>
                  <TableHead className="min-w-[160px] text-left">Category</TableHead>
                  <TableHead className="min-w-[110px] text-left">Seller</TableHead>
                  <TableHead className="w-[250px] text-center">Status</TableHead>
                  <TableHead className="w-[120px] text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground py-8"
                    >
                      No products yet
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="text-center">{product.id}</TableCell>
                      <TableCell className="font-medium">
                        {product.name}
                      </TableCell>
                      <TableCell>{product.category.name}</TableCell>
                      <TableCell>{product.seller.fullName}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <Badge
                            variant={
                              product.status === "active"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {product.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteProduct(product.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
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

      {/* Users Management */}
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          {stats.upgradeRequests > 0 && (
            <CardDescription>
              <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 mt-4">
                <AlertCircle className="h-4 w-4 mt-0.5" />
                <p>
                  There are {stats.upgradeRequests} upgrade requests pending approval.
                </p>
              </div>
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px] text-center">ID</TableHead>
                  <TableHead className="w-[180px] text-left">Email</TableHead>
                  <TableHead className="w-[120px] text-left">Full Name</TableHead>
                  <TableHead className="w-[90px] text-center">Role</TableHead>
                  <TableHead className="w-[130px] text-center">Upgrade Request</TableHead>
                  {hasPendingUpgrade && <TableHead className="w-[160px] text-center">Approve</TableHead>}
                  <TableHead className="w-[100px] text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={hasPendingUpgrade ? 7 : 6}
                      className="text-center text-muted-foreground py-8"
                    >
                      No users yet
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="text-center">{user.id}</TableCell>
                      <TableCell className="truncate" title={user.email}>
                        {user.email}
                      </TableCell>
                      <TableCell className="font-medium truncate" title={user.fullName}>
                        {user.fullName}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={
                            user.role === "admin"
                              ? "destructive"
                              : user.role === "seller"
                              ? "default"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {user.role === "admin"
                            ? "Admin"
                            : user.role === "seller"
                            ? "Seller"
                            : "Bidder"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {user.upgradeRequestStatus === "pending" ? (
                          <Badge variant="outline" className="border-amber-500 text-amber-700 text-xs">
                            Pending
                          </Badge>
                        ) : user.upgradeRequestStatus === "approved" ? (
                          <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-xs">
                            Approved
                          </Badge>
                        ) : user.upgradeRequestStatus === "rejected" ? (
                          <Badge variant="destructive" className="text-xs">Đã từ chối</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      {hasPendingUpgrade && (
                        <TableCell className="text-center">
                          {user.upgradeRequestStatus === "pending" ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                size="sm"
                                variant="default"
                                className="bg-green-500 hover:bg-green-600 h-7 px-2 text-xs"
                                onClick={async () => {
                                  try {
                                    await apiClient.put(
                                      `/admin/upgrade-requests/${user.id}/approve`
                                    );
                                    toast.success(
                                      "Upgrade approved for 7 days"
                                    );
                                    fetchData();
                                  } catch (error: any) {
                                    toast.error(
                                      error.response?.data?.error?.message ||
                                        "Failed to approve upgrade"
                                    );
                                  }
                                }}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-amber-500 text-amber-700 hover:bg-amber-50 h-7 px-2 text-xs"
                                onClick={async () => {
                                  const reason =
                                    window.prompt(
                                      "Enter rejection reason (optional):"
                                    ) || "";
                                  try {
                                    await apiClient.put(
                                      `/admin/upgrade-requests/${user.id}/reject`,
                                      { reason }
                                    );
                                    toast.success("Upgrade request rejected");
                                    fetchData();
                                  } catch (error: any) {
                                    toast.error(
                                      error.response?.data?.error?.message ||
                                        "Failed to reject upgrade"
                                    );
                                  }
                                }}
                              >
                                Reject
                              </Button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      )}
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Delete
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

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedCategory ? "Edit Category" : "Add Category"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Category Name</label>
              <Input
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="Enter category name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Parent Category (optional)
              </label>
              <Select
                value={parentCategoryId}
                onValueChange={setParentCategoryId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parent category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {parentCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCategoryDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={
                selectedCategory ? handleUpdateCategory : handleCreateCategory
              }
            >
              {selectedCategory ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Auto-Extend Settings Dialog */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cấu hình tự động gia hạn</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Số phút trước khi kết thúc để kích hoạt (phút)
              </label>
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
                Khi có lượt đấu giá mới trong khoảng thời gian này trước khi kết thúc, sản phẩm sẽ tự động gia hạn
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Số phút gia hạn thêm (phút)
              </label>
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
                Số phút sẽ được thêm vào thời gian kết thúc khi có lượt đấu giá mới
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSettingsDialogOpen(false)}
            >
              Hủy
            </Button>
            <Button onClick={handleUpdateAutoExtendSettings}>
              Lưu cấu hình
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
