
import { useState, useEffect } from "react";
import NavBar from "@/components/NavBar";
import SidebarMenu from "@/components/SidebarMenu";
import BottomNav from "@/components/BottomNav";
import FloatingActionButton from "@/components/FloatingActionButton";
import Post from "@/components/Post";
import AuthenticationSheet from "@/components/AuthenticationSheet";
import CreatePostSheet from "@/components/CreatePostSheet";
import NetworkDetector from "@/components/NetworkDetector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

// Sample data for posts
const SAMPLE_POSTS = [
  {
    id: "1",
    username: "Jane Doe",
    avatar: "https://images.unsplash.com/photo-1649972904349-6e44c42644a7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=100",
    content: "Just launched my new website! It's been a long journey but I'm so proud of what we've built. Check it out and let me know what you think! 🚀",
    images: [
      "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=100",
      "https://images.unsplash.com/photo-1721322800607-8c38375eef04?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=100"
    ],
    createdAt: "2h ago",
    likesCount: 24,
    commentsCount: 5,
    isLiked: false,
    isBookmarked: false,
  },
  {
    id: "2",
    username: "John Smith",
    avatar: "",
    content: "Working from the beach today. Sometimes a change of scenery is all you need to boost productivity! #remotework #digitalnomad",
    images: [
      "https://images.unsplash.com/photo-1623123795893-18b96629c472?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=100",
    ],
    createdAt: "5h ago",
    likesCount: 42,
    commentsCount: 8,
    isLiked: true,
    isBookmarked: false,
  },
  {
    id: "3",
    username: "Sarah Parker",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=100",
    content: "Just finished reading this amazing book on AI ethics. It really makes you think about the future of technology and our responsibility as developers. Highly recommend! 📚",
    createdAt: "1d ago",
    likesCount: 18,
    commentsCount: 3,
    isLiked: false,
    isBookmarked: true,
  },
  {
    id: "4",
    username: "Alex Johnson",
    avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=100",
    content: "Just got back from an amazing hike in the mountains. The views were absolutely breathtaking! Nature is the best stress reliever. 🏔️",
    images: [
      "https://images.unsplash.com/photo-1527856263669-12c3a0af2aa6?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=100",
      "https://images.unsplash.com/photo-1461301214746-1e109215d6d3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=100",
      "https://images.unsplash.com/photo-1469474968028-56623f02e42e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=100",
    ],
    createdAt: "2d ago",
    likesCount: 76,
    commentsCount: 12,
    isLiked: false,
    isBookmarked: false,
  },
];

const Index = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthSheetOpen, setIsAuthSheetOpen] = useState(false);
  const [isCreatePostSheetOpen, setIsCreatePostSheetOpen] = useState(false);
  const [posts, setPosts] = useState(SAMPLE_POSTS);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    setIsAuthSheetOpen(false);
    toast({
      title: "Welcome back!",
      description: "You are now logged in to Corner Chat.",
    });
  };
  
  const handleCreatePostSuccess = () => {
    setIsCreatePostSheetOpen(false);
    // Add new post at the top (would normally come from API)
    const newPost = {
      id: `${Date.now()}`,
      username: "Jane Doe",
      avatar: "https://images.unsplash.com/photo-1649972904349-6e44c42644a7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=100",
      content: "Just posted this from the new Corner Chat app! Loving the clean interface and smooth experience.",
      createdAt: "Just now",
      likesCount: 0,
      commentsCount: 0,
      isLiked: false,
      isBookmarked: false,
    };
    
    setPosts([newPost, ...posts]);
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar 
        isAuthenticated={isAuthenticated} 
        onAuthClick={() => setIsAuthSheetOpen(true)}
        onMenuToggle={() => setIsMenuOpen(true)}
      />
      
      <SidebarMenu 
        isOpen={isMenuOpen}
        isAuthenticated={isAuthenticated}
        onClose={() => setIsMenuOpen(false)}
        onAuthClick={() => {
          setIsMenuOpen(false);
          setIsAuthSheetOpen(true);
        }}
      />

      <main className="max-w-2xl mx-auto pt-16 pb-24 bg-white min-h-screen">
        <Tabs defaultValue="for-you" className="w-full">
          <div className="px-4 py-2 sticky top-16 z-10 bg-white border-b">
            <TabsList className="w-full bg-gray-100 p-1 rounded-full">
              <TabsTrigger
                value="for-you"
                className="rounded-full flex-1 data-[state=active]:bg-white data-[state=active]:text-primary"
              >
                For You
              </TabsTrigger>
              <TabsTrigger
                value="following"
                className="rounded-full flex-1 data-[state=active]:bg-white data-[state=active]:text-primary"
              >
                Following
              </TabsTrigger>
              <TabsTrigger
                value="trending"
                className="rounded-full flex-1 data-[state=active]:bg-white data-[state=active]:text-primary"
              >
                Trending
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="for-you" className="mt-0">
            {loading ? (
              <div className="space-y-6 p-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="flex gap-3">
                      <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-1/3 bg-gray-200 rounded"></div>
                        <div className="h-3 w-1/4 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                    <div className="mt-3 space-y-2">
                      <div className="h-4 bg-gray-200 rounded"></div>
                      <div className="h-4 bg-gray-200 rounded"></div>
                    </div>
                    <div className="mt-3 h-40 bg-gray-200 rounded-xl"></div>
                    <div className="mt-3 flex justify-between">
                      <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
                      <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
                      <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
                      <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                {posts.map((post) => (
                  <Post key={post.id} {...post} />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="following" className="mt-0">
            <div className="flex flex-col items-center justify-center h-64 p-4 text-center">
              <h3 className="text-xl font-semibold mb-2">No posts yet</h3>
              <p className="text-gray-500 mb-4">
                {isAuthenticated
                  ? "When you follow people, their posts will appear here."
                  : "Sign in to see posts from people you follow."}
              </p>
              {!isAuthenticated && (
                <button
                  className="px-6 py-2 bg-primary text-white rounded-full font-medium hover:bg-primary-600 transition-colors"
                  onClick={() => setIsAuthSheetOpen(true)}
                >
                  Sign In
                </button>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="trending" className="mt-0">
            <div className="p-4">
              <h3 className="text-xl font-semibold mb-4">Trending Topics</h3>
              <div className="space-y-4">
                {["#ReactJS", "#WebDevelopment", "#TailwindCSS", "#JavaScript", "#TechNews"].map((tag) => (
                  <div key={tag} className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                    <div className="flex justify-between">
                      <div>
                        <p className="font-semibold text-primary">{tag}</p>
                        <p className="text-sm text-gray-500">1,234 posts</p>
                      </div>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                        Trending
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {isAuthenticated && !isMobile && (
        <FloatingActionButton onClick={() => setIsCreatePostSheetOpen(true)} />
      )}
      
      <BottomNav 
        isAuthenticated={isAuthenticated} 
        onCreatePost={() => setIsCreatePostSheetOpen(true)}
        onAuthClick={() => setIsAuthSheetOpen(true)}
      />
      
      <AuthenticationSheet 
        isOpen={isAuthSheetOpen}
        onClose={() => setIsAuthSheetOpen(false)}
        onSuccess={handleAuthSuccess}
      />
      
      <CreatePostSheet 
        isOpen={isCreatePostSheetOpen}
        onClose={() => setIsCreatePostSheetOpen(false)}
        onSuccess={handleCreatePostSuccess}
      />
      
      <NetworkDetector />
    </div>
  );
};

export default Index;
