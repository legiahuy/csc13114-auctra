import { ReactNode, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import apiClient from "../api/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import SellerCountdownTimer from "./SellerCountdownTimer";

interface LayoutProps {
  children: ReactNode;
}

interface Category {
  id: number;
  name: string;
  children?: Category[];
  slug: string;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetchCategories();
  }, []);

  // Periodically check if user's role has changed
  useEffect(() => {
    if (!user) return;

    let isActive = true;

    const checkUserRole = async () => {
      if (!isActive) return;
      
      try {
        const response = await apiClient.get("/users/profile");
        const updatedUser = response.data.data;
        
        // Get the current user from the store at check time
        const currentUser = useAuthStore.getState().user;
        if (!currentUser) return;
        
        console.log("Role check:", {
          currentRole: currentUser.role,
          fetchedRole: updatedUser.role,
          willUpdate: updatedUser.role !== currentUser.role
        });
        
        // If role or upgrade status has changed, update the auth store
        if (
          updatedUser.role !== currentUser.role ||
          updatedUser.upgradeExpireAt !== currentUser.upgradeExpireAt
        ) {
          console.log("Updating user role from", currentUser.role, "to", updatedUser.role);
          // Call updateUser directly from store to avoid dependency issues
          useAuthStore.getState().updateUser({
            role: updatedUser.role,
            upgradeExpireAt: updatedUser.upgradeExpireAt,
          });
        }
      } catch (error) {
        console.error("Error checking user role:", error);
      }
    };

    // Check immediately on mount
    checkUserRole();

    // Then check every 10 seconds
    const interval = setInterval(checkUserRole, 10000);

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [user?.id]); // Only re-run if user ID changes (login/logout)

  const fetchCategories = async () => {
    try {
      const response = await apiClient.get("/categories");
      setCategories(response.data.data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleCategoryClick = (catSlug: string) => {
    navigate(`/category/${catSlug}`);
  };

  return (
    <div className="flex flex-col min-h-screen relative">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-brand/20 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="fixed bottom-0 right-0 w-[800px] h-[600px] bg-brand/15 blur-[130px] rounded-full pointer-events-none -z-10" />
      <div className="fixed top-1/2 left-0 -translate-y-1/2 w-[600px] h-[400px] bg-brand/10 blur-[100px] rounded-full pointer-events-none -z-10" />
      <header className="sticky top-0 z-50 -mb-4 px-4 pb-4">
        <div className="fade-bottom bg-background/15 absolute left-0 h-24 w-full backdrop-blur-lg" />
        <div className="container mx-auto px-4 relative">
          <div className="flex h-16 items-center justify-between ">
            <Link to="/" className="flex items-center gap-2 ">
              <img
                className="hover:rotate-180 transition-transform"
                src="/auctra.svg"
                width={30}
              />
              <div className="text-xl font-bold text-foreground">Auctra</div>
            </Link>
            <div className="md:hidden flex items-center gap-2">
              {user && user.role === "seller" && <SellerCountdownTimer />}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="overflow-y-auto">
                  <div className="flex flex-col gap-4 mt-8">
                    {user ? (
                      <div className="flex items-center gap-2 mb-4">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {user.fullName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-semibold">{user.fullName}</span>
                      </div>
                    ) : (
                      <div className="flex gap-2 w-full">
                        <Button variant="ghost" className="flex-1" asChild>
                          <Link to="/login">Login</Link>
                        </Button>
                        <Button className="flex-1" asChild>
                          <Link to="/register">Register</Link>
                        </Button>
                      </div>
                    )}
                    <Separator />
                    <Link to="/products" className="text-lg font-medium py-2">
                      Products
                    </Link>
                    <div className="flex flex-col gap-2">
                      <p className="text-sm text-muted-foreground font-semibold">
                        Categories
                      </p>
                      {categories.map((category) => (
                        <div key={category.id} className="ml-2">
                          <div
                            className="font-medium cursor-pointer py-1"
                            onClick={() => handleCategoryClick(category.slug)}
                          >
                            {category.name}
                          </div>
                          {category.children &&
                            category.children.map((child) => (
                              <div
                                key={child.id}
                                className="ml-4 text-sm text-muted-foreground cursor-pointer py-1"
                                onClick={() => handleCategoryClick(child.slug)}
                              >
                                {child.name}
                              </div>
                            ))}
                        </div>
                      ))}
                    </div>
                    {user && (
                      <>
                        <Link
                          to="/watchlist"
                          className="text-lg font-medium py-2"
                        >
                          Watchlist
                        </Link>
                        <Link to="/my-bids" className="text-lg font-medium py-2">
                          My Bids
                        </Link>
                        <Link to="/profile" className="text-lg font-medium py-2">
                          Profile
                        </Link>
                        {user.role === "seller" && (
                          <Link
                            to="/seller/dashboard"
                            className="text-lg font-medium py-2"
                          >
                            Seller Dashboard
                          </Link>
                        )}
                        {user.role === "admin" && (
                          <Link
                            to="/admin/dashboard"
                            className="text-lg font-medium py-2"
                          >
                            Admin Dashboard
                          </Link>
                        )}
                        <Button
                          variant="ghost"
                          onClick={handleLogout}
                          className="justify-start px-0 text-red-500 hover:text-red-600 hover:bg-transparent text-lg font-medium"
                        >
                          Logout
                        </Button>
                      </>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
            <nav className="hidden md:flex items-center gap-4">
              <Button variant="ghost" asChild>
                <Link to="/products">Products</Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost">Categories</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {categories.length === 0 ? (
                    <DropdownMenuItem disabled>Loading...</DropdownMenuItem>
                  ) : (
                    categories.map((category) =>
                      category.children && category.children.length > 0 ? (
                        <DropdownMenuSub key={category.id}>
                          <DropdownMenuSubTrigger
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleCategoryClick(category.slug);
                            }}
                          >
                            {category.name}
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            {category.children.map((child) => (
                              <DropdownMenuItem
                                key={child.id}
                                onSelect={() => handleCategoryClick(child.slug)}
                                className="focus-visible:outline-none focus-visible:ring-0"
                              >
                                {child.name}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                      ) : (
                        <DropdownMenuItem
                          key={category.slug}
                          onSelect={() => handleCategoryClick(category.slug)}
                          className="focus-visible:outline-none focus-visible:ring-0"
                        >
                          {category.name}
                        </DropdownMenuItem>
                      )
                    )
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              {user && (
                <>
                  <Button variant="ghost" asChild>
                    <Link to="/watchlist">Watchlist</Link>
                  </Button>
                  <Button variant="ghost" asChild>
                    <Link to="/my-bids">My Bids</Link>
                  </Button>
                </>
              )}
              <Separator orientation="vertical" className="h-6" />
              {user && user.role === "seller" && <SellerCountdownTimer />}
              {user ? (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="flex items-center gap-2"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {user.fullName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span>{user.fullName}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => navigate("/profile")}>
                        Profile
                      </DropdownMenuItem>
                      {user.role === "seller" && (
                        <DropdownMenuItem
                          onSelect={() => navigate("/seller/dashboard")}
                        >
                          Dashboard
                        </DropdownMenuItem>
                      )}
                      {user.role === "admin" && (
                        <DropdownMenuItem
                          onSelect={() => navigate("/admin/dashboard")}
                        >
                          Admin
                        </DropdownMenuItem>
                      )}
                      <Separator />
                      <DropdownMenuItem onSelect={handleLogout} className="text-red-500">
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  <Button variant="ghost" asChild>
                    <Link to="/login">Login</Link>
                  </Button>
                  <Button asChild>
                    <Link to="/register">Register</Link>
                  </Button>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>
      <main className="py-8 flex-1">
        <div className="container mx-auto px-4">{children}</div>
      </main>
      <footer className="border-t py-5">
        <div className="container mx-auto text-center text-muted-foreground">
          <p className="my-0 text-xs sm:flex-row">
            © 2025 Auctra. All rights reserved
          </p>
        </div>
      </footer>
    </div>
  );
}
