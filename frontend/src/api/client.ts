import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Response interceptor to handle token refresh and seller expiration
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle seller upgrade expiration (403)
    if (error.response?.status === 403 && error.response?.data?.message?.includes('hết thời hạn')) {
      const { updateUser } = useAuthStore.getState();
      // Cập nhật role về bidder
      updateUser({ role: 'bidder' });
      // Không reject error để component có thể xử lý
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { refreshToken } = useAuthStore.getState();
        if (refreshToken) {
          const response = await axios.post('/api/auth/refresh-token', {
            refreshToken,
          });

          const { accessToken: newAccessToken } = response.data.data;
          useAuthStore.getState().setAuth(
            useAuthStore.getState().user!,
            newAccessToken,
            refreshToken
          );

          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        const { logout } = useAuthStore.getState();
        logout();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;

