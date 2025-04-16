
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search as SearchIcon, Users, FileText, Loader } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Post from "@/components/Post";
import NavBar from "@/components/NavBar";
import BottomNav from "@/components/BottomNav";
import { Profile, Post as PostType } from "@/types/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const [searchInput, setSearchInput] = useState(query);
  const { user, profile } = useAuth();
  
  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSearchParams({ q: searchInput });
    }
  };

  const searchPosts = async () => {
    if (!query) return { posts: [], count: 0 };
    
    const { data, error, count } = await supabase
      .from('posts')
      .select(`
        *,
        profile:profiles(*),
        images:post_images(*)
      `, { count: 'exact' })
      .ilike('content', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (error) throw error;
    
    // Get likes count for each post
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
    
    return { posts: postsWithCounts, count: count || 0 };
  };

  const searchUsers = async () => {
    if (!query) return { users: [], count: 0 };
    
    const { data, error, count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .limit(20);
    
    if (error) throw error;
    
    // Get follower info for each user
    const usersWithFollowInfo = await Promise.all(
      data.map(async (profile) => {
        const { count: followerCount } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', profile.id);
        
        let isFollowing = false;
        
        if (user) {
          const { data: followData } = await supabase
            .from('follows')
            .select('*')
            .eq('follower_id', user.id)
            .eq('following_id', profile.id)
            .single();
          
          isFollowing = !!followData;
        }
        
        return { 
          ...profile, 
          follower_count: followerCount || 0,
          is_following: isFollowing 
        };
      })
    );
    
    return { users: usersWithFollowInfo, count: count || 0 };
  };

  const { 
    data: postsData, 
    isLoading: postsLoading 
  } = useQuery({
    queryKey: ['search', 'posts', query],
    queryFn: searchPosts,
    enabled: !!query,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const { 
    data: usersData, 
    isLoading: usersLoading 
  } = useQuery({
    queryKey: ['search', 'users', query],
    queryFn: searchUsers,
    enabled: !!query,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const toggleFollow = async (userId: string, currentlyFollowing: boolean) => {
    if (!user) return;
    
    try {
      if (currentlyFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userId);
      } else {
        await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: userId
          });
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar 
        isAuthenticated={!!user}
        onAuthClick={() => {}}
        onMenuToggle={() => {}}
      />
      
      <main className="max-w-2xl mx-auto pt-16 pb-24 bg-white min-h-screen">
        <div className="sticky top-16 z-20 bg-white border-b p-4">
          <form onSubmit={handleSearch} className="mb-4">
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                <SearchIcon size={18} />
              </div>
              <Input 
                placeholder="Search posts and people..." 
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10 pr-4 rounded-full"
                autoFocus
              />
            </div>
          </form>
          
          <Tabs defaultValue="posts" className="w-full">
            <TabsList className="w-full bg-gray-100 p-1 rounded-full">
              <TabsTrigger
                value="posts"
                className="rounded-full flex-1 data-[state=active]:bg-white data-[state=active]:text-primary"
              >
                <FileText className="h-4 w-4 mr-2" />
                Posts
              </TabsTrigger>
              <TabsTrigger
                value="people"
                className="rounded-full flex-1 data-[state=active]:bg-white data-[state=active]:text-primary"
              >
                <Users className="h-4 w-4 mr-2" />
                People
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        <TabsContent value="posts" className="mt-0">
          {!query && (
            <div className="flex flex-col items-center justify-center h-64 p-4 text-center">
              <SearchIcon className="h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Search for posts</h3>
              <p className="text-gray-500">
                Enter keywords to find relevant posts
              </p>
            </div>
          )}
          
          {query && postsLoading && (
            <div className="flex flex-col items-center justify-center h-64">
              <Loader className="h-8 w-8 text-primary animate-spin mb-4" />
              <p className="text-gray-500">Searching posts...</p>
            </div>
          )}
          
          {query && !postsLoading && postsData?.posts.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 p-4 text-center">
              <FileText className="h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No posts found</h3>
              <p className="text-gray-500">
                We couldn't find any posts matching "{query}"
              </p>
            </div>
          )}
          
          {query && !postsLoading && postsData?.posts.length > 0 && (
            <div>
              <div className="p-4 border-b">
                <p className="text-sm text-gray-500">
                  Found {postsData.count} posts matching "{query}"
                </p>
              </div>
              
              {postsData.posts.map((post: PostType) => (
                <Post key={post.id} {...post} />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="people" className="mt-0">
          {!query && (
            <div className="flex flex-col items-center justify-center h-64 p-4 text-center">
              <Users className="h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Search for people</h3>
              <p className="text-gray-500">
                Enter a name or username to find people
              </p>
            </div>
          )}
          
          {query && usersLoading && (
            <div className="flex flex-col items-center justify-center h-64">
              <Loader className="h-8 w-8 text-primary animate-spin mb-4" />
              <p className="text-gray-500">Searching people...</p>
            </div>
          )}
          
          {query && !usersLoading && usersData?.users.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 p-4 text-center">
              <Users className="h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No people found</h3>
              <p className="text-gray-500">
                We couldn't find anyone matching "{query}"
              </p>
            </div>
          )}
          
          {query && !usersLoading && usersData?.users.length > 0 && (
            <div>
              <div className="p-4 border-b">
                <p className="text-sm text-gray-500">
                  Found {usersData.count} people matching "{query}"
                </p>
              </div>
              
              {usersData.users.map((userProfile: any) => (
                <div key={userProfile.id} className="p-4 border-b flex items-center justify-between">
                  <div className="flex items-center">
                    <Avatar className="h-12 w-12 mr-3">
                      <AvatarImage src={userProfile.avatar_url || ''} />
                      <AvatarFallback className="bg-primary text-white">
                        {userProfile.display_name?.substring(0, 2).toUpperCase() || 
                         userProfile.username?.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <div className="font-semibold">{userProfile.display_name}</div>
                      <div className="text-sm text-gray-500">@{userProfile.username}</div>
                      
                      {userProfile.bio && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-1">{userProfile.bio}</p>
                      )}
                      
                      <div className="text-xs text-gray-500 mt-1">
                        {userProfile.follower_count} followers
                      </div>
                    </div>
                  </div>
                  
                  {user && userProfile.id !== user.id && (
                    <Button
                      variant={userProfile.is_following ? "outline" : "default"}
                      size="sm"
                      className="rounded-full"
                      onClick={() => toggleFollow(userProfile.id, userProfile.is_following)}
                    >
                      {userProfile.is_following ? "Following" : "Follow"}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </main>
      
      <BottomNav 
        isAuthenticated={!!user}
        onCreatePost={() => {}}
        onAuthClick={() => {}}
      />
    </div>
  );
};

export default Search;
