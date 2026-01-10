import { useEffect, useState } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { useSearchParams } from "react-router-dom";
import apiClient from "../api/client";
import { LoaderIcon } from "lucide-react";
import { ProductCard, type ProductCardProduct } from "@/components/ProductCard";
import Loading from "@/components/Loading";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "../store/authStore";

interface Category {
  id: number;
  name: string;
  children?: Category[];
}

type Product = ProductCardProduct;

export default function ProductListPage() {
  const { user } = useAuthStore();

  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });

  const [categories, setCategories] = useState<Category[]>([]);

  // Watchlist (from feature-bidder)
  const [watchlistIds, setWatchlistIds] = useState<Set<number>>(new Set());

  // Helper to find a category or child category name by id
  const getCategoryNameById = (id?: string | number) => {
    if (!id) return undefined;
    const numId = Number(id);
    for (const category of categories) {
      if (category.id === numId) return category.name;
      if (category.children) {
        const child = category.children.find((c) => c.id === numId);
        if (child) return child.name;
      }
    }
    return undefined;
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await apiClient.get("/categories");
        setCategories(response.data.data || []);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };

    fetchCategories();
  }, []);

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

  // Sync category -> URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (categoryId) {
      params.set("categoryId", categoryId);
    } else {
      params.delete("categoryId");
    }
    params.set("page", "1");
    setSearchParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId]);

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
    params.set("page", "1");
    setSearchParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // Sync search input with URL params when they change externally (e.g., browser back/forward)
  useEffect(() => {
    const urlSearch = searchParams.get("search") || "";
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

        const categoryIdParam = searchParams.get("categoryId");
        if (categoryIdParam) params.categoryId = categoryIdParam;

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
  }, [searchParams, sortBy, sortOrder]);

  // Fetch watchlist
  useEffect(() => {
    const fetchWatchlist = async () => {
      if (!user) {
        setWatchlistIds(new Set());
        return;
      }
      try {
        const res = await apiClient.get("/users/watchlist");
        const ids = new Set<number>();
        res.data.data.forEach((item: any) => {
          if (item.product?.id) ids.add(item.product.id);
        });
        setWatchlistIds(ids);
      } catch (error) {
        console.error("Error fetching watchlist:", error);
      }
    };

    fetchWatchlist();
  }, [user]);

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", page.toString());
    setSearchParams(params);
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setDebouncedSearch("");
  };

  const handleWatchlistChange = (productId: number, isInWatchlist: boolean) => {
    setWatchlistIds((prev) => {
      const next = new Set(prev);
      if (isInWatchlist) {
        next.add(productId);
      } else {
        next.delete(productId);
      }
      return next;
    });
  };



  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl md:text-5xl font-bold text-neutral-800 dark:text-neutral-200 font-sans mb-4">
          Explore Products
        </h1>
        <p className="text-lg text-neutral-600 dark:text-neutral-400">
          {pagination.total} product{pagination.total !== 1 ? "s" : ""}{" "}
          available
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="search">Search</Label>
          <div className="flex gap-2 relative">
            <Input
              id="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search products..."
              className="pr-10 bg-background"
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

        <div className="flex flex-col space-y-1.5">
          <Label>Category</Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="w-[180px] h-9 justify-start text-left font-normal px-3"
              >
                {getCategoryNameById(categoryId) || "All categories"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[180px]">
              <DropdownMenuItem onSelect={() => setCategoryId("")}>
                All categories
              </DropdownMenuItem>
              <Separator />
              {categories.map((category) =>
                category.children && category.children.length > 0 ? (
                  <DropdownMenuSub key={category.id}>
                    <DropdownMenuSubTrigger
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setCategoryId(category.id.toString());
                      }}
                    >
                      {category.name}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-[180px]">
                      {category.children.map((child) => (
                        <DropdownMenuItem
                          key={child.id}
                          onSelect={() => setCategoryId(child.id.toString())}
                        >
                          {child.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                ) : (
                  <DropdownMenuItem
                    key={category.id}
                    onSelect={() => setCategoryId(category.id.toString())}
                  >
                    {category.name}
                  </DropdownMenuItem>
                )
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-2">
          <Label>Sort by</Label>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px] bg-background">
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
            <SelectTrigger className="w-[140px] bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ASC">Ascending</SelectItem>
              <SelectItem value="DESC">Descending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : products.length === 0 ? (
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
            <ProductCard
              key={product.id}
              product={product}
              isInWatchlist={watchlistIds.has(product.id)}
              onWatchlistChange={handleWatchlistChange}
            />
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
