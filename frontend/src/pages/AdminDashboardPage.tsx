import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import apiClient from '../api/client';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

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
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [parentCategoryId, setParentCategoryId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      const [dashboardRes, categoriesRes, usersRes, productsRes] = await Promise.all([
        apiClient.get('/admin/dashboard'),
        apiClient.get('/categories'),
        apiClient.get('/admin/users'),
        apiClient.get('/admin/products'),
      ]);

      setStats(dashboardRes.data.data);
      setCategories(categoriesRes.data.data);
      setUsers(usersRes.data.data.users || []);
      setProducts(productsRes.data.data.products || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!categoryName.trim()) {
      toast.error('Vui lòng nhập tên danh mục');
      return;
    }

    try {
      await apiClient.post('/categories', {
        name: categoryName,
        parentId: parentCategoryId || undefined,
      });
      toast.success('Tạo danh mục thành công');
      setCategoryDialogOpen(false);
      setCategoryName('');
      setParentCategoryId('');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Tạo danh mục thất bại');
    }
  };

  const handleUpdateCategory = async () => {
    if (!selectedCategory || !categoryName.trim()) {
      toast.error('Vui lòng nhập tên danh mục');
      return;
    }

    try {
      await apiClient.put(`/categories/${selectedCategory.id}`, {
        name: categoryName,
        parentId: parentCategoryId || undefined,
      });
      toast.success('Cập nhật danh mục thành công');
      setCategoryDialogOpen(false);
      setSelectedCategory(null);
      setCategoryName('');
      setParentCategoryId('');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Cập nhật thất bại');
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa danh mục này?')) return;

    try {
      await apiClient.delete(`/categories/${id}`);
      toast.success('Xóa danh mục thành công');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Xóa thất bại');
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) return;

    try {
      await apiClient.delete(`/products/${id}`);
      toast.success('Xóa sản phẩm thành công');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Xóa thất bại');
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa người dùng này?')) return;

    try {
      await apiClient.delete(`/admin/users/${id}`);
      toast.success('Xóa người dùng thành công');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Xóa thất bại');
    }
  };

  if (loading) {
    return <Typography>Đang tải...</Typography>;
  }

  if (!stats) {
    return <Typography>Không thể tải dữ liệu</Typography>;
  }

  const parentCategories = categories.filter((c) => !c.parentId);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard quản trị
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Sàn đấu giá mới (30 ngày)
              </Typography>
              <Typography variant="h4">{stats.newAuctions}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Doanh thu (30 ngày)
              </Typography>
              <Typography variant="h4">
                {stats.revenue.toLocaleString('vi-VN')} VNĐ
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Người dùng mới (30 ngày)
              </Typography>
              <Typography variant="h4">{stats.newUsers}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Yêu cầu nâng cấp
              </Typography>
              <Typography variant="h4">{stats.upgradeRequests}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Sản phẩm đang hoạt động
              </Typography>
              <Typography variant="h4">{stats.activeProducts}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Tổng người dùng
              </Typography>
              <Typography variant="h4">{stats.totalUsers}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Tổng sản phẩm
              </Typography>
              <Typography variant="h4">{stats.totalProducts}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Categories Management */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Quản lý danh mục</Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              setSelectedCategory(null);
              setCategoryName('');
              setParentCategoryId('');
              setCategoryDialogOpen(true);
            }}
          >
            Thêm danh mục
          </Button>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Tên</TableCell>
                <TableCell>Danh mục cha</TableCell>
                <TableCell>Thao tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>{category.id}</TableCell>
                  <TableCell>{category.name}</TableCell>
                  <TableCell>
                    {category.parentId
                      ? categories.find((c) => c.id === category.parentId)?.name || '-'
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      startIcon={<Edit />}
                      onClick={() => {
                        setSelectedCategory(category);
                        setCategoryName(category.name);
                        setParentCategoryId(category.parentId?.toString() || '');
                        setCategoryDialogOpen(true);
                      }}
                    >
                      Sửa
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      startIcon={<Delete />}
                      onClick={() => handleDeleteCategory(category.id)}
                      sx={{ ml: 1 }}
                    >
                      Xóa
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Products Management */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Quản lý sản phẩm
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Tên</TableCell>
                <TableCell>Danh mục</TableCell>
                <TableCell>Người bán</TableCell>
                <TableCell>Trạng thái</TableCell>
                <TableCell>Thao tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>{product.id}</TableCell>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{product.category.name}</TableCell>
                  <TableCell>{product.seller.fullName}</TableCell>
                  <TableCell>
                    <Chip
                      label={product.status}
                      color={product.status === 'active' ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      color="error"
                      startIcon={<Delete />}
                      onClick={() => handleDeleteProduct(product.id)}
                    >
                      Xóa
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Users Management */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Quản lý người dùng
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Họ tên</TableCell>
                <TableCell>Vai trò</TableCell>
                <TableCell>Yêu cầu nâng cấp</TableCell>
                <TableCell>Thao tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.id}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.fullName}</TableCell>
                  <TableCell>
                    <Chip
                      label={user.role === 'admin' ? 'Admin' : user.role === 'seller' ? 'Seller' : 'Bidder'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {user.upgradeRequestStatus === 'pending' ? (
                      <Chip label="Đang chờ" color="warning" size="small" />
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      color="error"
                      startIcon={<Delete />}
                      onClick={() => handleDeleteUser(user.id)}
                    >
                      Xóa
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onClose={() => setCategoryDialogOpen(false)}>
        <DialogTitle>
          {selectedCategory ? 'Sửa danh mục' : 'Thêm danh mục'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Tên danh mục"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            margin="normal"
          />
          <TextField
            fullWidth
            select
            label="Danh mục cha (tùy chọn)"
            value={parentCategoryId}
            onChange={(e) => setParentCategoryId(e.target.value)}
            margin="normal"
          >
            <MenuItem value="">Không có</MenuItem>
            {parentCategories.map((cat) => (
              <MenuItem key={cat.id} value={cat.id.toString()}>
                {cat.name}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCategoryDialogOpen(false)}>Hủy</Button>
          <Button
            variant="contained"
            onClick={selectedCategory ? handleUpdateCategory : handleCreateCategory}
          >
            {selectedCategory ? 'Cập nhật' : 'Tạo'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
