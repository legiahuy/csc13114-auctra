import { useState, useEffect } from 'react';
import { Grid, Card, CardMedia, CardContent, Typography, Box, TextField, Select, MenuItem, FormControl, InputLabel, Pagination } from '@mui/material';
import { Link, useSearchParams } from 'react-router-dom';
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
  bids: Array<{
    bidder: {
      fullName: string;
    };
  }>;
}

export default function ProductListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [categoryId, setCategoryId] = useState(searchParams.get('categoryId') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'endDate');
  const [sortOrder, setSortOrder] = useState(searchParams.get('sortOrder') || 'ASC');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const params: any = {
          page: searchParams.get('page') || '1',
          limit: '12',
          sortBy,
          sortOrder,
        };
        if (search) params.search = search;
        if (categoryId) params.categoryId = categoryId;

        const response = await apiClient.get('/products', { params });
        setProducts(response.data.data.products);
        setPagination(response.data.data.pagination);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [searchParams, sortBy, sortOrder, search, categoryId]);

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setSearchParams({ ...Object.fromEntries(searchParams), page: value.toString() });
  };

  if (loading) {
    return <Typography>Đang tải...</Typography>;
  }

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          label="Tìm kiếm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: 1, minWidth: 200 }}
        />
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Sắp xếp</InputLabel>
          <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <MenuItem value="endDate">Thời gian kết thúc</MenuItem>
            <MenuItem value="price">Giá</MenuItem>
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Thứ tự</InputLabel>
          <Select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
            <MenuItem value="ASC">Tăng dần</MenuItem>
            <MenuItem value="DESC">Giảm dần</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Grid container spacing={3}>
        {products.map((product) => (
          <Grid item xs={12} sm={6} md={4} key={product.id}>
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
                {product.bids && product.bids[0] && (
                  <Typography variant="body2" color="text.secondary">
                    Người đặt giá cao nhất: {product.bids[0].bidder.fullName}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <Pagination
          count={pagination.totalPages}
          page={pagination.page}
          onChange={handlePageChange}
          color="primary"
        />
      </Box>
    </Box>
  );
}

