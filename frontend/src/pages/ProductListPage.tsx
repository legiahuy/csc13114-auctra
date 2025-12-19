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
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '../api/client';
import { formatDistanceToNow } from 'date-fns';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { Heart, HeartOff } from 'lucide-react';

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
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [categoryId, setCategoryId] = useState(searchParams.get('categoryId') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'endDate');
  const [sortOrder, setSortOrder] = useState(searchParams.get('sortOrder') || 'ASC');
  const [watchlistIds, setWatchlistIds] = useState<Set<number>>(new Set());
  const [watchlistLoading, setWatchlistLoading] = useState(false);

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

  useEffect(() => {
    const fetchWatchlist = async () => {
      if (!user) {
        setWatchlistIds(new Set());
        return;
      }
      setWatchlistLoading(true);
      try {
        const res = await apiClient.get('/users/watchlist');
        const ids = new Set<number>();
        res.data.data.forEach((item: any) => {
          if (item.product?.id) {
            ids.add(item.product.id);
          }
        });
        setWatchlistIds(ids);
      } catch (error) {
        console.error('Error fetching watchlist:', error);
      } finally {
        setWatchlistLoading(false);
      }
    };

    fetchWatchlist();
  }, [user]);

  const handlePageChange = (page: number) => {
    setSearchParams({ ...Object.fromEntries(searchParams), page: page.toString() });
  };

  const handleSearch = () => {
    setSearchParams({ ...Object.fromEntries(searchParams), search, page: '1' });
  };

  const handleToggleWatchlist = async (productId: number) => {
    if (!user) {
      toast.error('Vui lòng đăng nhập để thêm yêu thích');
      navigate('/login');
      return;
    }

    const isFavorite = watchlistIds.has(productId);
    try {
      if (isFavorite) {
        await apiClient.delete(`/users/watchlist/${productId}`);
        toast.success('Đã xóa khỏi danh sách yêu thích');
        setWatchlistIds((prev) => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
      } else {
        await apiClient.post('/users/watchlist', { productId });
        toast.success('Đã thêm vào danh sách yêu thích');
        setWatchlistIds((prev) => new Set(prev).add(productId));
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Thao tác thất bại');
    }
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
            <div className="relative aspect-video overflow-hidden rounded-t-xl">
              <button
                className="absolute right-3 top-3 z-10 rounded-full bg-white/85 p-2 shadow-sm transition hover:shadow-md"
                onClick={() => handleToggleWatchlist(product.id)}
                aria-label={watchlistIds.has(product.id) ? 'Xóa khỏi yêu thích' : 'Thêm vào yêu thích'}
                disabled={watchlistLoading}
              >
                {watchlistIds.has(product.id) ? (
                  <Heart className="h-5 w-5 text-red-500 fill-red-500" />
                ) : (
                  <HeartOff className="h-5 w-5 text-gray-600" />
                )}
              </button>
              <img src={product.mainImage} alt={product.name} className="w-full h-full object-cover" />
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
