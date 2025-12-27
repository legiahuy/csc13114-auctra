import { Routes, Route } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import Layout from "./components/Layout";
import { PublicRoute } from "./components/PublicRoute";
import HomePage from "./pages/HomePage";
import ProductListPage from "./pages/ProductListPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ProfilePage from "./pages/ProfilePage";
import WatchlistPage from "./pages/WatchlistPage";
import MyBidsPage from "./pages/MyBidsPage";
import SellerDashboardPage from "./pages/SellerDashboardPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import OrderPage from "./pages/OrderPage";
import CategoryPage from "./pages/CategoryPage";
import PaymentPage from "./pages/PaymentPage";

function App() {
  const { user } = useAuthStore();

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/products" element={<ProductListPage />} />
        <Route path="/products/:id" element={<ProductDetailPage />} />
        <Route path="/category/:slug" element={<CategoryPage />} />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          }
        />
        <Route
          path="/verify-email"
          element={
            <PublicRoute>
              <VerifyEmailPage />
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPasswordPage />
            </PublicRoute>
          }
        />
        <Route
          path="/reset-password"
          element={
            <PublicRoute>
              <ResetPasswordPage />
            </PublicRoute>
          }
        />
        {user && (
          <>
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/watchlist" element={<WatchlistPage />} />
            <Route path="/my-bids" element={<MyBidsPage />} />
            {user.role === "seller" && (
              <Route
                path="/seller/dashboard"
                element={<SellerDashboardPage />}
              />
            )}
            {user.role === "admin" && (
              <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            )}
            <Route path="/orders/:orderId" element={<OrderPage />} />
            <Route path="/payment/:orderId" element={<PaymentPage />} />
          </>
        )}
      </Routes>
    </Layout>
  );
}

export default App;
