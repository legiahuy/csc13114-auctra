import { useRef } from "react";
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

const siteKey = "6LeSUC8sAAAAAB6UQTmCl61hTMzILapbHYUux9jJ";

const validationSchema = Yup.object({
  email: Yup.string().email("Invalid email").required("Required"),
  password: Yup.string().min(6, "Minimum 6 characters").required("Required"),
  fullName: Yup.string().required("Required"),
  address: Yup.string().required("Required"),
  recaptcha: Yup.string().required(
    "Please complete the reCAPTCHA verification"
  ),
});

export default function RegisterPage() {
  const navigate = useNavigate();
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
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <p className="text-muted-foreground text-sm">
            Join and discover thousands of unique products!
          </p>
        </CardHeader>
        <CardContent>
          <Formik
            initialValues={{
              email: "",
              password: "",
              fullName: "",
              address: "",
              dateOfBirth: "",
              recaptcha: "",
            }}
            validationSchema={validationSchema}
            onSubmit={async (values, { setSubmitting, resetForm }) => {
              try {
                // Send recaptchaToken instead of recaptcha
                const { recaptcha, ...restValues } = values;
                await apiClient.post("/auth/register", {
                  ...restValues,
                  recaptchaToken: recaptcha,
                });
                toast.success(
                  "Registration successful. Please check your email to verify your account."
                );
                resetForm();
                if (recaptchaRef.current) {
                  recaptchaRef.current.reset();
                }
                navigate("/login");
              } catch (error: any) {
                toast.error(
                  error.response?.data?.error?.message || "Registration failed"
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
                    <Label htmlFor="fullName">Full name</Label>
                    <Field
                      as={Input}
                      id="fullName"
                      name="fullName"
                      className={
                        touched.fullName && errors.fullName
                          ? "border-destructive"
                          : ""
                      }
                    />
                    {touched.fullName && errors.fullName && (
                      <p className="text-sm text-destructive">
                        {errors.fullName}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Field
                      as={Input}
                      id="address"
                      name="address"
                      className={
                        touched.address && errors.address
                          ? "border-destructive"
                          : ""
                      }
                    />
                    {touched.address && errors.address && (
                      <p className="text-sm text-destructive">
                        {errors.address}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of birth</Label>
                    <Field
                      as={Input}
                      id="dateOfBirth"
                      name="dateOfBirth"
                      type="date"
                    />
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
                    Register
                  </Button>
                  <div className="flex items-center justify-center gap-1">
                    <p className="text-muted-foreground text-sm mb-0">
                      Already have an account?
                    </p>
                    <Link to="/login" className="font-semibold text-sm">
                      Login
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
