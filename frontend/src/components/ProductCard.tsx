import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Heart } from "lucide-react";

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
    bidder: {
      fullName: string;
    };
  }>;
}

interface ProductCardProps {
  product: ProductCardProduct;
  className?: string;
  isInWatchlist?: boolean;
  onToggleWatchlist?: (productId: number) => void;
}

export function ProductCard({ 
  product, 
  className,
  isInWatchlist = false,
  onToggleWatchlist,
}: ProductCardProps) {
  const highestBidderName = product.bids?.[0]?.bidder?.fullName;

  const handleWatchlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onToggleWatchlist) {
      onToggleWatchlist(product.id);
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
          {onToggleWatchlist && (
            <button
              type="button"
              onClick={handleWatchlistClick}
              className="absolute left-3 top-3 z-10 rounded-full bg-white/85 dark:bg-gray-900/85 p-2 shadow-sm hover:shadow-md transition-all backdrop-blur-sm"
              aria-label={
                isInWatchlist
                  ? "Xóa khỏi yêu thích"
                  : "Thêm vào yêu thích"
              }
            >
              <Heart
                className={`h-5 w-5 transition-colors ${
                  isInWatchlist
                    ? "text-red-500 fill-red-500"
                    : "text-gray-600 dark:text-gray-400"
                }`}
              />
            </button>
          )}
          {product.isNew && (
            <Badge className="absolute top-2 right-2 rounded-full border dark:border-border/20 text-xs font-semibold transition-colors focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 gap-2 px-2.5 py-1 border-brand/30 text-brand">
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
