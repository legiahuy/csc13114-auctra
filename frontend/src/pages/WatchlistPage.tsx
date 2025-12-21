import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/client";
import { useAuthStore } from "../store/authStore";
import toast from "react-hot-toast";
import { ProductCard, type ProductCardProduct } from "@/components/ProductCard";
import Loading from "@/components/Loading";

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
    category?: {
      name: string;
      slug: string;
      parent?: {
        name: string;
        slug: string;
      };
    };
    buyNowPrice?: number;
    startDate?: string;
    isNew?: boolean;
    seller?: {
      fullName: string;
    };
    bids?: Array<{
      bidder: {
        fullName: string;
      };
    }>;
  };
}

export default function WatchlistPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [watchlistIds, setWatchlistIds] = useState<Set<number>>(new Set());

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
      const items = response.data.data || [];
      setWatchlist(items);

      // Build watchlist IDs set
      const ids = new Set<number>();
      items.forEach((item: WatchlistItem) => {
        if (item.product?.id) ids.add(item.product.id);
      });
      setWatchlistIds(ids);
    } catch (error) {
      console.error("Error fetching watchlist:", error);
      toast.error("Failed to load watchlist");
    } finally {
      setLoading(false);
    }
  };

  const handleWatchlistChange = (productId: number, isInWatchlist: boolean) => {
    setWatchlistIds((prev) => {
      const next = new Set(prev);
      if (isInWatchlist) {
        next.add(productId);
      } else {
        next.delete(productId);
        // Remove from watchlist array
        setWatchlist((prev) =>
          prev.filter((item) => item.product.id !== productId)
        );
      }
      return next;
    });
  };

  // Convert watchlist item to ProductCardProduct format
  const toProductCardProduct = (item: WatchlistItem): ProductCardProduct => {
    return {
      id: item.product.id,
      name: item.product.name,
      currentPrice: item.product.currentPrice,
      mainImage: item.product.mainImage,
      endDate: item.product.endDate,
      bidCount: item.product.bidCount,
      buyNowPrice: item.product.buyNowPrice,
      startDate: item.product.startDate,
      isNew: item.product.isNew,
      category: item.product.category,
      seller: item.product.seller,
      bids: item.product.bids,
    };
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl md:text-5xl font-bold text-neutral-800 dark:text-neutral-200 font-sans mb-4">
          My Watchlist
        </h1>
        <p className="text-lg text-neutral-600 dark:text-neutral-400">
          {watchlist.length} product{watchlist.length !== 1 ? "s" : ""} in your
          watchlist
        </p>
      </div>

      {watchlist.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No products in your watchlist yet.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Start adding products you're interested in!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {watchlist.map((item) => (
            <ProductCard
              key={item.id}
              product={toProductCardProduct(item)}
              isInWatchlist={watchlistIds.has(item.product.id)}
              onWatchlistChange={handleWatchlistChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
