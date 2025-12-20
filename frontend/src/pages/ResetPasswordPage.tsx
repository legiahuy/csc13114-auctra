import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import apiClient from "../api/client";
import toast from "react-hot-toast";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";
import { Loader2 } from "lucide-react";

const validationSchema = Yup.object({
  otp: Yup.string()
    .length(6, "OTP must be 6 digits")
    .required("OTP is required"),
  newPassword: Yup.string()
    .min(6, "Password must be at least 6 characters")
    .required("Password is required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("newPassword")], "Passwords must match")
    .required("Please confirm your password"),
});

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const tokenRef = useRef<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Get token from navigation state
  useEffect(() => {
    const state = location.state as { resetToken?: string };
    if (!state?.resetToken) {
      toast.error(
        "Invalid reset request. Please use forgot password link again."
      );
      navigate("/login");
      return;
    }
    tokenRef.current = state.resetToken;
  }, [location, navigate]);

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
          <CardTitle className="text-2xl">Reset Password</CardTitle>
          <p className="text-muted-foreground text-sm">
            Enter the verification code and your new password
          </p>
        </CardHeader>
        <CardContent>
          <Formik
            initialValues={{
              otp: "",
              newPassword: "",
              confirmPassword: "",
            }}
            validationSchema={validationSchema}
            onSubmit={async (values, { setSubmitting }) => {
              try {
                await apiClient.post("/auth/reset-password", {
                  token: tokenRef.current,
                  otp: values.otp,
                  newPassword: values.newPassword,
                });

                toast.success("Password reset successfully!");
                navigate("/login");
              } catch (error: any) {
                toast.error(
                  error.response?.data?.error?.message ||
                    "Password reset failed"
                );
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {({ isSubmitting, errors, touched }) => (
              <Form className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">Verification Code</Label>
                  <Field
                    as={Input}
                    id="otp"
                    name="otp"
                    type="text"
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    className={`text-center text-2xl ${
                      touched.otp && errors.otp ? "border-destructive" : ""
                    }`}
                  />
                  {touched.otp && errors.otp && (
                    <p className="text-sm text-destructive">{errors.otp}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Field
                      as={Input}
                      id="newPassword"
                      name="newPassword"
                      type={showPassword ? "text" : "password"}
                      className={
                        touched.newPassword && errors.newPassword
                          ? "border-destructive pr-10"
                          : "pr-10"
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {touched.newPassword && errors.newPassword && (
                    <p className="text-sm text-destructive">
                      {errors.newPassword}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Field
                      as={Input}
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      className={
                        touched.confirmPassword && errors.confirmPassword
                          ? "border-destructive pr-10"
                          : "pr-10"
                      }
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {touched.confirmPassword && errors.confirmPassword && (
                    <p className="text-sm text-destructive">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </Button>
              </Form>
            )}
          </Formik>
        </CardContent>
      </Card>
    </div>
  );
}
