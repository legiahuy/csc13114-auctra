import { useEffect, useState } from 'react';
import { Grid, Card, CardMedia, CardContent, Typography, Box, Button } from '@mui/material';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import { formatDistanceToNow } from 'date-fns';

interface Product {
  id: number;
  name: string;
  currentPrice: number;
  mainImage: string;
  endDate: string;
  bidCount: number;
  seller: {
    fullName: string;
  };
}

export default function HomePage() {
  const [endingSoon, setEndingSoon] = useState<Product[]>([]);
  const [mostBids, setMostBids] = useState<Product[]>([]);
  const [highestPrice, setHighestPrice] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiClient.get('/products/homepage');
        const { data } = response.data;
        setEndingSoon(data.endingSoon);
        setMostBids(data.mostBids);
        setHighestPrice(data.highestPrice);
      } catch (error) {
        console.error('Error fetching homepage data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <Typography>Đang tải...</Typography>;
  }

  const ProductCard = ({ product }: { product: Product }) => (
    <Card sx={{ height: '100%' }}>
      <CardMedia
        component="img"
        height="200"
        image={product.mainImage}
        alt={product.name}
      />
      <CardContent>
        <Typography variant="h6" component={Link} to={`/products/${product.id}`} sx={{ textDecoration: 'none', color: 'inherit' }}>
          {product.name}
        </Typography>
        <Typography variant="h5" color="primary" sx={{ mt: 1 }}>
          {product.currentPrice.toLocaleString('vi-VN')} VNĐ
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Còn lại: {formatDistanceToNow(new Date(product.endDate), { addSuffix: true })}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {product.bidCount} lượt đấu giá
        </Typography>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Sản phẩm sắp kết thúc
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {endingSoon.map((product) => (
          <Grid item xs={12} sm={6} md={4} key={product.id}>
            <ProductCard product={product} />
          </Grid>
        ))}
      </Grid>

      <Typography variant="h4" gutterBottom>
        Sản phẩm có nhiều lượt đấu giá nhất
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {mostBids.map((product) => (
          <Grid item xs={12} sm={6} md={4} key={product.id}>
            <ProductCard product={product} />
          </Grid>
        ))}
      </Grid>

      <Typography variant="h4" gutterBottom>
        Sản phẩm có giá cao nhất
      </Typography>
      <Grid container spacing={3}>
        {highestPrice.map((product) => (
          <Grid item xs={12} sm={6} md={4} key={product.id}>
            <ProductCard product={product} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

