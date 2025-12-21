import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Carousel } from "@/components/ui/carousel";
import apiClient from "../api/client";
import { Gavel, TrendingUp, Users, Sparkles } from "lucide-react";
import { ProductCard, type ProductCardProduct } from "@/components/ProductCard";
import Loading from "@/components/Loading";
import { useAuthStore } from "../store/authStore";

type Product = ProductCardProduct;

export default function HomePage() {
  const { user } = useAuthStore();
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

  // Watchlist
  const [watchlistIds, setWatchlistIds] = useState<Set<number>>(new Set());

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
        className="text-center p-6  transition-all duration-300"
        style={{
          animationDelay: `${delay}ms`,
        }}
      >
        <div className="flex justify-center mb-3">
          <div className="text-muted-foreground text-sm font-semibold">
            <Icon className="h-6 w-6" />
          </div>
        </div>
        <div className="from-foreground to-foreground dark:to-brand bg-linear-to-r bg-clip-text text-4xl font-medium text-transparent drop-shadow-[2px_1px_24px_var(--brand-foreground)] transition-all duration-300 sm:text-5xl md:text-6xl">
          {count.toLocaleString("en-US")}
        </div>
        <div className="text-muted-foreground text-sm font-semibold text-pretty">
          {label}
        </div>
      </div>
    );
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section - clearer, more colorful using theme tokens */}
      <section className="relative overflow-hidden  text-foreground border-b border-border">
        <div className="container mx-auto px-4 py-20 md:py-28 relative">
          <div className="max-w-4xl mx-auto text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="inline-flex items-center rounded-full border dark:border-border/20 text-xs font-semibold transition-colors focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 gap-2 px-2.5 py-1 border-brand/30 text-brand">
              <Sparkles className="h-4 w-4" />
              <span>Leading Online Auction Platform</span>
            </div>
            <h1 className="relative z-10 inline-block max-w-[920px] text-3xl font-semibold text-balance text-foreground drop-shadow-2xl sm:text-5xl sm:leading-tight md:text-7xl md:leading-tight">
              <span className="block text-primary-foreground">
                Discover Unique
              </span>
              <span className="block text-muted-foreground">
                Products Through Online Auctions
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Join thousands of bidders on high-quality products. Find unique
              items at the best prices.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Button size="lg" asChild className="text-lg px-8 py-6 shadow">
                <Link to="/products">Explore Products</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="text-lg px-8 py-6 bg-background/60 hover:bg-muted/80"
              >
                <Link to="/register">Start Bidding</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Ending Soon Section */}
      {endingSoon.length > 0 && (
        <section className="container mx-auto px-4 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h2 className="text-3xl font-bold text-foreground">
                  Ending Soon
                </h2>
                <p className="text-muted-foreground">
                  Don't miss your last chance
                </p>
              </div>
            </div>
            <Button variant="ghost" asChild>
              <Link to="/products?sortBy=endDate&sortOrder=ASC">
                View All →
              </Link>
            </Button>
          </div>
          <Carousel autoScroll={true} autoScrollInterval={4000}>
            {endingSoon.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                className="w-[320px] shrink-0"
                isInWatchlist={watchlistIds.has(product.id)}
                onWatchlistChange={handleWatchlistChange}
              />
            ))}
          </Carousel>
        </section>
      )}

      {/* Most Bids Section */}
      {mostBids.length > 0 && (
        <section className="container mx-auto px-4 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h2 className="text-3xl font-bold text-foreground">Trending</h2>
                <p className="text-muted-foreground">Most bid products</p>
              </div>
            </div>
            <Button variant="ghost" asChild>
              <Link to="/products?sortBy=bidCount&sortOrder=DESC">
                View All →
              </Link>
            </Button>
          </div>
          <Carousel autoScroll={true} autoScrollInterval={4000}>
            {mostBids.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                className="w-[320px] shrink-0"
                isInWatchlist={watchlistIds.has(product.id)}
                onWatchlistChange={handleWatchlistChange}
              />
            ))}
          </Carousel>
        </section>
      )}

      {/* Highest Price Section */}
      {highestPrice.length > 0 && (
        <section className="container mx-auto px-4 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h2 className="text-3xl font-bold text-foreground">Premium</h2>
                <p className="text-muted-foreground">High-value products</p>
              </div>
            </div>
            <Button variant="ghost" asChild>
              <Link to="/products?sortBy=price&sortOrder=DESC">View All →</Link>
            </Button>
          </div>
          <Carousel autoScroll={true} autoScrollInterval={4000}>
            {highestPrice.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                className="w-[320px] shrink-0"
                isInWatchlist={watchlistIds.has(product.id)}
                onWatchlistChange={handleWatchlistChange}
              />
            ))}
          </Carousel>
        </section>
      )}

      {/* Stats Section */}
      <section ref={statsRef} className="container mx-auto px-4">
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            icon={Gavel}
            value={stats.totalProducts}
            label="Active Auctions"
            delay={0}
          />
          <StatCard
            icon={Users}
            value={stats.activeBidders}
            label="Active Bidders"
            delay={200}
          />
          <StatCard
            icon={TrendingUp}
            value={stats.totalBids}
            label="Total Bids"
            delay={400}
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4">
        <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-primary/10 via-accent/10 to-primary/5 border border-primary/20 p-12 text-center">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
          <div className="relative space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Ready to Start Bidding?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join now to discover thousands of unique products and get your
              favorite items at the best prices.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild className="text-lg px-8">
                <Link to="/register">Sign Up Now</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="text-lg px-8"
              >
                <Link to="/products">View Products</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
