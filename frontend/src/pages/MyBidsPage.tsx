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
  Chip,
  Alert,
} from "@mui/material";
import apiClient from "../api/client";
import { useAuthStore } from "../store/authStore";
import toast from "react-hot-toast";
import { format } from "date-fns";

interface Bid {
  id: number;
  amount: number;
  createdAt: string;
  product: {
    id: number;
    name: string;
    mainImage: string;
    currentPrice: number;
    endDate: string;
    status: string;
    category: {
      name: string;
    };
  };
}

export default function MyBidsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    fetchBids();
  }, [user, navigate]);

  const fetchBids = async () => {
    try {
      const response = await apiClient.get("/users/bids");
      setBids(response.data.data || []);
    } catch (error) {
      console.error("Error fetching bids:", error);
      toast.error("Unable to load bid history");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  const activeBids = bids.filter((bid) => bid.product.status === "active");
  const endedBids = bids.filter((bid) => bid.product.status !== "active");

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Bid History
      </Typography>

      {bids.length === 0 ? (
        <Alert severity="info">You have not placed any bids yet</Alert>
      ) : (
        <>
          {activeBids.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                Active bids ({activeBids.length})
              </Typography>
              <Grid container spacing={3}>
                {activeBids.map((bid) => (
                  <Grid item xs={12} sm={6} md={4} key={bid.id}>
                    <Card>
                      <CardMedia
                        component="img"
                        height="250"
                        image={bid.product.mainImage}
                        alt={bid.product.name}
                      />
                      <CardContent>
                        <Typography variant="h6" noWrap>
                          {bid.product.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {bid.product.category.name}
                        </Typography>
                        <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
                          Your bid:{" "}
                          {parseFloat(bid.amount.toString()).toLocaleString(
                            "vi-VN"
                          )}{" "}
                          VNĐ
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Current price:{" "}
                          {parseFloat(
                            bid.product.currentPrice.toString()
                          ).toLocaleString("vi-VN")}{" "}
                          VNĐ
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {format(new Date(bid.createdAt), "dd/MM/yyyy HH:mm")}
                        </Typography>
                        <Chip
                          label="Active"
                          color="success"
                          size="small"
                          sx={{ mt: 1 }}
                        />
                      </CardContent>
                      <CardActions>
                        <Button
                          size="small"
                          onClick={() =>
                            navigate(`/products/${bid.product.id}`)
                          }
                        >
                          View details
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {endedBids.length > 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Ended ({endedBids.length})
              </Typography>
              <Grid container spacing={3}>
                {endedBids.map((bid) => (
                  <Grid item xs={12} sm={6} md={4} key={bid.id}>
                    <Card>
                      <CardMedia
                        component="img"
                        height="250"
                        image={bid.product.mainImage}
                        alt={bid.product.name}
                      />
                      <CardContent>
                        <Typography variant="h6" noWrap>
                          {bid.product.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {bid.product.category.name}
                        </Typography>
                        <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
                          Your bid:{" "}
                          {parseFloat(bid.amount.toString()).toLocaleString(
                            "vi-VN"
                          )}{" "}
                          VNĐ
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {format(new Date(bid.createdAt), "dd/MM/yyyy HH:mm")}
                        </Typography>
                        <Chip
                          label="Ended"
                          color="default"
                          size="small"
                          sx={{ mt: 1 }}
                        />
                      </CardContent>
                      <CardActions>
                        <Button
                          size="small"
                          onClick={() =>
                            navigate(`/products/${bid.product.id}`)
                          }
                        >
                          Xem chi tiết
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
