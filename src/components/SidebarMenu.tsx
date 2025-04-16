
import React from "react";
import { 
  Home, 
  UserRound, 
  Bell, 
  Bookmark, 
  Settings, 
  LogOut, 
  LogIn, 
  Heart, 
  MessageCircle, 
  Compass, 
  Bookmark as BookmarkIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface SidebarMenuProps {
  isOpen: boolean;
  isAuthenticated: boolean;
  onClose: () => void;
  onAuthClick: () => void;
}

const SidebarMenu: React.FC<SidebarMenuProps> = ({
  isOpen,
  isAuthenticated,
  onClose,
  onAuthClick,
}) => {
  // If the menu is not open, don't render anything
  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 md:hidden"
        onClick={onClose}
      />
      <div
        className={cn(
          "fixed top-0 left-0 h-full w-[280px] bg-white z-50 transition-all duration-300 shadow-xl",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header with logo and close button */}
          <div className="flex justify-between items-center p-5 border-b">
            <h2 className="text-xl font-bold text-primary">Corner Chat</h2>
          </div>

          {/* User Profile or Login Button */}
          <div className="p-5 border-b">
            {isAuthenticated ? (
              <div className="flex items-center space-x-3">
                <Avatar className="h-12 w-12 border border-gray-200">
                  <AvatarImage src="https://images.unsplash.com/photo-1649972904349-6e44c42644a7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=100" />
                  <AvatarFallback className="bg-primary text-white">JD</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">Jane Doe</h3>
                  <p className="text-sm text-gray-500">@janedoe</p>
                </div>
              </div>
            ) : (
              <button
                className="flex items-center justify-center w-full py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary-600 transition-colors"
                onClick={() => {
                  onAuthClick();
                  onClose();
                }}
              >
                <LogIn className="h-4 w-4 mr-2" />
                Sign In
              </button>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto p-2">
            <ul className="space-y-1">
              <li>
                <a
                  href="#"
                  className="flex items-center py-2.5 px-4 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <Home className="h-5 w-5 mr-3 text-gray-700" />
                  <span>Home</span>
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="flex items-center py-2.5 px-4 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <Compass className="h-5 w-5 mr-3 text-gray-700" />
                  <span>Explore</span>
                </a>
              </li>
              {isAuthenticated && (
                <>
                  <li>
                    <a
                      href="#"
                      className="flex items-center py-2.5 px-4 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <Bell className="h-5 w-5 mr-3 text-gray-700" />
                      <span>Notifications</span>
                      <span className="ml-auto h-5 w-5 bg-primary rounded-full text-white text-xs flex items-center justify-center">
                        3
                      </span>
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="flex items-center py-2.5 px-4 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <MessageCircle className="h-5 w-5 mr-3 text-gray-700" />
                      <span>Messages</span>
                      <span className="ml-auto h-5 w-5 bg-primary rounded-full text-white text-xs flex items-center justify-center">
                        5
                      </span>
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="flex items-center py-2.5 px-4 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <BookmarkIcon className="h-5 w-5 mr-3 text-gray-700" />
                      <span>Bookmarks</span>
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="flex items-center py-2.5 px-4 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <Heart className="h-5 w-5 mr-3 text-gray-700" />
                      <span>Liked Posts</span>
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="flex items-center py-2.5 px-4 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <UserRound className="h-5 w-5 mr-3 text-gray-700" />
                      <span>Profile</span>
                    </a>
                  </li>
                </>
              )}
            </ul>

            <div className="border-t my-3"></div>

            <ul className="space-y-1">
              <li>
                <a
                  href="#"
                  className="flex items-center py-2.5 px-4 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <Settings className="h-5 w-5 mr-3 text-gray-700" />
                  <span>Settings</span>
                </a>
              </li>
              {isAuthenticated && (
                <li>
                  <a
                    href="#"
                    className="flex items-center py-2.5 px-4 rounded-xl text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="h-5 w-5 mr-3" />
                    <span>Logout</span>
                  </a>
                </li>
              )}
            </ul>
          </nav>

          {/* Footer */}
          <div className="p-5 text-xs text-gray-500 border-t">
            <div className="flex space-x-4 mb-2">
              <a href="#" className="hover:text-primary transition-colors">
                Terms
              </a>
              <a href="#" className="hover:text-primary transition-colors">
                Privacy
              </a>
              <a href="#" className="hover:text-primary transition-colors">
                Help
              </a>
            </div>
            <p>© 2025 Corner Chat Inc.</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default SidebarMenu;
