import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link, useSearchParams } from "react-router-dom";
import apiClient from "../api/client";
import { formatDistanceToNow } from "date-fns";
import { LoaderIcon } from "lucide-react";

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
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });

  // Local search input value (for immediate UI updates)
  const [searchInput, setSearchInput] = useState(
    searchParams.get("search") || ""
  );
  // Debounced search value (for actual API calls)
  const [debouncedSearch, setDebouncedSearch] = useState(
    searchParams.get("search") || ""
  );

  const [categoryId, setCategoryId] = useState(
    searchParams.get("categoryId") || ""
  );
  const [sortBy, setSortBy] = useState(searchParams.get("sortBy") || "endDate");
  const [sortOrder, setSortOrder] = useState(
    searchParams.get("sortOrder") || "ASC"
  );

  // Debounce search input - update debouncedSearch after 400ms of no typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Update URL params when debounced search changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (debouncedSearch.trim()) {
      params.set("search", debouncedSearch.trim());
    } else {
      params.delete("search");
    }
    params.set("page", "1"); // Reset to page 1 on search change
    setSearchParams(params, { replace: true });
  }, [debouncedSearch]);

  // Sync search input with URL params when they change externally (e.g., browser back/forward)
  // This effect only runs when searchParams change, and we check if it's different from our state
  useEffect(() => {
    const urlSearch = searchParams.get("search") || "";
    // Only sync if URL search is different from what we have in state
    // This prevents loops when we update URL from debouncedSearch
    if (urlSearch !== debouncedSearch) {
      setSearchInput(urlSearch);
      setDebouncedSearch(urlSearch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Fetch products when search params, sort, or category change
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params: any = {
          page: searchParams.get("page") || "1",
          limit: "12",
          sortBy,
          sortOrder,
        };
        const searchValue = searchParams.get("search");
        if (searchValue) params.search = searchValue;
        if (categoryId) params.categoryId = categoryId;

        const response = await apiClient.get("/products", { params });
        setProducts(response.data.data.products);
        setPagination(response.data.data.pagination);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [searchParams, sortBy, sortOrder, categoryId]);

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", page.toString());
    setSearchParams(params);
  };

  const handleSearchInputChange = (value: string) => {
    setSearchInput(value);
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setDebouncedSearch("");
  };

  if (loading && products.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-background">
        <LoaderIcon
          className="animate-spin size-5 mx-auto"
          role="status"
          aria-label="Loading"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="search">Search</Label>
          <div className="flex gap-2 relative">
            <Input
              id="search"
              value={searchInput}
              onChange={(e) => handleSearchInputChange(e.target.value)}
              placeholder="Search products..."
              className="pr-10"
            />
            {searchInput !== debouncedSearch && (
              <LoaderIcon
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors animate-spin size-4"
                role="status"
                aria-label="Loading"
              />
            )}
            {searchInput && searchInput === debouncedSearch && (
              <button
                onClick={handleClearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear search"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            )}
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

      {products.length === 0 && !loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No products found.</p>
          {searchParams.get("search") && (
            <p className="text-sm text-muted-foreground mt-2">
              Try adjusting your search terms.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <Card
              key={product.id}
              className="h-full hover:shadow-lg transition-shadow"
            >
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
                  {product.currentPrice.toLocaleString("vi-VN")} VNĐ
                </p>
                <div className="space-y-1.5 text-sm text-muted-foreground">
                  <p className="leading-relaxed">
                    Time left:{" "}
                    {formatDistanceToNow(new Date(product.endDate), {
                      addSuffix: true,
                    })}
                  </p>
                  <p className="leading-relaxed">{product.bidCount} bids</p>
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
      )}

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
