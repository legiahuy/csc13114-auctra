import { Routes, Route } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import ProductListPage from './pages/ProductListPage';
import ProductDetailPage from './pages/ProductDetailPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import WatchlistPage from './pages/WatchlistPage';
import MyBidsPage from './pages/MyBidsPage';
import SellerDashboardPage from './pages/SellerDashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import OrderPage from './pages/OrderPage';

function App() {
  const { user } = useAuthStore();

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/products" element={<ProductListPage />} />
        <Route path="/products/:id" element={<ProductDetailPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        {user && (
          <>
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/watchlist" element={<WatchlistPage />} />
            <Route path="/my-bids" element={<MyBidsPage />} />
            {user.role === 'seller' && (
              <Route path="/seller/dashboard" element={<SellerDashboardPage />} />
            )}
            {user.role === 'admin' && (
              <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            )}
            <Route path="/orders/:orderId" element={<OrderPage />} />
          </>
        )}
      </Routes>
    </Layout>
  );
}

export default App;

