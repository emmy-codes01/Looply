
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import NavBar from "@/components/NavBar";
import SidebarMenu from "@/components/SidebarMenu";
import BottomNav from "@/components/BottomNav";
import FloatingActionButton from "@/components/FloatingActionButton";
import Post from "@/components/Post";
import CreatePostSheet from "@/components/CreatePostSheet";
import NetworkDetector from "@/components/NetworkDetector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/use-auth";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCreatePostSheetOpen, setIsCreatePostSheetOpen] = useState(false);
  const [postsSubscription, setPostsSubscription] = useState<any>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  
  // Fetch posts
  const fetchPosts = async ({ queryKey }: any) => {
    const [_, tab] = queryKey;
    
    // Determine which posts to fetch based on the tab
    let query = supabase
      .from('posts')
      .select(`
        *,
        profile:profiles(*),
        images:post_images(*)
      `)
      .order('created_at', { ascending: false });
    
    // If "following" tab and user is logged in, only show posts from followed users
    if (tab === 'following' && user) {
      // Get list of users the current user follows
      const { data: followedUsers } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);
      
      if (followedUsers && followedUsers.length > 0) {
        const followedIds = followedUsers.map(item => item.following_id);
        query = query.in('user_id', followedIds);
      } else {
        // No followed users, return empty array
        return [];
      }
    }
    
    const { data, error } = await query.limit(20);
    
    if (error) throw error;
    
    // Get likes and comments count for each post
    const postsWithCounts = await Promise.all(
      data.map(async (post) => {
        const { count: likesCount } = await supabase
          .from('likes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id);
        
        const { count: commentsCount } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id);
        
        let isLiked = false;
        let isBookmarked = false;
        
        if (user) {
          const { data: likeData } = await supabase
            .from('likes')
            .select('*')
            .eq('post_id', post.id)
            .eq('user_id', user.id)
            .single();
          
          const { data: bookmarkData } = await supabase
            .from('bookmarks')
            .select('*')
            .eq('post_id', post.id)
            .eq('user_id', user.id)
            .single();
          
          isLiked = !!likeData;
          isBookmarked = !!bookmarkData;
        }
        
        return { 
          ...post, 
          likes_count: likesCount || 0,
          comments_count: commentsCount || 0,
          is_liked: isLiked,
          is_bookmarked: isBookmarked
        };
      })
    );
    
    return postsWithCounts;
  };
  
  // Fetch trending posts or topics
  const fetchTrending = async () => {
    // In a real app, this would fetch trending posts based on engagement metrics
    // For now, just return a list of trending topics
    return [
    { id: 6, tag: "#CBEX", postsCount: 4213 },
      { id: 1, tag: "#dortmund vs barcelona", postsCount: 1234 },
      { id: 2, tag: "#aston villa vs psg", postsCount: 982 },
      { id: 3, tag: "#championsleague", postsCount: 765 },
      { id: 4, tag: "#T for Thanks", postsCount: 543 },
      { id: 5, tag: "#tinubu", postsCount: 421 },
    ];
  };
  
  // Query for posts
  const { 
    data: forYouPosts, 
    isLoading: isForYouLoading,
    refetch: refetchForYou,
  } = useQuery({
    queryKey: ['posts', 'for-you'],
    queryFn: fetchPosts,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
  
  const { 
    data: followingPosts, 
    isLoading: isFollowingLoading,
    refetch: refetchFollowing,
  } = useQuery({
    queryKey: ['posts', 'following'],
    queryFn: fetchPosts,
    enabled: !!user, // Only run if user is logged in
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
  
  const { 
    data: trendingTopics, 
    isLoading: isTrendingLoading,
  } = useQuery({
    queryKey: ['trending'],
    queryFn: fetchTrending,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
  
  // Subscribe to new posts with Supabase realtime
  useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
        },
        (payload) => {
          // Invalidate queries to refresh the lists
          queryClient.invalidateQueries({ queryKey: ['posts'] });
        }
      )
      .subscribe();
    
    setPostsSubscription(channel);
    
    return () => {
      if (postsSubscription) {
        supabase.removeChannel(postsSubscription);
      }
    };
  }, [queryClient]);
  
  const handleCreatePostSuccess = () => {
    setIsCreatePostSheetOpen(false);
    toast({
      title: "Post created",
      description: "Your post has been published successfully",
    });
    // Refetch posts
    refetchForYou();
    if (user) {
      refetchFollowing();
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar 
        isAuthenticated={!!user} 
        onAuthClick={() => navigate('/auth')}
        onMenuToggle={() => setIsMenuOpen(true)}
      />
      
      <SidebarMenu 
        isOpen={isMenuOpen}
        isAuthenticated={!!user}
        onClose={() => setIsMenuOpen(false)}
        onAuthClick={() => {
          setIsMenuOpen(false);
          navigate('/auth');
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
            {isForYouLoading ? (
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
            ) : forYouPosts && forYouPosts.length > 0 ? (
              <div>
                {forYouPosts.map((post) => (
                  <Post 
                    key={post.id} 
                    {...post} 
                    onPostUpdate={refetchForYou}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 p-4 text-center">
                <h3 className="text-xl font-semibold mb-2">No posts yet</h3>
                <p className="text-gray-500 mb-4">
                  {user 
                    ? "Create your first post to get started!"
                    : "Sign in to create posts and join the conversation."}
                </p>
                {user ? (
                  <Button 
                    className="rounded-full"
                    onClick={() => setIsCreatePostSheetOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create post
                  </Button>
                ) : (
                  <Button
                    className="rounded-full"
                    onClick={() => navigate('/auth')}
                  >
                    Sign in
                  </Button>
                )}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="following" className="mt-0">
            {!user ? (
              <div className="flex flex-col items-center justify-center h-64 p-4 text-center">
                <h3 className="text-xl font-semibold mb-2">Sign in to see posts</h3>
                <p className="text-gray-500 mb-4">
                  Follow people to see their posts here.
                </p>
                <Button
                  className="px-6 py-2 bg-primary text-white rounded-full font-medium hover:bg-primary-600 transition-colors"
                  onClick={() => navigate('/auth')}
                >
                  Sign In
                </Button>
              </div>
            ) : isFollowingLoading ? (
              <div className="flex flex-col items-center justify-center h-64">
                <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-500">Loading posts...</p>
              </div>
            ) : followingPosts && followingPosts.length > 0 ? (
              <div>
                {followingPosts.map((post) => (
                  <Post 
                    key={post.id} 
                    {...post} 
                    onPostUpdate={refetchFollowing}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 p-4 text-center">
                <h3 className="text-xl font-semibold mb-2">No posts yet</h3>
                <p className="text-gray-500 mb-4">
                  When you follow people, their posts will appear here.
                </p>
                <Link to="/search">
                  <Button className="rounded-full">
                    <Users className="h-4 w-4 mr-2" />
                    Find people to follow
                  </Button>
                </Link>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="trending" className="mt-0">
            <div className="p-4">
              <h3 className="text-xl font-semibold mb-4">Trending Topics</h3>
              {isTrendingLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="p-4 bg-gray-50 rounded-xl animate-pulse">
                      <div className="h-5 w-1/3 bg-gray-200 rounded mb-2"></div>
                      <div className="h-4 w-1/4 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {trendingTopics?.map((topic) => (
                    <div key={topic.id} className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                      <div className="flex justify-between">
                        <div>
                          <p className="font-semibold text-primary">{topic.tag}</p>
                          <p className="text-sm text-gray-500">{topic.postsCount} posts</p>
                        </div>
                        <span className="text-xs bg-primary/10 text-primary p-3 py-3 rounded-full font-medium">
                          Trending
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {user && !isMobile && (
        <FloatingActionButton onClick={() => setIsCreatePostSheetOpen(true)} />
      )}
      
      <BottomNav 
        isAuthenticated={!!user} 
        onCreatePost={() => setIsCreatePostSheetOpen(true)}
        onAuthClick={() => navigate('/auth')}
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
