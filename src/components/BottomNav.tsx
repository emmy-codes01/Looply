
import { Home, Compass, Bell, UserRound, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

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
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-40 md:hidden animate-fade-in">
      <div className="flex items-center justify-around h-16">
        <button className="group flex flex-col items-center justify-center w-1/5 py-2">
          <Home className="h-6 w-6 text-primary" />
          <span className="text-xs mt-1 text-primary font-medium">Home</span>
        </button>
        
        <button className="group flex flex-col items-center justify-center w-1/5 py-2">
          <Compass className="h-6 w-6 text-gray-500 group-hover:text-primary transition-colors" />
          <span className="text-xs mt-1 text-gray-500 group-hover:text-primary transition-colors">Explore</span>
        </button>
        
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
            <button className="group flex flex-col items-center justify-center w-1/5 py-2">
              <div className="relative">
                <Bell className="h-6 w-6 text-gray-500 group-hover:text-primary transition-colors" />
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary rounded-full text-white text-xs flex items-center justify-center">
                  3
                </span>
              </div>
              <span className="text-xs mt-1 text-gray-500 group-hover:text-primary transition-colors">Alerts</span>
            </button>
            
            <button className="group flex flex-col items-center justify-center w-1/5 py-2">
              <UserRound className="h-6 w-6 text-gray-500 group-hover:text-primary transition-colors" />
              <span className="text-xs mt-1 text-gray-500 group-hover:text-primary transition-colors">Profile</span>
            </button>
          </>
        ) : (
          <>
            <button 
              className="group flex flex-col items-center justify-center w-1/5 py-2"
              onClick={onAuthClick}
            >
              <Bell className="h-6 w-6 text-gray-500 group-hover:text-primary transition-colors" />
              <span className="text-xs mt-1 text-gray-500 group-hover:text-primary transition-colors">Alerts</span>
            </button>
            
            <button 
              className="group flex flex-col items-center justify-center w-1/5 py-2"
              onClick={onAuthClick}
            >
              <UserRound className="h-6 w-6 text-gray-500 group-hover:text-primary transition-colors" />
              <span className="text-xs mt-1 text-gray-500 group-hover:text-primary transition-colors">Profile</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default BottomNav;
