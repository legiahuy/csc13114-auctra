import { Formik, Form, Field } from 'formik';
import { TextField, Button, Box, Typography, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import toast from 'react-hot-toast';
import * as Yup from 'yup';

const validationSchema = Yup.object({
  email: Yup.string().email('Email không hợp lệ').required('Bắt buộc'),
  password: Yup.string().min(6, 'Tối thiểu 6 ký tự').required('Bắt buộc'),
  fullName: Yup.string().required('Bắt buộc'),
  address: Yup.string().required('Bắt buộc'),
});

export default function RegisterPage() {
  const navigate = useNavigate();

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 8 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Đăng ký
        </Typography>
        <Formik
          initialValues={{ email: '', password: '', fullName: '', address: '', dateOfBirth: '' }}
          validationSchema={validationSchema}
          onSubmit={async (values, { setSubmitting }) => {
            try {
              await apiClient.post('/auth/register', values);
              toast.success('Đăng ký thành công. Vui lòng kiểm tra email để xác nhận.');
              navigate('/login');
            } catch (error: any) {
              toast.error(error.response?.data?.error?.message || 'Đăng ký thất bại');
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {({ isSubmitting, errors, touched }) => (
            <Form>
              <Field
                as={TextField}
                name="email"
                label="Email"
                fullWidth
                margin="normal"
                error={touched.email && !!errors.email}
                helperText={touched.email && errors.email}
              />
              <Field
                as={TextField}
                name="password"
                label="Mật khẩu"
                type="password"
                fullWidth
                margin="normal"
                error={touched.password && !!errors.password}
                helperText={touched.password && errors.password}
              />
              <Field
                as={TextField}
                name="fullName"
                label="Họ tên"
                fullWidth
                margin="normal"
                error={touched.fullName && !!errors.fullName}
                helperText={touched.fullName && errors.fullName}
              />
              <Field
                as={TextField}
                name="address"
                label="Địa chỉ"
                fullWidth
                margin="normal"
                error={touched.address && !!errors.address}
                helperText={touched.address && errors.address}
              />
              <Field
                as={TextField}
                name="dateOfBirth"
                label="Ngày sinh"
                type="date"
                fullWidth
                margin="normal"
                InputLabelProps={{ shrink: true }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3 }}
                disabled={isSubmitting}
              >
                Đăng ký
              </Button>
            </Form>
          )}
        </Formik>
      </Paper>
    </Box>
  );
}

