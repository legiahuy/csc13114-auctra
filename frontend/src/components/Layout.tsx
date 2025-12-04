import { ReactNode, useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
  Menu,
  MenuItem,
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import apiClient from '../api/client';

interface LayoutProps {
  children: ReactNode;
}

interface Category {
  id: number;
  name: string;
  children?: Category[];
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryMenuAnchor, setCategoryMenuAnchor] = useState<null | HTMLElement>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await apiClient.get('/categories');
      setCategories(response.data.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleCategoryMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setCategoryMenuAnchor(event.currentTarget);
  };

  const handleCategoryMenuClose = () => {
    setCategoryMenuAnchor(null);
  };

  const handleCategoryClick = (categoryId: number) => {
    navigate(`/products?categoryId=${categoryId}`);
    handleCategoryMenuClose();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component={Link} to="/" sx={{ flexGrow: 1, textDecoration: 'none', color: 'inherit' }}>
            Online Auction
          </Typography>
          <Button color="inherit" component={Link} to="/products">
            Sản phẩm
          </Button>
          <Button color="inherit" onClick={handleCategoryMenuOpen}>
            Danh mục
          </Button>
          {user && (
            <>
              <Button color="inherit" component={Link} to="/watchlist">
                Yêu thích
              </Button>
              <Button color="inherit" component={Link} to="/my-bids">
                Lịch sử đấu giá
              </Button>
            </>
          )}
          <Menu
            anchorEl={categoryMenuAnchor}
            open={Boolean(categoryMenuAnchor)}
            onClose={handleCategoryMenuClose}
            MenuListProps={{ onMouseLeave: handleCategoryMenuClose }}
          >
            {categories.map((category) => (
              <MenuItem
                key={category.id}
                onClick={() => handleCategoryClick(category.id)}
                onMouseEnter={(e) => {
                  if (category.children && category.children.length > 0) {
                    // Show submenu logic can be added here if needed
                  }
                }}
              >
                {category.name}
                {category.children && category.children.length > 0 && ' ▸'}
              </MenuItem>
            ))}
            {categories.map((category) =>
              category.children && category.children.length > 0
                ? category.children.map((child) => (
                    <MenuItem
                      key={child.id}
                      onClick={() => handleCategoryClick(child.id)}
                      sx={{ pl: 4 }}
                    >
                      {child.name}
                    </MenuItem>
                  ))
                : null
            )}
          </Menu>
          {user ? (
            <>
              <Button color="inherit" component={Link} to="/profile">
                {user.fullName}
              </Button>
              {user.role === 'seller' && (
                <Button color="inherit" component={Link} to="/seller/dashboard">
                  Dashboard
                </Button>
              )}
              {user.role === 'admin' && (
                <Button color="inherit" component={Link} to="/admin/dashboard">
                  Admin
                </Button>
              )}
              <Button color="inherit" onClick={handleLogout}>
                Đăng xuất
              </Button>
            </>
          ) : (
            <>
              <Button color="inherit" component={Link} to="/login">
                Đăng nhập
              </Button>
              <Button color="inherit" component={Link} to="/register">
                Đăng ký
              </Button>
            </>
          )}
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ flex: 1, py: 4 }}>
        {children}
      </Container>
      <Box component="footer" sx={{ py: 2, textAlign: 'center', bgcolor: 'grey.200' }}>
        <Typography variant="body2">© 2025 Online Auction Platform</Typography>
      </Box>
    </Box>
  );
}

