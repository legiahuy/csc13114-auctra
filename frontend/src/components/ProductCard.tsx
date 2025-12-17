import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

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
}

export function ProductCard({ product, className }: ProductCardProps) {
  const highestBidderName = product.bids?.[0]?.bidder?.fullName;

  return (
    <Card
      className={cn(
        "h-full flex flex-col hover:shadow-lg transition-shadow",
        className
      )}
    >
      <div className="aspect-video overflow-hidden rounded-t-xl relative">
        <img
          src={product.mainImage}
          alt={product.name}
          className="w-full h-full object-cover"
        />
        {product.isNew && (
          <Badge className="absolute border-brand/30 top-2 right-2 bg-primary text-brand font-semibold transition-colors focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2">
            New
          </Badge>
        )}
      </div>
      <CardContent className="p-6 space-y-3 flex-1 flex flex-col justify-between">
        <div className="space-y-3">
          <Link
            to={`/products/${product.id}`}
            className="text-lg font-semibold hover:text-primary transition-colors block leading-tight min-h-[3.5rem]"
          >
            {product.name}
          </Link>

          <div className="space-y-2 min-h-[4.5rem]">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Current Price</p>
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
  );
}


