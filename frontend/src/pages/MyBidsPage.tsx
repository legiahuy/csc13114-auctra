import { useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoaderIcon } from "lucide-react";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { usePagination } from "@/hooks/usePagination";

interface Bid {
  id: number;
  amount: number;
  createdAt: string;
  isRejected?: boolean;
  isHighestBidder?: boolean; // Added
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
  const [statusFilter, setStatusFilter] = useState("");

  const {
    searchInput,
    debouncedSearch,
    setSearchInput,
    handleClear,
    isSearching,
  } = useDebouncedSearch();

  const { pagination, setPagination, handlePageChange } = usePagination();

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;
    fetchBids();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, pagination.page, debouncedSearch, statusFilter]);

  const fetchBids = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: pagination.page,
        limit: 12,
      };

      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter) params.status = statusFilter;

      const response = await apiClient.get("/users/bids", { params });

      setBids(response.data.data.bids || []);
      setPagination(response.data.data.pagination);
    } catch (error) {
      console.error("Error fetching bids:", error);
      toast.error("Unable to load bid history");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (value: string) => {
    const status = value === "all" ? "" : value;
    setStatusFilter(status);
    handlePageChange(1);
  };



  const getStatusBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    const variant =
      s === "active" ? "default" : s === "cancelled" ? "destructive" : "outline";

    const className =
      s === "active" ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "bg-red-500 hover:bg-red-600 text-white";

    const label =
      s === "active" ? "Active" : s === "cancelled" ? "Cancelled" : "Ended";

    return (
      <Badge variant={variant as any} className={className}>
        {label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl md:text-5xl font-bold text-neutral-800 dark:text-neutral-200 font-sans mb-4">
          My Bids
        </h1>
        <p className="text-lg text-neutral-600 dark:text-neutral-400">
          {pagination.total} bid{pagination.total !== 1 ? "s" : ""} total
        </p>
      </div>

      {/* Search and Filters */}
      {(bids.length > 0 || searchInput || statusFilter) && (
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="search">Search</Label>
          <div className="flex gap-2 relative">
            <Input
              id="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by product name..."
              className="pr-10 bg-background"
            />
            {isSearching && (
              <LoaderIcon
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors animate-spin size-4"
                role="status"
                aria-label="Loading"
              />
            )}
              {searchInput && !isSearching && (
                <button
                  onClick={handleClear}
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
            <Label>Status</Label>
            <Select value={statusFilter || "all"} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[180px] bg-background">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="ended">Ended</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {loading ? (
        <Loading />
      ) : bids.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {debouncedSearch || statusFilter
              ? "No bids found matching your filters."
              : "You have not placed any bids yet."}
          </p>
          {!debouncedSearch && !statusFilter && (
            <p className="text-sm text-muted-foreground mt-2">
              Start bidding on products you're interested in!
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {bids.map((bid) => (
              <Card
                key={bid.id}
                className={`h-full flex flex-col hover:shadow-lg transition-all ${bid.product.status === "active" &&
                  bid.isHighestBidder // Use flag
                  ? "ring-2 ring-primary shadow-md transform scale-[1.02]"
                  : ""
                  }`}
              >
                <div className="aspect-video overflow-hidden rounded-t-xl relative">
                  <img
                    src={bid.product.mainImage}
                    alt={bid.product.name}
                    className="w-full h-full object-cover"
                  />
                  {bid.product.status === "active" &&
                    bid.isHighestBidder && ( // Use flag
                      <Badge className="absolute top-2 left-2 bg-primary/100 text-white border-none">
                        Leading Bid
                      </Badge>
                    )}
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
                        {bid.isHighestBidder ? "Your winning bid" : "Your bid"}
                      </p>
                      <p className="text-xl font-bold text-brand">
                        {Number(
                          bid.isHighestBidder ? bid.product.currentPrice : bid.amount
                        ).toLocaleString("vi-VN")}{" "}
                        VNĐ
                      </p>
                    </div>

                    {bid.product.status === "active" && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Current price
                        </p>
                        <p
                          className={`text-lg font-semibold ${
                            bid.isHighestBidder
                              ? "text-green-600 dark:text-green-500"
                              : "text-foreground"
                          }`}
                        >
                          {Number(bid.product.currentPrice).toLocaleString(
                            "vi-VN"
                          )}{" "}
                          VNĐ
                        </p>
                      </div>
                    )}

                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Bid placed
                      </p>
                      <p className="text-sm text-foreground">
                        {format(new Date(bid.createdAt), "dd/MM/yyyy HH:mm")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(bid.product.status)}
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

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8">
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
        </>
      )}
    </div>
  );
}
