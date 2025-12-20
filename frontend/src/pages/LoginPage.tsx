import { useRef } from "react";
import { Formik, Form, Field } from "formik";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import apiClient from "../api/client";
import toast from "react-hot-toast";
import * as Yup from "yup";
import ReCAPTCHA from "react-google-recaptcha";

const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

const validationSchema = Yup.object({
  email: Yup.string().email("Invalid email").required("Required"),
  password: Yup.string().required("Required"),
  recaptcha: Yup.string().required(
    "Please complete the reCAPTCHA verification"
  ),
});

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  return (
    <div className="max-w-md mx-auto mt-16">
      <Card>
        <CardHeader className="items-center">
          <div className="flex items-center gap-2 ">
            <img
              className="hover:rotate-180 transition-transform"
              src="/auctra.svg"
              width={40}
            />
          </div>
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <p className="text-muted-foreground text-sm">
            We are so happy to have you here!
          </p>
        </CardHeader>
        <CardContent>
          <Formik
            initialValues={{ email: "", password: "", recaptcha: "" }}
            validationSchema={validationSchema}
            onSubmit={async (values, { setSubmitting, resetForm }) => {
              try {
                const { recaptcha, ...restValues } = values;
                const response = await apiClient.post("/auth/login", {
                  ...restValues,
                  recaptchaToken: recaptcha,
                });
                const { data } = response.data;
                setAuth(data.user, data.accessToken, data.refreshToken);
                toast.success("Login successful");
                resetForm();
                if (recaptchaRef.current) {
                  recaptchaRef.current.reset();
                }
                navigate("/");
              } catch (error: any) {
                toast.error(
                  error.response?.data?.error?.message || "Login failed"
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
                      <p className="text-sm text-destructive">{errors.email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Field
                      as={Input}
                      id="password"
                      name="password"
                      type="password"
                      className={
                        touched.password && errors.password
                          ? "border-destructive"
                          : ""
                      }
                    />
                    {touched.password && errors.password && (
                      <p className="text-sm text-destructive">
                        {errors.password}
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
                    Login
                  </Button>
                  <div className="flex items-center justify-center gap-1">
                    <p className="text-muted-foreground text-sm mb-0">
                      Don't have an account?
                    </p>
                    <Link to="/register" className="font-semibold text-sm">
                      Register
                    </Link>
                  </div>
                </Form>
              );
            }}
          </Formik>
        </CardContent>
      </Card>
    </div>
  );
}
