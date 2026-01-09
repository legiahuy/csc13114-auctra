import { useEffect, useState, type ChangeEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ProductImageCarousel } from "@/components/ProductImageCarousel";
import { format, formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  Clock,
  Gavel,
  Heart,
  User,
  ChevronDown,
  ChevronUp,
  Reply,
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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
    parentId?: number;
    user: {
      id: number;
      fullName: string;
    };
    createdAt: string;
    replyCount?: number;
    replies?: Array<any>;
  }>;
}

interface BidHistory {
  id: number;
  amount: number;
  createdAt: string;
  isRejected?: boolean;
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

  const [maxAmount, setMaxAmount] = useState("");
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [loading, setLoading] = useState(true);

  const [bidHistoryOpen, setBidHistoryOpen] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Set<number>>(new Set());
  const [showReplyInput, setShowReplyInput] = useState<number | null>(null);
  const [localReplyText, setLocalReplyText] = useState<{ [key: number]: string }>(
    {}
  );

  const [question, setQuestion] = useState("");

  const [order, setOrder] = useState<any>(null);

  // Confirm place bid dialog
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Reject bid dialog
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedBidId, setSelectedBidId] = useState<number | null>(null);
  const [rejectResult, setRejectResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Rejected bidder status
  const [isRejectedBidder, setIsRejectedBidder] = useState(false);

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
        setIsRejectedBidder(productRes.data.data.isRejectedBidder || false);

        // Suggested max amount (auto-bidding only)
        if (productData.bids && productData.bids[0]) {
          const suggestedMax =
            Number(productData.currentPrice) + Number(productData.bidStep) * 2;
          setMaxAmount(String(suggestedMax));
        } else {
          setMaxAmount(String(productData.startingPrice));
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
  }, [id, user, navigate]);

  const handlePlaceBid = () => {
    if (!user) {
      toast.error("Please log in to place a bid");
      navigate("/login");
      return;
    }

    if (!maxAmount) {
      toast.error("Please enter a maximum amount");
      return;
    }

    setConfirmOpen(true);
  };

  const handleConfirmBid = async () => {
    try {
      await apiClient.post("/bids", {
        productId: id,
        amount: maxAmount, // System will calculate actual bid
        maxAmount: maxAmount,
        isAutoBid: true, // Always auto-bid
      });

      toast.success("Bid placed successfully");
      setConfirmOpen(false);

      const [productRes, bidHistoryRes] = await Promise.all([
        apiClient.get(`/products/${id}`),
        apiClient.get(`/bids/history/${id}`),
      ]);

      setProduct(productRes.data.data.product);
      setBidHistory(bidHistoryRes.data.data);
      setIsRejectedBidder(productRes.data.data.isRejectedBidder || false);
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
      toast.error("Please enter a comment");
      return;
    }

    try {
      await apiClient.post("/users/questions", {
        productId: id,
        question,
      });
      toast.success("Comment posted successfully");
      setQuestion("");

      const response = await apiClient.get(`/products/${id}`);
      setProduct(response.data.data.product);
      setRelatedProducts(response.data.data.relatedProducts || []);
      setIsRejectedBidder(response.data.data.isRejectedBidder || false);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || "Failed to post comment");
    }
  };

  const handleReply = async (parentId: number, replyText: string) => {
    if (!replyText.trim()) {
      toast.error("Please enter a reply");
      return;
    }

    try {
      await apiClient.post("/users/questions", {
        productId: id,
        question: replyText,
        parentId,
      });
      toast.success("Reply posted successfully");

      // Expand replies on the top-level parent
      let topLevelQuestionId = parentId;
      if (product) {
        for (const q of product.questions) {
          if (q.id === parentId) {
            topLevelQuestionId = q.id;
            break;
          }
          if (q.replies) {
            for (const r of q.replies) {
              if (r.id === parentId) {
                topLevelQuestionId = q.id;
                break;
              }
            }
          }
        }
      }

      setExpandedReplies((prev) => {
        const ns = new Set(prev);
        ns.add(topLevelQuestionId);
        return ns;
      });

      const response = await apiClient.get(`/products/${id}`);
      setProduct(response.data.data.product);
      setRelatedProducts(response.data.data.relatedProducts || []);
      setIsRejectedBidder(response.data.data.isRejectedBidder || false);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || "Failed to post reply");
    }
  };

  const toggleReplies = (questionId: number) => {
    setExpandedReplies((prev) => {
      const ns = new Set(prev);
      if (ns.has(questionId)) ns.delete(questionId);
      else ns.add(questionId);
      return ns;
    });
  };

  const handleOpenRejectDialog = (bidId: number) => {
    setSelectedBidId(bidId);
    setRejectResult(null);
    setRejectDialogOpen(true);
  };

  const handleRejectBid = async () => {
    if (!selectedBidId) return;

    try {
      await apiClient.put(`/bids/${selectedBidId}/reject`);
      setRejectResult({
        success: true,
        message:
          "Bid has been rejected successfully. The bidder will be notified.",
      });

      const [productRes, bidHistoryRes] = await Promise.all([
        apiClient.get(`/products/${id}`),
        apiClient.get(`/bids/history/${id}`),
      ]);

      setProduct(productRes.data.data.product);
      setBidHistory(bidHistoryRes.data.data);
      setIsRejectedBidder(productRes.data.data.isRejectedBidder || false);
    } catch (error: any) {
      setRejectResult({
        success: false,
        message: error.response?.data?.error?.message || "Failed to reject bid",
      });
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

  const isSeller = user?.id === product.sellerId;
  const isEnded =
    product.status === "ended" ||
    product.status === "cancelled" ||
    new Date(product.endDate) <= new Date();

  const canSeeAfterEnd =
    !isEnded ||
    isSeller ||
    (order && (user?.id === order.sellerId || user?.id === order.buyerId));

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

  return (
    <div className="space-y-6">
      {product.status === "cancelled" && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          <AlertCircle className="h-4 w-4 mt-0.5" />
          <p className="font-medium my-0">
            This product has been cancelled by the administrator.
          </p>
        </div>
      )}

      {product.status === "ended" && !order && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertCircle className="h-4 w-4 mt-0.5" />
          <p className="font-medium my-0">Product has ended</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* Left column */}
        <div className="space-y-6">
          {/* Gallery */}
          <Card>
            <CardContent className="p-0">
               <ProductImageCarousel images={allImages} productName={product.name} />
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
                        isInWatchlist ? "text-red-500 fill-red-500" : ""
                      }`}
                    />
                  </Button>
                </div>
              </CardTitle>

              <CardDescription className="flex flex-wrap gap-2">
                {product.status !== "cancelled" && (
                  <div className="inline-flex items-center rounded-full border dark:border-border/20 text-xs font-semibold transition-colors focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 gap-2 px-2.5 py-1 border-brand/30 text-brand">
                   <Clock className="h-3.5 w-3.5" />
                  <span>Ends: {formatRelativeTime(product.endDate)}</span>
                  </div>
                )}
                <Badge variant="outline" className="flex items-center gap-1">
                  <Gavel className="h-3.5 w-3.5" />
                  <span>{product.bidCount} bids</span>
                </Badge>
                <Badge variant="outline">{product.viewCount} views</Badge>
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Current price</p>
                <p className="text-3xl font-bold text-brand">
                  {Number(product.currentPrice).toLocaleString("vi-VN")} VNĐ
                </p>
              </div>

              {product.buyNowPrice && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Buy now price</p>
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
                      <Link to={`/users/${highestBidder.bidder.id}`} className="hover:underline hover:text-primary">
                        {highestBidder.bidder.fullName}
                      </Link>
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
                  Seller: <Link to={`/users/${product.seller.id}`} className="hover:underline hover:text-primary">{product.seller.fullName}</Link>
                </p>
                <p className="text-sm text-muted-foreground">
                  Rating:{" "}
                  <span className="font-medium">{sellerRating.toFixed(1)}%</span>{" "}
                  ({product.seller.rating}/{product.seller.totalRatings})
                </p>
              </div>

              {/* Description */}
              <div className="space-y-3">
                <h2 className="text-base font-semibold">Product Description</h2>
                <div className="rounded-lg border border-border bg-card p-4 md:p-6">
                  <div
                    className="text-sm leading-relaxed text-muted-foreground [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-foreground [&_h1]:mt-4 [&_h1]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-3 [&_h3]:mb-2 [&_p]:my-2 [&_p]:text-muted-foreground [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_strong]:text-foreground [&_em]:italic [&_u]:underline [&_s]:line-through [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:space-y-1 [&_ul]:my-3 [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:space-y-1 [&_ol]:my-3 [&_li]:my-1 [&_a]:text-foreground [&_a]:underline [&_a:hover]:text-foreground/80 [&_img]:max-w-full [&_img]:max-h-96 [&_img]:w-auto [&_img]:h-auto [&_img]:object-contain [&_img]:rounded-md [&_img]:my-4 [&_img]:mx-auto [&_img]:block [&_.ql-align-left]:text-left [&_.ql-align-center]:text-center [&_.ql-align-right]:text-right [&_.ql-align-justify]:text-justify"
                    dangerouslySetInnerHTML={{ __html: product.description }}
                  />
                </div>
              </div>

              {/* Comments */}
              <div className="space-y-3">
                <h2 className="text-base font-semibold">Comments</h2>

                {product.questions && product.questions.length > 0 ? (
                  <div className="space-y-4">
                    {product.questions.map((q) => {
                      const getInitials = (name: string) =>
                        name.charAt(0).toUpperCase();

                      const countAllReplies = (replies: any[]): number => {
                        let count = replies.length;
                        replies.forEach((reply) => {
                          if (reply.replies && reply.replies.length > 0) {
                            count += countAllReplies(reply.replies);
                          }
                        });
                        return count;
                      };

                      const renderComment = (
                        comment: any,
                        isReply = false,
                        depth = 0
                      ) => {
                        const commentUser = comment.user;
                        const isSellerComment =
                          commentUser.id === product.seller.id;
                        const canReply = !!user;

                        const commentReplies = comment.replies || [];
                        const commentReplyCount =
                          comment.replyCount ||
                          (commentReplies.length > 0
                            ? countAllReplies(commentReplies)
                            : 0);

                        const hasCommentReplies = commentReplyCount > 0;
                        const isExpanded = expandedReplies.has(comment.id);

                        const indentRem = isReply
                          ? Math.min(depth * 0.75 + 0.75, 3) // 0.75rem steps, max 3rem
                          : 0;

                        return (
                          <div
                            key={comment.id}
                            className="space-y-2"
                            style={isReply ? { marginLeft: `${indentRem}rem` } : undefined}
                          >
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>
                                  {getInitials(commentUser.fullName)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-semibold">
                                {commentUser.fullName}
                              </span>
                              {isSellerComment && (
                                <Badge variant="outline" className="text-xs">
                                  Seller
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {format(
                                  new Date(comment.createdAt),
                                  "dd/MM/yyyy HH:mm"
                                )}
                              </span>
                            </div>

                            <div className="ml-[40px] space-y-2">
                              <p className="text-sm text-foreground">
                                {comment.question}
                              </p>

                              {canReply && (
                                <div className="flex items-center gap-2 mt-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                                    onClick={() => {
                                      if (showReplyInput === comment.id) {
                                        setShowReplyInput(null);
                                      } else {
                                        setShowReplyInput(comment.id);
                                        setLocalReplyText({
                                          ...localReplyText,
                                          [comment.id]: "",
                                        });
                                      }
                                    }}
                                  >
                                    <Reply className="h-3 w-3 mr-1" />
                                    Reply
                                  </Button>
                                </div>
                              )}

                              {hasCommentReplies && (
                                <div className="mt-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground mb-2"
                                    onClick={() => toggleReplies(comment.id)}
                                  >
                                    {isExpanded ? (
                                      <>
                                        <ChevronUp className="h-3 w-3 mr-1" />
                                        Hide {commentReplyCount}{" "}
                                        {commentReplyCount === 1
                                          ? "reply"
                                          : "replies"}
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown className="h-3 w-3 mr-1" />
                                        View {commentReplyCount}{" "}
                                        {commentReplyCount === 1
                                          ? "reply"
                                          : "replies"}
                                      </>
                                    )}
                                  </Button>

                                  {isExpanded && (
                                    <div className="space-y-3 mt-2">
                                      {commentReplies.map((reply: any) =>
                                        renderComment(reply, true, depth + 1)
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}

                              {showReplyInput === comment.id && (
                                <div className="mt-2 space-y-2">
                                  <Textarea
                                    placeholder="Write a reply..."
                                    value={localReplyText[comment.id] || ""}
                                    onChange={(e) => {
                                      setLocalReplyText({
                                        ...localReplyText,
                                        [comment.id]: e.target.value,
                                      });
                                    }}
                                    className="min-h-[60px] text-sm"
                                  />
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      onClick={async () => {
                                        const replyText =
                                          localReplyText[comment.id] || "";
                                        if (replyText.trim()) {
                                          await handleReply(comment.id, replyText);
                                          setShowReplyInput(null);
                                          setLocalReplyText({
                                            ...localReplyText,
                                            [comment.id]: "",
                                          });
                                        }
                                      }}
                                    >
                                      Post
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setShowReplyInput(null);
                                        setLocalReplyText({
                                          ...localReplyText,
                                          [comment.id]: "",
                                        });
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      };

                      return (
                        <div
                          key={q.id}
                          className="space-y-2 border-b border-border pb-4 last:border-0"
                        >
                          {renderComment(q, false)}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No comments yet. Be the first to comment!
                  </p>
                )}

                {/* Comment input */}
                {user ? (
                  <div className="flex items-start gap-3 pt-4 border-t border-border">
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarFallback>
                        {user.fullName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                      <Textarea
                        placeholder="Write a comment..."
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        className="min-h-[40px] text-sm resize-y"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                            handleAskQuestion();
                          }
                        }}
                      />
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          Press Ctrl+Enter to send
                        </p>
                        <Button
                          size="sm"
                          onClick={handleAskQuestion}
                          disabled={!question.trim()}
                        >
                          Comment
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-border bg-card p-4 text-center mt-4">
                    <p className="text-sm text-muted-foreground mb-3">
                      Log in to comment
                    </p>
                    <Button size="sm" onClick={() => navigate("/login")}>
                      Log in
                    </Button>
                  </div>
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
                        <p className="text-xs font-medium line-clamp-2">{p.name}</p>
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
        {canSeeAfterEnd && (
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
                          isRejectedBidder ? (
                            <div className="space-y-3">
                              <Button className="w-full" disabled>
                                Place automatic bid
                              </Button>
                              <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
                                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                <span>
                                  You have been rejected from bidding on this product by the seller.
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4">
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
                                  The system will automatically bid up to this maximum amount to help you win at the lowest possible price.
                                </p>
                              </div>

                              <Button
                                className="w-full"
                                onClick={handlePlaceBid}
                                disabled={!maxAmount}
                              >
                                Place automatic bid
                              </Button>
                            </div>
                          )
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
                  <>
                    <div className="flex items-center gap-2 text-sm text-amber-900 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                      <AlertCircle className="h-4 w-4" />
                      <span>The auction has ended</span>
                    </div>

                    {(user && (isSeller || order)) && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setBidHistoryOpen(true)}
                      >
                        View bid history
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Confirm bid dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm your bid</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Maximum bid amount</span>
              <span className="font-semibold">
                {Number(maxAmount || "0").toLocaleString("vi-VN")} VNĐ
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              The system will automatically place bids on your behalf up to this maximum amount.
            </p>

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
                  {isSeller && <TableHead>Status</TableHead>}
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
                        {bid.isRejected ? (
                          <Badge variant="destructive">Rejected</Badge>
                        ) : (
                          <Badge variant="default">Active</Badge>
                        )}
                      </TableCell>
                    )}
                    {isSeller && (
                      <TableCell>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleOpenRejectDialog(bid.id)}
                          disabled={bid.isRejected}
                        >
                          {bid.isRejected ? "Rejected" : "Reject"}
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

      {/* Reject Bid Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader className="text-center">
            <DialogTitle className="text-center">
              {rejectResult ? "Reject Bid Result" : "Reject Bid"}
            </DialogTitle>
          </DialogHeader>

          {!rejectResult ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to reject this bid? This action cannot be undone.
                The bidder will be notified and will not be able to bid on this product again.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div
                className={`flex items-start gap-3 p-4 rounded-lg border ${
                  rejectResult.success
                    ? "bg-green-50 border-green-200 text-green-900"
                    : "bg-red-50 border-red-200 text-red-900"
                }`}
              >
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <p className="text-sm">{rejectResult.message}</p>
              </div>
            </div>
          )}

          <DialogFooter className="!justify-center sm:!justify-center">
            {!rejectResult ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setRejectDialogOpen(false);
                    setSelectedBidId(null);
                  }}
                >
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleRejectBid}>
                  Reject
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => {
                  setRejectDialogOpen(false);
                  setSelectedBidId(null);
                  setRejectResult(null);
                }}
              >
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
