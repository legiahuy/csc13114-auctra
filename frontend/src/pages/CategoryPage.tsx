import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useSearchParams, useParams } from "react-router-dom";
import apiClient from "../api/client";
import { ProductCard, type ProductCardProduct } from "@/components/ProductCard";
import Loading from "@/components/Loading";
import { useAuthStore } from "../store/authStore";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type Product = ProductCardProduct;

interface Category {
  id: number;
  name: string;
  children?: Category[];
  slug: string;
}

export default function CategoryPage() {
  const { user } = useAuthStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });
  const { slug } = useParams<{ slug: string }>();

  // Watchlist
  const [watchlistIds, setWatchlistIds] = useState<Set<number>>(new Set());

  const getCategoryIdBySlug = (slug?: string | number) => {
    if (!slug) return undefined;
    for (const category of categories) {
      if (category.slug === slug) return category.id;
      if (category.children) {
        const child = category.children.find((c) => c.slug === slug);
        if (child) return child.id;
      }
    }
    return undefined;
  };
  const [id, setId] = useState(getCategoryIdBySlug(slug));

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
    fetchCategories();
  }, []);

  useEffect(() => {
    setId(getCategoryIdBySlug(slug));
  }, [slug, categories]);

  const fetchCategories = async () => {
    try {
      const response = await apiClient.get("/categories");
      setCategories(response.data.data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  // Fetch products when search params or category change
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params: any = {
          page: searchParams.get("page") || "1",
          limit: "12",
          categoryId: id,
        };
        const searchValue = searchParams.get("search");
        if (searchValue) params.search = searchValue;

        const response = await apiClient.get("/products", { params });
        console.log(response);
        setProducts(response.data.data.products);
        setPagination(response.data.data.pagination);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProducts();
    }
  }, [searchParams, id]);

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

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", page.toString());
    setSearchParams(params);
  };

  if (loading && products.length === 0) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/products">Explore</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{getCategoryNameById(id)}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="mb-12">
        <h1 className="text-3xl md:text-5xl font-bold text-neutral-800 dark:text-neutral-200 font-sans mb-4">
          {getCategoryNameById(id)}
        </h1>
        <p className="text-lg text-neutral-600 dark:text-neutral-400">
          {pagination.total} product{pagination.total !== 1 ? "s" : ""}{" "}
          available
        </p>
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
