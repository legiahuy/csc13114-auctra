import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import apiClient from "../api/client";
import { useAuthStore } from "../store/authStore";
import toast from "react-hot-toast";
import { format } from "date-fns";
import Loading from "@/components/Loading";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface Bid {
  id: number;
  amount: number;
  createdAt: string;
  isRejected?: boolean;
  product: {
    id: number;
    name: string;
    mainImage: string;
    currentPrice: number;
    endDate: string;
    status: string;
    category: {
      name: string;
    };
  };
}

export default function MyBidsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    fetchBids();
  }, [user, navigate]);

  const fetchBids = async () => {
    try {
      const response = await apiClient.get("/users/bids");
      setBids(response.data.data || []);
    } catch (error) {
      console.error("Error fetching bids:", error);
      toast.error("Unable to load bid history");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  const activeBids = bids.filter((bid) => bid.product.status === "active");
  const endedBids = bids.filter((bid) => bid.product.status !== "active");

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl md:text-5xl font-bold text-neutral-800 dark:text-neutral-200 font-sans mb-4">
          My Bids
        </h1>
        <p className="text-lg text-neutral-600 dark:text-neutral-400">
          {bids.length} bid{bids.length !== 1 ? "s" : ""} total
        </p>
      </div>

      {bids.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            You have not placed any bids yet.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Start bidding on products you're interested in!
          </p>
        </div>
      ) : (
        <>
          {activeBids.length > 0 && (
            <div className="space-y-6 mb-8">
              <div>
                <h2 className="text-2xl font-semibold text-foreground mb-1">
                  Active Bids
                </h2>
                <p className="text-sm text-muted-foreground">
                  {activeBids.length} active bid
                  {activeBids.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {activeBids.map((bid) => (
                  <Card
                    key={bid.id}
                    className="h-full flex flex-col hover:shadow-lg transition-shadow"
                  >
                    <div className="aspect-video overflow-hidden rounded-t-xl">
                      <img
                        src={bid.product.mainImage}
                        alt={bid.product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <CardContent className="p-6 space-y-4 flex-1 flex flex-col">
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold leading-tight line-clamp-2">
                          {bid.product.name}
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                          {bid.product.category.name}
                        </Badge>
                      </div>

                      <Separator />

                      <div className="space-y-2 flex-1">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            Your bid
                          </p>
                          <p className="text-xl font-bold text-brand">
                            {Number(bid.amount).toLocaleString("vi-VN")} VNĐ
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            Current price
                          </p>
                          <p className="text-lg font-semibold text-foreground">
                            {Number(bid.product.currentPrice).toLocaleString(
                              "vi-VN"
                            )}{" "}
                            VNĐ
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            Bid placed
                          </p>
                          <p className="text-sm text-foreground">
                            {format(
                              new Date(bid.createdAt),
                              "dd/MM/yyyy HH:mm"
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <div className="flex gap-2">
                          <Badge
                            variant="default"
                            className="bg-emerald-500 hover:bg-emerald-600 text-white"
                          >
                            Active
                          </Badge>
                          {bid.isRejected && (
                            <Badge
                              variant="destructive"
                              className="bg-red-500 hover:bg-red-600 text-white"
                            >
                              Rejected
                            </Badge>
                          )}
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/products/${bid.product.id}`}>
                            View details
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {endedBids.length > 0 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-foreground mb-1">
                  Ended Bids
                </h2>
                <p className="text-sm text-muted-foreground">
                  {endedBids.length} ended bid
                  {endedBids.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {endedBids.map((bid) => (
                  <Card
                    key={bid.id}
                    className="h-full flex flex-col hover:shadow-lg transition-shadow"
                  >
                    <div className="aspect-video overflow-hidden rounded-t-xl">
                      <img
                        src={bid.product.mainImage}
                        alt={bid.product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <CardContent className="p-6 space-y-4 flex-1 flex flex-col">
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold leading-tight line-clamp-2">
                          {bid.product.name}
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                          {bid.product.category.name}
                        </Badge>
                      </div>

                      <Separator />

                      <div className="space-y-2 flex-1">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            Your bid
                          </p>
                          <p className="text-xl font-bold text-brand">
                            {Number(bid.amount).toLocaleString("vi-VN")} VNĐ
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            Bid placed
                          </p>
                          <p className="text-sm text-foreground">
                            {format(
                              new Date(bid.createdAt),
                              "dd/MM/yyyy HH:mm"
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <div className="flex gap-2">
                          <Badge variant="outline">Ended</Badge>
                          {bid.isRejected && (
                            <Badge
                              variant="destructive"
                              className="bg-red-500 hover:bg-red-600 text-white"
                            >
                              Rejected
                            </Badge>
                          )}
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/products/${bid.product.id}`}>
                            View details
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
