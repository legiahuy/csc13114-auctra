import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Button,
  IconButton,
  Alert,
} from "@mui/material";
import { Favorite, Delete } from "@mui/icons-material";
import apiClient from "../api/client";
import { useAuthStore } from "../store/authStore";
import toast from "react-hot-toast";
import { format } from "date-fns";

interface WatchlistItem {
  id: number;
  product: {
    id: number;
    name: string;
    mainImage: string;
    currentPrice: number;
    endDate: string;
    status: string;
    bidCount: number;
    category: {
      name: string;
    };
  };
}

export default function WatchlistPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    fetchWatchlist();
  }, [user, navigate]);

  const fetchWatchlist = async () => {
    try {
      const response = await apiClient.get("/users/watchlist");
      setWatchlist(response.data.data || []);
    } catch (error) {
      console.error("Error fetching watchlist:", error);
      toast.error("Không thể tải danh sách yêu thích");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (productId: number) => {
    try {
      await apiClient.delete(`/users/watchlist/${productId}`);
      toast.success("Đã xóa khỏi danh sách yêu thích");
      fetchWatchlist();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || "Xóa thất bại");
    }
  };

  if (loading) {
    return <Typography>Đang tải...</Typography>;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Danh sách yêu thích
      </Typography>

      {watchlist.length === 0 ? (
        <Alert severity="info">Chưa có sản phẩm yêu thích nào</Alert>
      ) : (
        <Grid container spacing={3}>
          {watchlist.map((item) => (
            <Grid item xs={12} sm={6} md={4} key={item.id}>
              <Card>
                <CardMedia
                  component="img"
                  height="250"
                  image={item.product.mainImage}
                  alt={item.product.name}
                />
                <CardContent>
                  <Typography variant="h6" noWrap>
                    {item.product.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.product.category.name}
                  </Typography>
                  <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
                    {parseFloat(
                      item.product.currentPrice.toString()
                    ).toLocaleString("vi-VN")}{" "}
                    VNĐ
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.product.bidCount} lượt đấu giá
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Kết thúc:{" "}
                    {format(new Date(item.product.endDate), "dd/MM/yyyy HH:mm")}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    onClick={() => navigate(`/products/${item.product.id}`)}
                  >
                    Xem chi tiết
                  </Button>
                  <IconButton
                    color="error"
                    onClick={() => handleRemove(item.product.id)}
                  >
                    <Delete />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
