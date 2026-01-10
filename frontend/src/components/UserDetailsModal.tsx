import { useState, useEffect } from "react";
import { Mail, Calendar, Package, Gavel, ShoppingCart, TrendingUp } from "lucide-react";
import apiClient from "../api/client";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import Loading from "./Loading";

interface UserDetailsModalProps {
  userId: number | null;
  open: boolean;
  onClose: () => void;
  onRoleUpdated: () => void;
}

interface UserDetails {
  user: {
    id: number;
    email: string;
    fullName: string;
    role: string;
    createdAt: string;
    upgradeRequestStatus?: string;
    upgradeRequestDate?: string;
    upgradeExpireAt?: string;
  };
  products: any[];
  bids: any[];
  orders: any[];
}

export default function UserDetailsModal({
  userId,
  open,
  onClose,
  onRoleUpdated,
}: UserDetailsModalProps) {
  const [details, setDetails] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (open && userId) {
      fetchUserDetails();
    }
  }, [open, userId]);

  const fetchUserDetails = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const res = await apiClient.get(`/admin/users/${userId}/details`);
      setDetails(res.data.data);
      setSelectedRole(res.data.data.user.role);
    } catch (error) {
      console.error("Error fetching user details:", error);
      toast.error("Failed to load user details");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!userId || !selectedRole || selectedRole === details?.user.role) return;

    try {
      setUpdating(true);
      await apiClient.put(`/admin/users/${userId}/role`, { role: selectedRole });
      toast.success("User role updated successfully");
      onRoleUpdated();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || "Failed to update role");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>User Details</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-12">
            <Loading />
          </div>
        ) : details ? (
          <div className="space-y-6">
            {/* User Info */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">{details.user.fullName}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{details.user.email}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Joined {new Date(details.user.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Role Management */}
              <div className="border rounded-lg p-4 bg-muted/30">
                <label className="text-sm font-medium mb-2 block">User Role</label>
                <div className="flex items-center gap-3">
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bidder">Bidder</SelectItem>
                      <SelectItem value="seller">Seller</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  {selectedRole !== details.user.role && (
                    <Button
                      size="sm"
                      onClick={handleUpdateRole}
                      disabled={updating}
                    >
                      {updating ? "Updating..." : "Update Role"}
                    </Button>
                  )}
                </div>
                {details.user.upgradeRequestStatus && (
                  <div className="mt-2">
                    <span className="text-xs text-muted-foreground">
                      Upgrade Request:{" "}
                      <Badge variant={details.user.upgradeRequestStatus === "pending" ? "outline" : "default"} className={details.user.upgradeRequestStatus === "approved" ? "bg-green-500 hover:bg-green-600" :  details.user.upgradeRequestStatus === "rejected" ? "bg-red-500 hover:bg-red-600" : "" }>
                        {details.user.upgradeRequestStatus.toString().charAt(0).toUpperCase() + details.user.upgradeRequestStatus.toString().slice(1)}
                      </Badge>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Activity Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="border rounded-lg p-4 text-center">
                <Package className="h-5 w-5 mx-auto mb-2 text-blue-500" />
                <div className="text-2xl font-bold">{details.products.length}</div>
                <div className="text-xs text-muted-foreground">Products</div>
              </div>
              <div className="border rounded-lg p-4 text-center">
                <Gavel className="h-5 w-5 mx-auto mb-2 text-green-500" />
                <div className="text-2xl font-bold">{details.bids.length}</div>
                <div className="text-xs text-muted-foreground">Bids</div>
              </div>
              <div className="border rounded-lg p-4 text-center">
                <ShoppingCart className="h-5 w-5 mx-auto mb-2 text-orange-500" />
                <div className="text-2xl font-bold">{details.orders.length}</div>
                <div className="text-xs text-muted-foreground">Orders</div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Recent Activity
              </h4>

              {details.products.length > 0 ? (
                <div className="border rounded-lg p-3">
                  <div className="text-sm font-medium mb-2">Recent Products</div>
                  <div className="space-y-1">
                    {details.products.slice(0, 3).map((product: any) => (
                      <div key={product.id} className="text-xs flex justify-between">
                        <span className="truncate">{product.name}</span>
                        <Badge
                          variant={product.status === 'active' ? 'default' : product.status === 'ended' ? 'secondary' : 'destructive'}
                          className={`text-xs ml-2 capitalize ${product.status === 'active' ? 'bg-green-500 hover:bg-green-600' : ''
                            }`}
                        >
                          {product.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="border rounded-lg p-3">
                  <div className="text-sm font-medium mb-2">Recent Products</div>
                  <div className="text-xs text-muted-foreground text-center py-2">
                    No products yet
                  </div>
                </div>
              )}

              {details.bids.length > 0 ? (
                <div className="border rounded-lg p-3">
                  <div className="text-sm font-medium mb-2">Recent Bids</div>
                  <div className="space-y-1">
                    {details.bids.slice(0, 3).map((bid: any) => (
                      <div key={bid.id} className="text-xs flex justify-between">
                        <span className="truncate">{bid.product?.name || "Unknown"}</span>
                        <span className="text-muted-foreground ml-2">
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(bid.product?.currentPrice || 0)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="border rounded-lg p-3">
                  <div className="text-sm font-medium mb-2">Recent Bids</div>
                  <div className="text-xs text-muted-foreground text-center py-2">
                    No bids yet
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            No user details available
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
