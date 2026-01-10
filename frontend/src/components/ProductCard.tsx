import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Heart } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import apiClient from "@/api/client";
import toast from "react-hot-toast";

export interface ProductCardProduct {
  id: number;
  name: string;
  currentPrice: number;
  mainImage: string;
  endDate: string;
  bidCount: number;
  // Optional fields – shown when available
  buyNowPrice?: number;
  startDate?: string;
  isNew?: boolean;
  category?: {
    name: string;
    slug: string;
    parent?: {
      name: string;
      slug: string;
    };
  };
  seller?: {
    fullName: string;
  };
  bids?: Array<{
    amount?: number;
    isRejected?: boolean;
    bidder: {
      id: number;
      fullName: string;
    };
  }>;
}

interface ProductCardProps {
  product: ProductCardProduct;
  className?: string;
  isInWatchlist?: boolean;
  onWatchlistChange?: (productId: number, isInWatchlist: boolean) => void;
}

export function ProductCard({
  product,
  className,
  isInWatchlist = false,
  onWatchlistChange,
}: ProductCardProps) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  // Calculate highest bidder with strict ban logic (filter out anyone with a rejected bid)
  const highestBidderName = (() => {
    if (!product.bids || product.bids.length === 0) return undefined;
    
    const rejectedBidderIds = new Set(
      product.bids.filter((b) => b.isRejected).map((b) => b.bidder.id)
    );
    
    // Note: product.bids from getProducts might only have limited fields, but we need amount for sorting if not already sorted.
    // The backend `getProducts` sorts by maxAmount DESC, so the first valid one should be correct.
    const validBids = product.bids.filter((b) => !rejectedBidderIds.has(b.bidder.id));
    return validBids[0]?.bidder?.fullName;
  })();

  const handleWatchlistClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error("Please log in to add to watchlist");
      navigate("/login");
      return;
    }

    try {
      if (isInWatchlist) {
        await apiClient.delete(`/users/watchlist/${product.id}`);
        toast.success("Removed from watchlist");
        onWatchlistChange?.(product.id, false);
      } else {
        await apiClient.post("/users/watchlist", { productId: product.id });
        toast.success("Added to watchlist");
        onWatchlistChange?.(product.id, true);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || "Action failed");
    }
  };

  return (
    <Link to={`/products/${product.id}`}>
      <Card
        className={cn(
          "h-full flex flex-col hover:shadow-lg transition-shadow relative",
          className
        )}
      >
        <div className="aspect-video overflow-hidden rounded-t-xl relative">
          <img
            src={product.mainImage}
            alt={product.name}
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={handleWatchlistClick}
            className="absolute right-2 top-2 z-10 px-2 hover:cursor-pointer transition-all"
            aria-label={
              isInWatchlist ? "Remove from watchlist" : "Add to watchlist"
            }
          >
            <Heart
              className={`h-5 w-5 transition-colors ${
                isInWatchlist
                  ? "text-red-500 fill-red-500"
                  : "text-gray-300 dark:text-gray-400"
              }`}
            />
          </button>
          {product.isNew && (
            <Badge className="absolute top-2 left-2 rounded-full border dark:border-border/20 text-xs font-semibold transition-colors focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 gap-2 px-2.5 py-1 border-brand/30 text-white">
              New
            </Badge>
          )}
        </div>
        <CardContent className="p-6 space-y-3 flex-1 flex flex-col justify-between">
          <div className="space-y-2">
            <p className="text-lg font-semibold transition-colors leading-tight line-clamp-2 text-ellipsis overflow-hidden w-full">
              {product.name}
            </p>
            {product.category && (
              <div className="flex flex-wrap gap-1">
                {product.category.parent && (
                  <Link
                    to={`/category/${product.category.parent.slug}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Badge
                      variant="secondary"
                      className="bg-secondary/80 text-secondary-foreground hover:bg-secondary/90 transition-colors cursor-pointer text-xs"
                    >
                      {product.category.parent.name}
                    </Badge>
                  </Link>
                )}
                <Link
                  to={`/category/${product.category.slug}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Badge
                    variant="secondary"
                    className="bg-secondary/80 text-secondary-foreground hover:bg-secondary/90 transition-colors cursor-pointer text-xs"
                  >
                    {product.category.name}
                  </Badge>
                </Link>
              </div>
            )}
          </div>

          <div className="space-y-2 min-h-[4.5rem]">
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Current Price
              </p>
              <p className="text-2xl font-bold text-brand leading-tight">
                {product.currentPrice && product.currentPrice > 0
                  ? new Intl.NumberFormat("vi-VN").format(product.currentPrice)
                  : "-"}{" "}
                VNĐ
              </p>
            </div>

            {product.buyNowPrice !== undefined && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Buy Now Price
                </p>
                <p className="text-lg font-semibold text-foreground leading-tight">
                  {product.buyNowPrice && product.buyNowPrice > 0
                    ? new Intl.NumberFormat("vi-VN").format(product.buyNowPrice)
                    : "-"}{" "}
                  VNĐ
                </p>
              </div>
            )}
          </div>

          <div className="space-y-1.5 text-sm text-muted-foreground pt-2 border-t mt-4">
            {product.startDate && (
              <p className="leading-relaxed">
                <span className="font-medium">Posted:</span>{" "}
                {format(new Date(product.startDate), "dd/MM/yyyy HH:mm")}
              </p>
            )}
            <p className="leading-relaxed">
              <span className="font-medium">Time left:</span>{" "}
              {formatDistanceToNow(new Date(product.endDate), {
                addSuffix: true,
              })}
            </p>
            <p className="leading-relaxed">
              <span className="font-medium">Bids:</span> {product.bidCount}
            </p>
            {highestBidderName && (
              <p className="leading-relaxed">
                <span className="font-medium">Highest bidder:</span>{" "}
                {highestBidderName}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
