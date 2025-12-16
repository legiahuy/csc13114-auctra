import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

  const handlePageChange = (page: number) => {
    setSearchParams({ ...Object.fromEntries(searchParams), page: page.toString() });
  };

  const handleSearch = () => {
    setSearchParams({ ...Object.fromEntries(searchParams), search, page: '1' });
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="search">Search</Label>
          <div className="flex gap-2">
            <Input
              id="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search products..."
            />
            <Button onClick={handleSearch}>Search</Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Sort by</Label>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="endDate">End time</SelectItem>
              <SelectItem value="price">Price</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Order</Label>
          <Select value={sortOrder} onValueChange={setSortOrder}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ASC">Ascending</SelectItem>
              <SelectItem value="DESC">Descending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <Card key={product.id} className="h-full hover:shadow-lg transition-shadow">
            <div className="aspect-video overflow-hidden rounded-t-xl">
              <img
                src={product.mainImage}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            <CardContent className="p-6 space-y-3">
              <Link
                to={`/products/${product.id}`}
                className="text-lg font-semibold hover:text-primary transition-colors block leading-tight"
              >
                {product.name}
              </Link>
              <p className="text-2xl font-bold text-primary leading-tight">
                {product.currentPrice.toLocaleString('vi-VN')} VNĐ
              </p>
              <div className="space-y-1.5 text-sm text-muted-foreground">
                <p className="leading-relaxed">
                  Time left: {formatDistanceToNow(new Date(product.endDate), { addSuffix: true })}
                </p>
                <p className="leading-relaxed">
                  {product.bidCount} bids
                </p>
                {product.bids && product.bids[0] && (
                  <p className="leading-relaxed">
                    Highest bidder: {product.bids[0].bidder.fullName}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <Button
            variant="outline"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {pagination.page} / {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
