import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import apiClient from "../api/client";
import { formatDistanceToNow } from "date-fns";
import { Gavel, TrendingUp, Clock, Users, Sparkles } from "lucide-react";

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
  isNew?: boolean;
}

export default function HomePage() {
  const [endingSoon, setEndingSoon] = useState<Product[]>([]);
  const [mostBids, setMostBids] = useState<Product[]>([]);
  const [highestPrice, setHighestPrice] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeBidders: 0,
    totalBids: 0,
  });
  const statsRef = useRef<HTMLDivElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiClient.get("/products/homepage");
        const { data } = response.data;
        setEndingSoon(data.endingSoon || []);
        setMostBids(data.mostBids || []);
        setHighestPrice(data.highestPrice || []);

        // Calculate stats
        const allProducts = [
          ...(data.endingSoon || []),
          ...(data.mostBids || []),
          ...(data.highestPrice || []),
        ];
        const uniqueProducts = new Set(allProducts.map((p: Product) => p.id));
        const totalBids = allProducts.reduce(
          (sum: number, p: Product) => sum + (p.bidCount || 0),
          0
        );

        setStats({
          totalProducts: uniqueProducts.size,
          activeBidders: Math.floor(totalBids / 2), // Estimate
          totalBids: totalBids,
        });
      } catch (error) {
        console.error("Error fetching homepage data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            setHasAnimated(true);
          }
        });
      },
      { threshold: 0.1 }
    );

    if (statsRef.current) {
      observer.observe(statsRef.current);
    }

    return () => {
      if (statsRef.current) {
        observer.unobserve(statsRef.current);
      }
    };
  }, [hasAnimated]);

  const ProductCard = ({
    product,
    index = 0,
  }: {
    product: Product;
    index?: number;
  }) => (
    <Card
      className="h-full hover:shadow-xl transition-all duration-300 group overflow-hidden border-border/50"
      style={{
        animationDelay: `${index * 100}ms`,
      }}
    >
      <div className="aspect-video overflow-hidden rounded-t-xl relative">
        <img
          src={product.mainImage}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        {product.isNew && (
          <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground">
            Mới
          </Badge>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
      <CardContent className="p-5 space-y-3">
        <Link
          to={`/products/${product.id}`}
          className="text-lg font-semibold hover:text-primary transition-colors block line-clamp-2 min-h-[3.5rem]"
        >
          {product.name}
        </Link>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold text-primary">
            {product.currentPrice.toLocaleString("vi-VN")} VNĐ
          </p>
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span className="line-clamp-1">
              {formatDistanceToNow(new Date(product.endDate), {
                addSuffix: true,
              })}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{product.bidCount} lượt</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const StatCard = ({
    icon: Icon,
    value,
    label,
    delay = 0,
  }: {
    icon: React.ElementType;
    value: number;
    label: string;
    delay?: number;
  }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
      if (hasAnimated) {
        const duration = 2000;
        const steps = 60;
        const increment = value / steps;
        const stepDuration = duration / steps;
        let current = 0;

        const timer = setInterval(() => {
          current += increment;
          if (current >= value) {
            setCount(value);
            clearInterval(timer);
          } else {
            setCount(Math.floor(current));
          }
        }, stepDuration);

        return () => clearInterval(timer);
      }
    }, [hasAnimated, value]);

    return (
      <div
        className="text-center p-6 rounded-xl bg-card border border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg"
        style={{
          animationDelay: `${delay}ms`,
        }}
      >
        <div className="flex justify-center mb-3">
          <div className="p-3 rounded-full bg-primary/10 text-primary">
            <Icon className="h-6 w-6" />
          </div>
        </div>
        <div className="text-3xl font-bold text-foreground mb-1">
          {count.toLocaleString("vi-VN")}
        </div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="container mx-auto px-4 py-20 md:py-28 relative">
          <div className="max-w-4xl mx-auto text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Sparkles className="h-4 w-4" />
              <span>Nền tảng đấu giá trực tuyến hàng đầu</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
              Khám phá những{" "}
              <span className="text-primary">sản phẩm độc đáo</span>
              <br />
              qua đấu giá trực tuyến
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Tham gia đấu giá trên hàng nghìn sản phẩm chất lượng cao. Tìm kiếm
              những món đồ độc đáo với mức giá tốt nhất.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Button size="lg" asChild className="text-lg px-8 py-6">
                <Link to="/products">Khám phá sản phẩm</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="text-lg px-8 py-6"
              >
                <Link to="/register">Bắt đầu đấu giá</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section ref={statsRef} className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            icon={Gavel}
            value={stats.totalProducts}
            label="Sản phẩm đang đấu giá"
            delay={0}
          />
          <StatCard
            icon={Users}
            value={stats.activeBidders}
            label="Người đấu giá tích cực"
            delay={200}
          />
          <StatCard
            icon={TrendingUp}
            value={stats.totalBids}
            label="Lượt đấu giá tổng cộng"
            delay={400}
          />
        </div>
      </section>

      {/* Ending Soon Section */}
      {endingSoon.length > 0 && (
        <section className="container mx-auto px-4 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10 text-destructive">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-foreground">
                  Sắp kết thúc
                </h2>
                <p className="text-muted-foreground">
                  Đừng bỏ lỡ cơ hội cuối cùng
                </p>
              </div>
            </div>
            <Button variant="ghost" asChild>
              <Link to="/products?sortBy=endDate&sortOrder=ASC">
                Xem tất cả →
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {endingSoon.slice(0, 4).map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>
        </section>
      )}

      {/* Most Bids Section */}
      {mostBids.length > 0 && (
        <section className="container mx-auto px-4 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-foreground">Đang hot</h2>
                <p className="text-muted-foreground">
                  Sản phẩm được đấu giá nhiều nhất
                </p>
              </div>
            </div>
            <Button variant="ghost" asChild>
              <Link to="/products?sortBy=bidCount&sortOrder=DESC">
                Xem tất cả →
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {mostBids.slice(0, 4).map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>
        </section>
      )}

      {/* Highest Price Section */}
      {highestPrice.length > 0 && (
        <section className="container mx-auto px-4 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10 text-accent-foreground">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-foreground">Cao cấp</h2>
                <p className="text-muted-foreground">Sản phẩm giá trị cao</p>
              </div>
            </div>
            <Button variant="ghost" asChild>
              <Link to="/products?sortBy=price&sortOrder=DESC">
                Xem tất cả →
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {highestPrice.slice(0, 4).map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="container mx-auto px-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-accent/10 to-primary/5 border border-primary/20 p-12 text-center">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
          <div className="relative space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Sẵn sàng bắt đầu đấu giá?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Tham gia ngay để khám phá hàng nghìn sản phẩm độc đáo và nhận được
              những món đồ yêu thích với mức giá tốt nhất.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild className="text-lg px-8">
                <Link to="/register">Đăng ký ngay</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="text-lg px-8"
              >
                <Link to="/products">Xem sản phẩm</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
