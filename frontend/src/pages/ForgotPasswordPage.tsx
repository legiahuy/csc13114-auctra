import { useRef, useState } from "react";
import { Formik, Form, Field } from "formik";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate, Link } from "react-router-dom";
import apiClient from "../api/client";
import toast from "react-hot-toast";
import * as Yup from "yup";
import ReCAPTCHA from "react-google-recaptcha";
import { Loader2 } from "lucide-react";

const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

const validationSchema = Yup.object({
  email: Yup.string().email("Invalid email").required("Email is required"),
  recaptcha: Yup.string().required(
    "Please complete the reCAPTCHA verification"
  ),
});

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");

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
          <CardTitle className="text-2xl">Forgot Password</CardTitle>
          <p className="text-muted-foreground text-sm">
            {resetToken
              ? "We've sent a verification code to your email"
              : "Enter your email to receive a password reset code"}
          </p>
        </CardHeader>
        <CardContent>
          {!resetToken ? (
            <Formik
              initialValues={{ email: "", recaptcha: "" }}
              validationSchema={validationSchema}
              onSubmit={async (values, { setSubmitting }) => {
                try {
                  const { recaptcha, ...restValues } = values;
                  const response = await apiClient.post(
                    "/auth/forgot-password",
                    {
                      ...restValues,
                      recaptchaToken: recaptcha,
                    }
                  );

                  setEmail(values.email);
                  setResetToken(response.data.data.resetToken);
                  toast.success("Verification code sent to your email!");
                  if (recaptchaRef.current) {
                    recaptchaRef.current.reset();
                  }
                } catch (error: any) {
                  toast.error(
                    error.response?.data?.error?.message ||
                      "Failed to send reset code"
                  );
                  if (recaptchaRef.current) {
                    recaptchaRef.current.reset();
                  }
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {({ isSubmitting, errors, touched, setFieldValue }) => {
                const handleRecaptchaChange = (value: string | null) => {
                  setFieldValue("recaptcha", value || "");
                };

                return (
                  <Form className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Field
                        as={Input}
                        id="email"
                        name="email"
                        type="email"
                        placeholder="email@example.com"
                        className={
                          touched.email && errors.email
                            ? "border-destructive"
                            : ""
                        }
                      />
                      {touched.email && errors.email && (
                        <p className="text-sm text-destructive">
                          {errors.email}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <ReCAPTCHA
                        className="min-w-full"
                        ref={recaptchaRef}
                        sitekey={siteKey}
                        onChange={handleRecaptchaChange}
                      />
                      {touched.recaptcha && errors.recaptcha && (
                        <p className="text-sm text-destructive">
                          {errors.recaptcha}
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
                          Sending...
                        </>
                      ) : (
                        "Send Reset Code"
                      )}
                    </Button>
                    <div className="flex items-center justify-center gap-1">
                      <p className="text-muted-foreground text-sm mb-0">
                        Remember your password?
                      </p>
                      <Link to="/login" className="font-semibold text-sm">
                        Login
                      </Link>
                    </div>
                  </Form>
                );
              }}
            </Formik>
          ) : (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                A reset code has been sent to <strong>{email}</strong>
              </p>
              <Button
                className="w-full"
                onClick={() => {
                  navigate("/reset-password", {
                    state: { resetToken },
                  });
                }}
              >
                Enter Reset Code
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setResetToken(null);
                  setEmail("");
                }}
              >
                Use Different Email
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
