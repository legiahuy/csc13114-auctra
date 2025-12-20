import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

interface PublicRouteProps {
  children: ReactNode;
}

/**
 * PublicRoute component - restricts authenticated users from accessing auth pages
 * Redirects logged-in users to homepage
 */
export function PublicRoute({ children }: PublicRouteProps) {
  const { user } = useAuthStore();

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
