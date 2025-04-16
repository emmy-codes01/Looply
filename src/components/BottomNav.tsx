
import { Home, Compass, Bell, UserRound, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";

interface BottomNavProps {
  isAuthenticated: boolean;
  onCreatePost: () => void;
  onAuthClick: () => void;
}

const BottomNav: React.FC<BottomNavProps> = ({
  isAuthenticated,
  onCreatePost,
  onAuthClick,
}) => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-40 md:hidden animate-fade-in">
      <div className="flex items-center justify-around h-16">
        <Link 
          to="/"
          className={cn(
            "group flex flex-col items-center justify-center w-1/5 py-2",
            isActive('/') && "text-primary"
          )}
        >
          <Home className={cn(
            "h-6 w-6",
            isActive('/') ? "text-primary" : "text-gray-500 group-hover:text-primary transition-colors"
          )} />
          <span className={cn(
            "text-xs mt-1 font-medium",
            isActive('/') ? "text-primary" : "text-gray-500 group-hover:text-primary transition-colors"
          )}>Home</span>
        </Link>
        
        <Link 
          to="/search"
          className={cn(
            "group flex flex-col items-center justify-center w-1/5 py-2",
            isActive('/search') && "text-primary"
          )}
        >
          <Compass className={cn(
            "h-6 w-6",
            isActive('/search') ? "text-primary" : "text-gray-500 group-hover:text-primary transition-colors"
          )} />
          <span className={cn(
            "text-xs mt-1 font-medium",
            isActive('/search') ? "text-primary" : "text-gray-500 group-hover:text-primary transition-colors"
          )}>Explore</span>
        </Link>
        
        <button 
          className={cn(
            "flex items-center justify-center w-1/5 py-2 -mt-6",
            !isAuthenticated && "pointer-events-none opacity-70"
          )}
          onClick={isAuthenticated ? onCreatePost : onAuthClick}
        >
          <div className="flex items-center justify-center h-14 w-14 bg-primary rounded-full shadow-lg hover:bg-primary-600 transition-colors">
            <Plus className="h-7 w-7 text-white" />
          </div>
        </button>
        
        {isAuthenticated ? (
          <>
            <Link 
              to="/notifications"
              className={cn(
                "group flex flex-col items-center justify-center w-1/5 py-2",
                isActive('/notifications') && "text-primary"
              )}
            >
              <div className="relative">
                <Bell className={cn(
                  "h-6 w-6",
                  isActive('/notifications') ? "text-primary" : "text-gray-500 group-hover:text-primary transition-colors"
                )} />
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary rounded-full text-white text-xs flex items-center justify-center">
                  3
                </span>
              </div>
              <span className={cn(
                "text-xs mt-1 font-medium",
                isActive('/notifications') ? "text-primary" : "text-gray-500 group-hover:text-primary transition-colors"
              )}>Alerts</span>
            </Link>
            
            <Link 
              to="/profile"
              className={cn(
                "group flex flex-col items-center justify-center w-1/5 py-2",
                isActive('/profile') && "text-primary"
              )}
            >
              <UserRound className={cn(
                "h-6 w-6",
                isActive('/profile') ? "text-primary" : "text-gray-500 group-hover:text-primary transition-colors"
              )} />
              <span className={cn(
                "text-xs mt-1 font-medium",
                isActive('/profile') ? "text-primary" : "text-gray-500 group-hover:text-primary transition-colors"
              )}>Profile</span>
            </Link>
          </>
        ) : (
          <>
            <button 
              className="group flex flex-col items-center justify-center w-1/5 py-2"
              onClick={onAuthClick}
            >
              <Bell className="h-6 w-6 text-gray-500 group-hover:text-primary transition-colors" />
              <span className="text-xs mt-1 text-gray-500 group-hover:text-primary transition-colors font-medium">Alerts</span>
            </button>
            
            <button 
              className="group flex flex-col items-center justify-center w-1/5 py-2"
              onClick={onAuthClick}
            >
              <UserRound className="h-6 w-6 text-gray-500 group-hover:text-primary transition-colors" />
              <span className="text-xs mt-1 text-gray-500 group-hover:text-primary transition-colors font-medium">Profile</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default BottomNav;
