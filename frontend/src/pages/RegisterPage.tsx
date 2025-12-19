import { Formik, Form, Field } from 'formik';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import toast from 'react-hot-toast';
import * as Yup from 'yup';

const validationSchema = Yup.object({
  email: Yup.string().email('Invalid email').required('Required'),
  password: Yup.string().min(6, 'Minimum 6 characters').required('Required'),
  fullName: Yup.string().required('Required'),
  address: Yup.string().required('Required'),
});

export default function RegisterPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto mt-16">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Register</CardTitle>
        </CardHeader>
        <CardContent>
          <Formik
            initialValues={{ email: '', password: '', fullName: '', address: '', dateOfBirth: '' }}
            validationSchema={validationSchema}
            onSubmit={async (values, { setSubmitting }) => {
              try {
                await apiClient.post('/auth/register', values);
                toast.success('Registration successful. Please check your email to verify your account.');
                navigate('/login');
              } catch (error: any) {
                toast.error(error.response?.data?.error?.message || 'Registration failed');
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {({ isSubmitting, errors, touched }) => (
              <Form className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Field
                    as={Input}
                    id="email"
                    name="email"
                    type="email"
                    placeholder="email@example.com"
                    className={touched.email && errors.email ? 'border-destructive' : ''}
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
                    className={touched.password && errors.password ? 'border-destructive' : ''}
                  />
                  {touched.password && errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full name</Label>
                  <Field
                    as={Input}
                    id="fullName"
                    name="fullName"
                    className={touched.fullName && errors.fullName ? 'border-destructive' : ''}
                  />
                  {touched.fullName && errors.fullName && (
                    <p className="text-sm text-destructive">{errors.fullName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Field
                    as={Input}
                    id="address"
                    name="address"
                    className={touched.address && errors.address ? 'border-destructive' : ''}
                  />
                  {touched.address && errors.address && (
                    <p className="text-sm text-destructive">{errors.address}</p>
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
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  Register
                </Button>
              </Form>
            )}
          </Formik>
        </CardContent>
      </Card>
    </div>
  );
}
