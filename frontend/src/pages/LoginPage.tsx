import { Formik, Form, Field } from 'formik';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import apiClient from '../api/client';
import toast from 'react-hot-toast';
import * as Yup from 'yup';

const validationSchema = Yup.object({
  email: Yup.string().email('Invalid email').required('Required'),
  password: Yup.string().required('Required'),
});

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  return (
    <div className="max-w-md mx-auto mt-16">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
        </CardHeader>
        <CardContent>
          <Formik
            initialValues={{ email: '', password: '' }}
            validationSchema={validationSchema}
            onSubmit={async (values, { setSubmitting }) => {
              try {
                const response = await apiClient.post('/auth/login', values);
                const { data } = response.data;
                setAuth(data.user, data.accessToken, data.refreshToken);
                toast.success('Login successful');
                navigate('/');
              } catch (error: any) {
                toast.error(error.response?.data?.error?.message || 'Login failed');
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
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  Login
                </Button>
              </Form>
            )}
          </Formik>
        </CardContent>
      </Card>
    </div>
  );
}
