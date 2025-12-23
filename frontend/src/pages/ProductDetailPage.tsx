import { useEffect, useState, type ChangeEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  Clock,
  Gavel,
  Heart,
  Image as ImageIcon,
  User,
} from "lucide-react";

import apiClient from "../api/client";
import { useAuthStore } from "../store/authStore";
import toast from "react-hot-toast";
import Loading from "@/components/Loading";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  startingPrice: number;
  currentPrice: number;
  bidStep: number;
  buyNowPrice?: number;
  categoryId: number;
  sellerId: number;
  mainImage: string;
  images: string[];
  startDate: string;
  endDate: string;
  status: string;
  autoExtend: boolean;
  allowUnratedBidders: boolean;
  bidCount: number;
  viewCount: number;
  isNew: boolean;
  category: {
    id: number;
    name: string;
  };
  seller: {
    id: number;
    fullName: string;
    email: string;
    rating: number;
    totalRatings: number;
  };
  bids: Array<{
    bidder: {
      id: number;
      fullName: string;
      rating: number;
      totalRatings: number;
    };
    amount: number;
    createdAt: string;
  }>;
  questions: Array<{
    id: number;
    question: string;
    answer?: string;
    answeredAt?: string;
    user: {
      id: number;
      fullName: string;
    };
    createdAt: string;
  }>;
}

interface BidHistory {
  id: number;
  amount: number;
  createdAt: string;
  bidder: {
    fullName: string;
  };
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [bidHistory, setBidHistory] = useState<BidHistory[]>([]);

  const [bidAmount, setBidAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [isAutoBid, setIsAutoBid] = useState(false);

  const [isInWatchlist, setIsInWatchlist] = useState(false);

  const [loading, setLoading] = useState(true);

  const [bidHistoryOpen, setBidHistoryOpen] = useState(false);
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [answerDialogOpen, setAnswerDialogOpen] = useState(false);
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(
    null
  );

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  const [selectedImage, setSelectedImage] = useState(0);

  const [order, setOrder] = useState<any>(null);

  // Confirm place bid dialog
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [id]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productRes, bidHistoryRes] = await Promise.all([
          apiClient.get(`/products/${id}`),
          apiClient.get(`/bids/history/${id}`),
        ]);

        const productData = productRes.data.data.product as Product;

        setProduct(productData);
        setRelatedProducts(productRes.data.data.relatedProducts || []);
        setBidHistory(bidHistoryRes.data.data || []);

        // Suggested bid
        if (productData.bids && productData.bids[0]) {
          const suggestedBid =
            Number(productData.currentPrice) + Number(productData.bidStep);
          setBidAmount(String(suggestedBid));
        } else {
          setBidAmount(String(productData.startingPrice));
        }

        // Watchlist + order info (only if logged in)
        if (user) {
          try {
            const watchlistRes = await apiClient.get("/users/watchlist");
            const inWatchlist = watchlistRes.data.data.some(
              (item: any) => item.product?.id === Number(id)
            );
            setIsInWatchlist(inWatchlist);
          } catch {
            // ignore
          }

          try {
            const ordersRes = await apiClient.get("/orders");
            const productOrder = ordersRes.data.data.find(
              (o: any) =>
                o.productId === Number(id) &&
                (o.sellerId === user.id || o.buyerId === user.id)
            );
            if (productOrder) setOrder(productOrder);
          } catch {
            // ignore
          }
        }
      } catch (error) {
        console.error("Error fetching product:", error);
        toast.error("Unable to load product information");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, user]);

  const handlePlaceBid = () => {
    if (!user) {
      toast.error("Please log in to place a bid");
      navigate("/login");
      return;
    }

    if (!isAutoBid && !bidAmount) {
      toast.error("Please enter a bid amount");
      return;
    }

    if (isAutoBid && !maxAmount) {
      toast.error("Please enter a maximum amount");
      return;
    }

    setConfirmOpen(true);
  };

  const handleConfirmBid = async () => {
    try {
      await apiClient.post("/bids", {
        productId: id,
        amount: bidAmount,
        maxAmount: isAutoBid ? maxAmount : undefined,
        isAutoBid,
      });

      toast.success("Bid placed successfully");
      setConfirmOpen(false);

      // Refresh data
      const [productRes, bidHistoryRes] = await Promise.all([
        apiClient.get(`/products/${id}`),
        apiClient.get(`/bids/history/${id}`),
      ]);
      setProduct(productRes.data.data.product);
      setBidHistory(bidHistoryRes.data.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || "Failed to place bid");
    }
  };

  const handleToggleWatchlist = async () => {
    if (!user) {
      toast.error("Please log in first");
      navigate("/login");
      return;
    }

    try {
      if (isInWatchlist) {
        await apiClient.delete(`/users/watchlist/${id}`);
        toast.success("Removed from watchlist");
      } else {
        await apiClient.post("/users/watchlist", { productId: id });
        toast.success("Added to watchlist");
      }
      setIsInWatchlist((prev) => !prev);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || "Action failed");
    }
  };

  const handleAskQuestion = async () => {
    if (!question.trim()) {
      toast.error("Please enter your question");
      return;
    }

    try {
      await apiClient.post("/users/questions", {
        productId: id,
        question,
      });
      toast.success("Question submitted");
      setQuestion("");
      setQuestionDialogOpen(false);

      const response = await apiClient.get(`/products/${id}`);
      setProduct(response.data.data.product);
    } catch (error: any) {
      toast.error(
        error.response?.data?.error?.message || "Failed to submit question"
      );
    }
  };

  const handleAnswerQuestion = async () => {
    if (!answer.trim()) {
      toast.error("Please enter your answer");
      return;
    }

    try {
      await apiClient.put(`/users/questions/${selectedQuestionId}/answer`, {
        answer,
      });
      toast.success("Answer submitted");
      setAnswer("");
      setAnswerDialogOpen(false);

      const response = await apiClient.get(`/products/${id}`);
      setProduct(response.data.data.product);
    } catch (error: any) {
      toast.error(
        error.response?.data?.error?.message || "Failed to submit answer"
      );
    }
  };

  const handleRejectBid = async (bidId: number) => {
    if (!window.confirm("Are you sure you want to reject this bid?")) return;

    try {
      await apiClient.put(`/bids/${bidId}/reject`);
      toast.success("Bid rejected");

      const [productRes, bidHistoryRes] = await Promise.all([
        apiClient.get(`/products/${id}`),
        apiClient.get(`/bids/history/${id}`),
      ]);

      setProduct(productRes.data.data.product);
      setBidHistory(bidHistoryRes.data.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || "Failed to reject bid");
    }
  };

  const getRatingPercentage = (rating: number, totalRatings: number) => {
    if (totalRatings === 0) return 0;
    return (rating / totalRatings) * 100;
  };

  const formatRelativeTime = (date: string) => {
    const endDate = new Date(date);
    const now = new Date();
    const diffMs = endDate.getTime() - now.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays < 3) {
      return formatDistanceToNow(endDate, { addSuffix: true });
    }
    return format(endDate, "dd/MM/yyyy HH:mm");
  };

  const formatCurrencyDisplay = (value: string): string => {
    if (!value) return "";
    const numericValue = value.replace(/\D/g, "");
    if (!numericValue) return "";
    return parseInt(numericValue, 10).toLocaleString("vi-VN");
  };

  const parseCurrencyValue = (value: string): string => value.replace(/\D/g, "");

  const handleBidAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const rawValue = parseCurrencyValue(e.target.value);
    setBidAmount(rawValue);
  };

  const handleMaxAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const rawValue = parseCurrencyValue(e.target.value);
    setMaxAmount(rawValue);
  };

  if (loading) return <Loading />;

  if (!product) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex items-center gap-2 text-muted-foreground">
          <AlertCircle className="h-5 w-5" />
          <span>Product not found</span>
        </div>
      </div>
    );
  }

  const shouldShowOrderLink =
    product.status === "ended" &&
    order &&
    user &&
    (user.id === order.sellerId || user.id === order.buyerId);

  const isSeller = user?.id === product.sellerId;
  const isEnded =
    product.status === "ended" || new Date(product.endDate) <= new Date();

  const sellerRating = getRatingPercentage(
    product.seller.rating,
    product.seller.totalRatings
  );

  const highestBidder = product.bids && product.bids[0];

  const highestBidderRating =
    highestBidder && highestBidder.bidder.totalRatings > 0
      ? getRatingPercentage(
          highestBidder.bidder.rating,
          highestBidder.bidder.totalRatings
        )
      : 0;

  const allImages = [product.mainImage, ...(product.images || [])];

  const suggestedNextBid =
    Number(product.currentPrice) + Number(product.bidStep);

  return (
    <div className="space-y-6">
      {shouldShowOrderLink && (
        <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <AlertCircle className="h-4 w-4 mt-0.5" />
          <div className="space-y-1">
            <p>The auction for this product has ended.</p>
            <Link
              to={`/orders/${order.id}`}
              className="font-medium text-blue-700 hover:underline"
            >
              View order details
            </Link>
          </div>
        </div>
      )}

      {product.status === "ended" && !order && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertCircle className="h-4 w-4 mt-0.5" />
          <p>This auction has ended.</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* Left column */}
        <div className="space-y-6">
          {/* Gallery */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="relative rounded-xl bg-muted flex items-center justify-center overflow-hidden">
                {allImages[selectedImage] ? (
                  <img
                    src={allImages[selectedImage]}
                    alt={product.name}
                    className="max-h-[420px] w-full object-contain bg-background"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <ImageIcon className="h-10 w-10 mb-2" />
                    <p>No image</p>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImage(idx)}
                    className={`h-16 w-16 rounded-md overflow-hidden border ${
                      selectedImage === idx
                        ? "border-primary ring-2 ring-primary/40"
                        : "border-border"
                    }`}
                  >
                    <img
                      src={img}
                      alt={`${product.name} ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Product info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-start justify-between gap-4">
                <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-white mb-4 leading-tight">
                  {product.name}
                </h1>
                <div className="flex items-center gap-2">
                  {product.isNew && (
                    <Badge className="bg-emerald-500 text-white">New</Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleToggleWatchlist}
                    aria-label="Toggle watchlist"
                    className="h-8 w-8"
                  >
                    <Heart
                      className={`h-5 w-5 transition-colors ${
                        isInWatchlist
                          ? "text-red-500 fill-red-500"
                          : ""
                      }`}
                    />
                  </Button>
                </div>
              </CardTitle>

              <CardDescription className="flex flex-wrap gap-2">
                <Badge className="flex items-center gap-1 border-brand/30 text-brand font-semibold transition-colors">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Ends: {formatRelativeTime(product.endDate)}</span>
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Gavel className="h-3.5 w-3.5" />
                  <span>{product.bidCount} bids</span>
                </Badge>
                <Badge variant="outline">{product.viewCount} views</Badge>
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Current price
                </p>
                <p className="text-3xl font-bold text-brand">
                  {Number(product.currentPrice).toLocaleString("vi-VN")} VNĐ
                </p>
              </div>

              {product.buyNowPrice && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Buy now price
                  </p>
                  <p className="text-xl font-semibold text-foreground">
                    {Number(product.buyNowPrice).toLocaleString("vi-VN")} VNĐ
                  </p>
                </div>
              )}

              <div className="grid gap-2 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Starting price</span>
                  <span className="font-medium text-foreground">
                    {Number(product.startingPrice).toLocaleString("vi-VN")} VNĐ
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Bid step</span>
                  <span className="font-medium text-foreground">
                    {Number(product.bidStep).toLocaleString("vi-VN")} VNĐ
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Posted at</span>
                  <span className="font-medium text-foreground">
                    {format(new Date(product.startDate), "dd/MM/yyyy HH:mm")}
                  </span>
                </div>

                {highestBidder && (
                  <div className="flex justify-between">
                    <span>Highest bidder</span>
                    <span className="font-medium text-foreground">
                      {highestBidder.bidder.fullName}
                      {highestBidderRating > 0 &&
                        ` (${highestBidderRating.toFixed(1)}%)`}
                    </span>
                  </div>
                )}
              </div>

              <Separator />

              {/* Seller info */}
              <div className="space-y-2">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Seller: {product.seller.fullName}
                </p>
                <p className="text-sm text-muted-foreground">
                  Rating:{" "}
                  <span className="font-medium">{sellerRating.toFixed(1)}%</span>{" "}
                  ({product.seller.rating}/{product.seller.totalRatings})
                </p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h2 className="text-base font-semibold">Product Description</h2>
                <div
                  className="text-sm leading-relaxed text-muted-foreground prose prose-sm max-w-none whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: product.description.replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>') }}
                />
              </div>

              {/* Questions & answers */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold">
                    Questions & answers
                  </h2>
                  {user && !isSeller && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQuestionDialogOpen(true)}
                    >
                      Ask a question
                    </Button>
                  )}
                </div>

                {product.questions && product.questions.length > 0 ? (
                  <div className="space-y-3">
                    {product.questions.map((q) => (
                      <div
                        key={q.id}
                        className="rounded-lg border bg-card p-3 space-y-2"
                      >
                        <p className="text-sm font-medium">
                          {q.user.fullName} asked:
                        </p>
                        <p className="text-sm text-foreground">{q.question}</p>

                        {q.answer ? (
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-primary">
                              Seller answered:
                            </p>
                            <p className="text-sm text-foreground">{q.answer}</p>
                          </div>
                        ) : isSeller ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedQuestionId(q.id);
                              setAnswerDialogOpen(true);
                            }}
                          >
                            Answer
                          </Button>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            No answer yet
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No questions yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Related products */}
          {relatedProducts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Related products</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {relatedProducts.map((p) => (
                    <Link
                      key={p.id}
                      to={`/products/${p.id}`}
                      className="group rounded-lg border bg-card overflow-hidden hover:shadow-sm transition-shadow"
                    >
                      <div className="aspect-video overflow-hidden">
                        <img
                          src={p.mainImage}
                          alt={p.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="p-3 space-y-1">
                        <p className="text-xs font-medium line-clamp-2">
                          {p.name}
                        </p>
                        <p className="text-sm font-semibold text-brand">
                          {Number(p.currentPrice).toLocaleString("vi-VN")} VNĐ
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column – bidding panel */}
        <div className="space-y-4 lg:sticky lg:top-20 lg:h-fit">
          <Card className="bg-transparent border-none shadow-none">
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Place a bid
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Submit a bid for this product
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {!isEnded ? (
                <>
                  {user ? (
                    <>
                      {!isSeller ? (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-sm">
                            <input
                              id="auto-bid"
                              type="checkbox"
                              checked={isAutoBid}
                              onChange={(e) => setIsAutoBid(e.target.checked)}
                              className="h-4 w-4 rounded border border-input text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                            <label
                              htmlFor="auto-bid"
                              className="text-sm text-foreground"
                            >
                              Automatic bidding
                            </label>
                          </div>

                          {!isAutoBid ? (
                            <div className="space-y-2">
                              <label className="text-sm font-medium">
                                Bid amount
                              </label>
                              <div className="relative">
                                <Input
                                  className="bg-background pr-12"
                                  type="text"
                                  inputMode="numeric"
                                  value={formatCurrencyDisplay(bidAmount)}
                                  onChange={handleBidAmountChange}
                                  placeholder="0"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                                  VNĐ
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Suggested next bid:{" "}
                                {suggestedNextBid.toLocaleString("vi-VN")} VNĐ
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <label className="text-sm font-medium">
                                Maximum amount
                              </label>
                              <div className="relative">
                                <Input
                                  className="bg-background pr-12"
                                  type="text"
                                  inputMode="numeric"
                                  value={formatCurrencyDisplay(maxAmount)}
                                  onChange={handleMaxAmountChange}
                                  placeholder="0"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                                  VNĐ
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                The system will automatically bid up to this
                                maximum amount.
                              </p>
                            </div>
                          )}

                          <Button
                            className="w-full"
                            onClick={handlePlaceBid}
                            disabled={!isAutoBid && !bidAmount}
                          >
                            {isAutoBid ? "Place automatic bid" : "Place bid"}
                          </Button>
                        </div>
                      ) : (
                        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
                          This is your product; you cannot place a bid.
                        </div>
                      )}

                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setBidHistoryOpen(true)}
                      >
                        View bid history
                      </Button>
                    </>
                  ) : (
                    <Button className="w-full" onClick={() => navigate("/login")}>
                      Log in to bid
                    </Button>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2 text-sm text-amber-900 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>The auction has ended</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirm bid dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm your bid</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            {!isAutoBid ? (
              <>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">You will bid</span>
                  <span className="font-semibold">
                    {Number(bidAmount || "0").toLocaleString("vi-VN")} VNĐ
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Auto-bid max</span>
                  <span className="font-semibold">
                    {Number(maxAmount || "0").toLocaleString("vi-VN")} VNĐ
                  </span>
                </div>
              </>
            )}

            <Separator />

            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Current price</span>
              <span className="font-medium">
                {Number(product.currentPrice).toLocaleString("vi-VN")} VNĐ
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Bid step</span>
              <span className="font-medium">
                {Number(product.bidStep).toLocaleString("vi-VN")} VNĐ
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmBid}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bid history dialog */}
      <Dialog open={bidHistoryOpen} onOpenChange={setBidHistoryOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bid history</DialogTitle>
          </DialogHeader>

          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Bidder</TableHead>
                  <TableHead>Amount</TableHead>
                  {isSeller && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {bidHistory.map((bid) => (
                  <TableRow key={bid.id}>
                    <TableCell>
                      {format(new Date(bid.createdAt), "dd/MM/yyyy HH:mm")}
                    </TableCell>
                    <TableCell>{bid.bidder.fullName}</TableCell>
                    <TableCell>
                      {Number(bid.amount).toLocaleString("vi-VN")} VNĐ
                    </TableCell>
                    {isSeller && (
                      <TableCell>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRejectBid(bid.id)}
                        >
                          Reject
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBidHistoryOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ask question dialog */}
      <Dialog open={questionDialogOpen} onOpenChange={setQuestionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ask a question</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Textarea
              rows={4}
              placeholder="Type your question..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setQuestionDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAskQuestion}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Answer question dialog */}
      <Dialog open={answerDialogOpen} onOpenChange={setAnswerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Answer question</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Textarea
              rows={4}
              placeholder="Type your answer..."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAnswerDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAnswerQuestion}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}