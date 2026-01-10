import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import apiClient from "../api/client";
import { format } from "date-fns";
import {
  AlertCircle,
  Star,
  ThumbsUp,
  ThumbsDown,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Loading from "@/components/Loading";
import { Separator } from "@/components/ui/separator";

interface PublicUser {
  id: number;
  fullName: string;
  createdAt: string;
  rating: number;
  totalRatings: number;
  role: string;
  reviews: Array<{
    id: number;
    rating: number;
    comment: string;
    createdAt: string;
    reviewer: {
      id: number;
      fullName: string;
    };
    order: {
      product: {
        id: number;
        name: string;
        mainImage: string;
      };
    };
  }>;
}

export default function PublicProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get(`/users/${id}/public`);
        setUser(response.data.data);
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProfile();
    }
  }, [id]);

  if (loading) return <Loading />;

  if (error || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <AlertCircle className="h-5 w-5" />
          <span>{error || "User not found"}</span>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-primary hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  const getRatingPercentage = (rating: number, totalRatings: number) => {
    if (totalRatings === 0) return 0;
    return (rating / totalRatings) * 100;
  };

  const ratingPercentage = getRatingPercentage(user.rating, user.totalRatings);
  const positiveCount = user.rating;
  const negativeCount = Math.max(user.totalRatings - user.rating, 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Card>
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
            <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center text-4xl font-bold text-muted-foreground uppercase flex-shrink-0">
              {user.fullName.charAt(0)}
            </div>
            
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                  {user.fullName}
                </h1>
                <Badge variant={user.role === 'seller' ? 'default' : 'secondary'}>
                  {user.role === 'seller' ? 'Seller' : 'Member'}
                </Badge>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <span>Joined {format(new Date(user.createdAt), "MMMM yyyy")}</span>
                </div>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="grid gap-6 md:grid-cols-2">
            {/* Rating Stats */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Rating Overview
              </h3>
              
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border">
                <div className="flex flex-col items-center justify-center h-20 w-20 rounded-full bg-background border-2 border-primary/20">
                  <span className="text-xl font-bold">{ratingPercentage.toFixed(0)}%</span>
                  <span className="text-[10px] text-muted-foreground uppercase">Positive</span>
                </div>
                
                <div className="space-y-2 flex-1">
                  <div className="flex items-center justify-between text-sm">
                     <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-500">
                       <ThumbsUp className="h-4 w-4" /> Positive
                     </span>
                     <span className="font-semibold">{positiveCount}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between text-sm">
                     <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-500">
                       <ThumbsDown className="h-4 w-4" /> Negative
                     </span>
                     <span className="font-semibold">{negativeCount}</span>
                  </div>
                  <div className="text-xs text-muted-foreground text-right pt-1">
                    Based on {user.totalRatings} reviews
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity / Reviews Summary */}
            <div className="space-y-4">
               <h3 className="text-lg font-semibold">Recent Reviews</h3>
               {user.reviews.length > 0 ? (
                 <div className="space-y-3">
                   {user.reviews.slice(0, 3).map((review) => (
                     <div key={review.id} className="p-3 rounded-lg border bg-card text-sm space-y-2">
                       <div className="flex justify-between items-start">
                         <span className="font-medium">{review.reviewer.fullName}</span>
                         <span className="text-xs text-muted-foreground">
                           {format(new Date(review.createdAt), "dd/MM/yyyy")}
                         </span>
                       </div>
                       <div className="flex items-center gap-2">
                            {review.rating === 1 ? (
                              <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600 text-[10px] h-5 px-1.5">
                                <ThumbsUp className="h-3 w-3 mr-1" /> Recommend
                              </Badge>
                            ) : (
                              <Badge variant="default" className="text-[10px] h-5 px-1.5 bg-red-500 hover:bg-red-600">
                                <ThumbsDown className="h-3 w-3 mr-1" /> Not Recommend
                              </Badge>
                            )}
                       </div>
                       {review.comment && (
                         <p className="text-muted-foreground line-clamp-2">
                           "{review.comment}"
                         </p>
                       )}
                     </div>
                   ))}
                 </div>
               ) : (
                 <p className="text-sm text-muted-foreground italic">No reviews yet.</p>
               )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Full Review List */}
      <Card>
        <CardHeader>
          <CardTitle>All Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {user.reviews.length > 0 ? (
              user.reviews.map((review) => (
                <div key={review.id} className="border-b last:border-0 pb-4 last:pb-0 space-y-2">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold uppercase">
                                {review.reviewer.fullName.charAt(0)}
                            </div>
                            <div>
                                <p className="text-sm font-semibold">{review.reviewer.fullName}</p>
                                <p className="text-xs text-muted-foreground">
                                    {format(new Date(review.createdAt), "dd MMM yyyy, HH:mm")}
                                </p>
                            </div>
                        </div>
                         {review.rating === 1 ? (
                              <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
                                <ThumbsUp className="h-3 w-3 mr-1" /> Positive
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-rose-600 border-rose-200 bg-rose-50">
                                <ThumbsDown className="h-3 w-3 mr-1" /> Negative
                              </Badge>
                            )}
                    </div>
                    
                    {review.comment && (
                        <p className="text-sm text-foreground bg-muted/30 p-3 rounded-md">
                            {review.comment}
                        </p>
                    )}
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Product:</span>
                        <span className="font-medium text-foreground">
                            <Link to={`/products/${review.order.product.id}`} className="hover:underline hover:text-primary">
                                {review.order.product.name}
                            </Link>
                        </span>
                    </div>
                </div>
              ))
            ) : (
                <div className="text-center py-8 text-muted-foreground">
                    This user hasn't received any reviews yet.
                </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
