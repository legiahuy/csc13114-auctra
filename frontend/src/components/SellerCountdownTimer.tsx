import { useState, useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import apiClient from "../api/client";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

export default function SellerCountdownTimer() {
  const { user, updateUser } = useAuthStore();
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [expireAt, setExpireAt] = useState<Date | null>(null);

  useEffect(() => {
    if (user?.role !== "seller") {
      return;
    }

    // Fetch profile để lấy upgradeExpireAt mới nhất
    const fetchProfile = async () => {
      try {
        const response = await apiClient.get("/users/profile");
        const userData = response.data.data;
        
        if (userData.upgradeExpireAt) {
          const expireDate = new Date(userData.upgradeExpireAt);
          setExpireAt(expireDate);
          // Cập nhật vào store
          updateUser({ upgradeExpireAt: userData.upgradeExpireAt });
        } else {
          setExpireAt(null);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        // Nếu có upgradeExpireAt trong store, sử dụng nó
        if (user?.upgradeExpireAt) {
          setExpireAt(new Date(user.upgradeExpireAt));
        }
      }
    };

    fetchProfile();

    // Nếu đã có upgradeExpireAt trong store, sử dụng ngay
    if (user?.upgradeExpireAt) {
      setExpireAt(new Date(user.upgradeExpireAt));
    }

    // Refresh profile mỗi 30 giây để đảm bảo countdown timer luôn cập nhật
    const refreshInterval = setInterval(() => {
      fetchProfile();
    }, 30000); // 30 giây

    return () => clearInterval(refreshInterval);
  }, [user?.role, user?.upgradeExpireAt, updateUser]);

  useEffect(() => {
    if (!expireAt) {
      setTimeLeft("");
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const diff = expireAt.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft("Đã hết hạn");
        // Cập nhật role về bidder
        updateUser({ role: "bidder", upgradeExpireAt: null });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${seconds}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expireAt, updateUser]);

  if (user?.role !== "seller" || !expireAt || !timeLeft) {
    return null;
  }

  const isExpiringSoon = expireAt.getTime() - new Date().getTime() < 5 * 60 * 1000; // 5 phút

  return (
    <Badge
      variant={isExpiringSoon ? "destructive" : "secondary"}
      className="flex items-center gap-1 px-2 py-1"
    >
      <Clock className="h-3 w-3" />
      <span className="text-xs font-medium">
        Seller: {timeLeft}
      </span>
    </Badge>
  );
}

