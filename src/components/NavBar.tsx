
import { useEffect, useState } from "react";
import { Bell, Menu, MessageCircle, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import logo from '../images/logo2.gif'

interface NavBarProps {
  isAuthenticated: boolean;
  onAuthClick: () => void;
  onMenuToggle: () => void;
}

const NavBar: React.FC<NavBarProps> = ({ 
  isAuthenticated, 
  onAuthClick,
  onMenuToggle
}) => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchInput.trim())}`);
      setSearchInput("");
      setIsSearchOpen(false);
    }
  };

  return (
    <header 
      className={cn(
        "fixed top-0 left-0 right-0 z-40 py-3 transition-all duration-300",
        isScrolled ? "bg-white/80 backdrop-blur-md shadow-sm" : "bg-transparent"
      )}
    >
      <div className="container px-4 mx-auto flex justify-between items-center">
        {/* Logo */}
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden mr-2"
            onClick={onMenuToggle}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex justify-center items-center">
            <img src={logo} alt="logo" className="size-10 opacity-60" />
            <h1 className="text-xl font-bold text-primary tracking-tight">Looply</h1>
            </div>
        </div>

        {/* Search bar - Desktop */}
        <div className="hidden md:flex items-center relative max-w-md w-full mx-4">
          <form onSubmit={handleSearch} className="w-full">
            <div className="relative w-full">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                <Search size={18} />
              </div>
              <Input 
                placeholder="Search..." 
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10 pr-4 w-full rounded-full bg-gray-100 border-0 focus-visible:ring-1 focus-visible:ring-primary"
              />
            </div>
          </form>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          {/* Search Icon - Mobile */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden relative"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
          >
            {isSearchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </Button>

          {isAuthenticated ? (
            <>
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative"
                asChild
              >
                <Link to="/chat">
                  <MessageCircle className="h-5 w-5" />
                  <span className="absolute top-1 right-1 h-2 w-2 bg-primary rounded-full"></span>
                </Link>
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative"
                asChild
              >
                <Link to="/notifications">
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-1 right-1 h-2 w-2 bg-primary rounded-full"></span>
                </Link>
              </Button>
              <Link to="/profile">
                <Avatar className="h-8 w-8 border border-gray-200">
                  <AvatarImage src={profile?.avatar_url || ''} />
                  <AvatarFallback className="bg-primary text-white">
                    {profile?.display_name?.substring(0, 2).toUpperCase() || 
                     profile?.username?.substring(0, 2).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Link>
            </>
          ) : (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                className="hidden sm:inline-flex rounded-full text-primary border-primary hover:bg-primary-100"
                onClick={onAuthClick}
              >
                Log In
              </Button>
              <Button 
                size="sm" 
                className="rounded-full bg-primary hover:bg-primary-600"
                onClick={onAuthClick}
              >
                Sign Up
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div 
        className={cn(
          "md:hidden transition-all duration-300 overflow-hidden",
          isSearchOpen ? "max-h-16 opacity-100 mt-2" : "max-h-0 opacity-0"
        )}
      >
        <div className="container px-4 mx-auto">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                <Search size={18} />
              </div>
              <Input 
                placeholder="Search..." 
                className="pl-10 pr-4 w-full rounded-full bg-gray-100 border-0"
                autoFocus={isSearchOpen}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
          </form>
        </div>
      </div>
    </header>
  );
};

export default NavBar;
