import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import apiClient from "../api/client";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [email, setEmail] = useState<string>("");
  const tokenRef = useRef<string>("");

  // Get email and token from navigation state
  useEffect(() => {
    const state = location.state as {
      email?: string;
      verificationToken?: string;
    };
    if (!state?.email) {
      toast.error("Invalid verification request. Please register again.");
      navigate("/register");
      return;
    }
    setEmail(state.email);
    tokenRef.current = state.verificationToken || "";
  }, [location, navigate]);

  // Timer for resend button
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otp.trim()) {
      toast.error("Please enter the OTP");
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.post("/auth/verify-email", {
        token: tokenRef.current,
        otp,
      });

      toast.success("Email verified successfully!");
      navigate("/login");
    } catch (error: any) {
      toast.error(
        error.response?.data?.error?.message || "Verification failed"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setResendLoading(true);
    try {
      await apiClient.post("/auth/resend-otp", {
        email: email,
      });

      toast.success("OTP sent to your email!");
      setTimeLeft(60); // 60 seconds cooldown
    } catch (error: any) {
      toast.error(
        error.response?.data?.error?.message || "Failed to resend OTP"
      );
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16">
      <Card>
        <CardHeader className="items-center">
          <div className="flex items-center gap-2">
            <img
              className="hover:rotate-180 transition-transform"
              src="/auctra.svg"
              width={40}
            />
          </div>
          <CardTitle className="text-2xl">Verify Email</CardTitle>
          <p className="text-muted-foreground text-sm text-center">
            We've sent a verification code to <b>{email}</b>
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp">Verification Code</Label>
              <Input
                id="otp"
                type="text"
                placeholder="Enter 6-digit code"
                value={otp}
                onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                maxLength={6}
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || otp.length < 6}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify Email"
              )}
            </Button>

            <div className="flex items-center justify-center gap-1">
              <p className="text-muted-foreground text-sm mb-0">
                Didn't receive the code?
              </p>
              <Button
                type="button"
                variant="link"
                className="p-0 h-auto font-semibold text-sm text-muted-foreground"
                onClick={handleResendOTP}
                disabled={resendLoading || timeLeft > 0}
              >
                {timeLeft > 0 ? `Resend in ${timeLeft}s` : "Resend"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
