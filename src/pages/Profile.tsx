import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  MessageCircle, Calendar, Link as LinkIcon, MapPin, Pencil, 
  ArrowLeft, Loader, LogOut, UserRound, Heart, FileText, Image 
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NavBar from "@/components/NavBar";
import BottomNav from "@/components/BottomNav";
import Post from "@/components/Post";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Profile as ProfileType, Post as PostType } from "@/types/supabase";
import { format } from "date-fns";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const profileFormSchema = z.object({
  displayName: z.string().min(1, "Display name is required").max(50),
  username: z.string().min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  bio: z.string().max(160, "Bio must be at most 160 characters").optional(),
  location: z.string().max(30, "Location must be at most 30 characters").optional(),
  website: z.string().max(100, "Website URL must be at most 100 characters").optional(),
});

const Profile = () => {
  const { profileId } = useParams<{ profileId?: string }>();
  const { user, profile: currentUserProfile, signOut, updateProfile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const targetProfileId = profileId || user?.id;
  
  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: "",
      username: "",
      bio: "",
      location: "",
      website: "",
    },
  });
  
  const fetchProfile = async () => {
    if (!targetProfileId) return null;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', targetProfileId)
      .single();
    
    if (error) throw error;
    
    return data as ProfileType;
  };
  
  const fetchProfilePosts = async () => {
    if (!targetProfileId) return [];
    
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profile:profiles(*),
        images:post_images(*)
      `)
      .eq('user_id', targetProfileId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
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
  
  const { 
    data: profileData, 
    isLoading: isProfileLoading,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ['profile', targetProfileId],
    queryFn: fetchProfile,
    enabled: !!targetProfileId,
    staleTime: 1000 * 60 * 5,
  });
  
  const { 
    data: postsData, 
    isLoading: isPostsLoading,
    refetch: refetchPosts,
  } = useQuery({
    queryKey: ['profile-posts', targetProfileId],
    queryFn: fetchProfilePosts,
    enabled: !!targetProfileId,
    staleTime: 1000 * 60 * 5,
  });
  
  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!user || !targetProfileId || user.id === targetProfileId) return;
      
      const { data, error } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', user.id)
        .eq('following_id', targetProfileId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error("Error checking follow status:", error);
      }
      
      setIsFollowing(!!data);
    };
    
    const getFollowCounts = async () => {
      if (!targetProfileId) return;
      
      const { count: followers, error: followerError } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', targetProfileId);
      
      if (followerError) {
        console.error("Error getting follower count:", followerError);
      } else {
        setFollowerCount(followers || 0);
      }
      
      const { count: following, error: followingError } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', targetProfileId);
      
      if (followingError) {
        console.error("Error getting following count:", followingError);
      } else {
        setFollowingCount(following || 0);
      }
    };
    
    checkFollowStatus();
    getFollowCounts();
  }, [targetProfileId, user]);
  
  useEffect(() => {
    if (profileData && user && targetProfileId === user.id) {
      form.reset({
        displayName: profileData.display_name || "",
        username: profileData.username || "",
        bio: profileData.bio || "",
        location: "",
        website: "",
      });
    }
  }, [profileData, form, user, targetProfileId]);
  
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image is too large. Maximum size is 5MB.");
        return;
      }
      
      if (!file.type.match(/image\/(jpeg|png|gif|webp)/)) {
        toast.error("Invalid file type. Please use JPEG, PNG, GIF, or WebP.");
        return;
      }
      
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };
  
  const uploadAvatar = async () => {
    if (!user || !avatarFile) return null;
    
    try {
      setIsUploading(true);
      
      const fileExt = avatarFile.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile);
      
      if (uploadError) throw uploadError;
      
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      return data.publicUrl;
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Failed to upload avatar");
      return null;
    } finally {
      setIsUploading(false);
    }
  };
  
  const onSubmit = async (data: z.infer<typeof profileFormSchema>) => {
    if (!user) return;
    
    try {
      let avatarUrl = null;
      if (avatarFile) {
        avatarUrl = await uploadAvatar();
        if (!avatarUrl) return;
      }
      
      await updateProfile({
        display_name: data.displayName,
        username: data.username,
        bio: data.bio || null,
        ...(avatarUrl && { avatar_url: avatarUrl }),
      });
      
      setIsEditProfileOpen(false);
      setAvatarFile(null);
      setAvatarPreview(null);
      
      refetchProfile();
      
      toast.success("Profile updated successfully");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      
      if (error.code === "23505") {
        toast.error("Username is already taken. Please choose another one.");
        form.setError("username", { 
          type: "manual", 
          message: "Username is already taken"
        });
      } else {
        toast.error("Failed to update profile");
      }
    }
  };
  
  const handleFollowToggle = async () => {
    if (!user || !targetProfileId || user.id === targetProfileId) return;
    
    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', targetProfileId);
        
        setIsFollowing(false);
        setFollowerCount(prev => Math.max(0, prev - 1));
      } else {
        await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: targetProfileId
          });
        
        setIsFollowing(true);
        setFollowerCount(prev => prev + 1);
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
      toast.error(isFollowing ? "Failed to unfollow" : "Failed to follow");
    }
  };
  
  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };
  
  const startConversation = async () => {
    if (!user || !targetProfileId || user.id === targetProfileId) return;
    
    try {
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('*')
        .or(
          `and(user1_id.eq.${user.id},user2_id.eq.${targetProfileId}),` + 
          `and(user1_id.eq.${targetProfileId},user2_id.eq.${user.id})`
        )
        .single();
      
      if (existingConv) {
        navigate(`/chat/${existingConv.id}`);
        return;
      }
      
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user1_id: user.id,
          user2_id: targetProfileId,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      navigate(`/chat/${data.id}`);
    } catch (error) {
      console.error("Error starting conversation:", error);
      toast.error("Failed to start conversation");
    }
  };
  
  if (isProfileLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }
  
  if (!profileData) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
        <UserRound className="h-16 w-16 text-gray-300 mb-4" />
        <h3 className="text-xl font-semibold mb-2">Profile not found</h3>
        <p className="text-gray-500 mb-4">
          The user you're looking for doesn't exist or has been removed
        </p>
        <Button 
          variant="outline" 
          onClick={() => navigate(-1)}
          className="rounded-full"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go back
        </Button>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar 
        isAuthenticated={!!user}
        onAuthClick={() => {}}
        onMenuToggle={() => {}}
      />
      
      <main className="max-w-2xl mx-auto pt-16 pb-24 bg-white min-h-screen">
        <div className="relative">
          <div className="h-32 bg-gradient-to-r from-primary/20 to-primary/40" />
          <div className="absolute left-4 -bottom-16">
            <Avatar className="h-32 w-32 border-4 border-white">
              <AvatarImage src={profileData.avatar_url || ''} />
              <AvatarFallback className="bg-primary text-white text-2xl">
                {profileData.display_name?.substring(0, 2).toUpperCase() || 
                 profileData.username?.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="flex justify-end p-4">
            {user && targetProfileId === user.id ? (
              <Button 
                variant="outline" 
                className="rounded-full"
                onClick={() => setIsEditProfileOpen(true)}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit profile
              </Button>
            ) : user && targetProfileId !== user.id ? (
              <div className="space-x-2">
                <Button 
                  variant="outline" 
                  className="rounded-full"
                  onClick={startConversation}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Message
                </Button>
                
                <Button 
                  variant={isFollowing ? "outline" : "default"}
                  className="rounded-full"
                  onClick={handleFollowToggle}
                >
                  {isFollowing ? "Following" : "Follow"}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
        
        <div className="mt-16 px-4">
          <h1 className="text-xl font-bold">{profileData.display_name}</h1>
          <p className="text-gray-500">@{profileData.username}</p>
          
          {profileData.bio && (
            <p className="mt-3 text-gray-800">{profileData.bio}</p>
          )}
          
          <div className="flex flex-wrap gap-y-2 mt-3">
            {profileData.created_at && (
              <div className="flex items-center text-sm text-gray-500 mr-4">
                <Calendar className="h-4 w-4 mr-1" />
                Joined {format(new Date(profileData.created_at), 'MMMM yyyy')}
              </div>
            )}
          </div>
          
          <div className="flex mt-3">
            <div className="mr-4">
              <span className="font-semibold">{followingCount}</span>
              <span className="text-gray-500 ml-1">Following</span>
            </div>
            <div>
              <span className="font-semibold">{followerCount}</span>
              <span className="text-gray-500 ml-1">Followers</span>
            </div>
          </div>
        </div>
        
        <div className="mt-4">
          <Tabs defaultValue="posts">
            <TabsList className="w-full rounded-none border-b bg-transparent justify-start px-4">
              <TabsTrigger 
                value="posts"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none"
              >
                Posts
              </TabsTrigger>
              <TabsTrigger 
                value="media"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none"
              >
                Media
              </TabsTrigger>
              <TabsTrigger 
                value="likes"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none"
              >
                Likes
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="posts" className="mt-0">
              {isPostsLoading ? (
                <div className="flex flex-col items-center justify-center h-64">
                  <Loader className="h-8 w-8 text-primary animate-spin mb-4" />
                  <p className="text-gray-500">Loading posts...</p>
                </div>
              ) : postsData && postsData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 p-4 text-center">
                  <div className="h-16 w-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                    <FileText className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No posts yet</h3>
                  <p className="text-gray-500">
                    {user && targetProfileId === user.id 
                      ? "When you create posts, they'll appear here" 
                      : "This user hasn't posted anything yet"}
                  </p>
                </div>
              ) : (
                <div>
                  {postsData?.map((post) => (
                    <Post 
                      key={post.id} 
                      {...post}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="media" className="mt-0">
              <div className="flex flex-col items-center justify-center h-64 p-4 text-center">
                <div className="h-16 w-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                  <Image className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No media yet</h3>
                <p className="text-gray-500">
                  Posts with images or videos will appear here
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="likes" className="mt-0">
              <div className="flex flex-col items-center justify-center h-64 p-4 text-center">
                <div className="h-16 w-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                  <Heart className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No likes yet</h3>
                <p className="text-gray-500">
                  Posts liked by this user will appear here
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <BottomNav 
        isAuthenticated={!!user}
        onCreatePost={() => {}}
        onAuthClick={() => {}}
      />
      
      <Sheet open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Edit Profile</SheetTitle>
            <SheetDescription>
              Update your profile information
            </SheetDescription>
          </SheetHeader>
          
          <div className="py-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="flex flex-col items-center mb-4">
                  <Avatar className="h-24 w-24 mb-2">
                    <AvatarImage 
                      src={avatarPreview || profileData.avatar_url || ''} 
                    />
                    <AvatarFallback className="bg-primary text-white text-2xl">
                      {profileData.display_name?.substring(0, 2).toUpperCase() || 
                       profileData.username?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <label 
                    htmlFor="avatar-upload" 
                    className="text-sm text-primary cursor-pointer hover:underline"
                  >
                    Change profile picture
                  </label>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Tell us about yourself"
                          className="resize-none"
                          maxLength={160}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-between pt-4">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={handleSignOut}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out
                  </Button>
                  
                  <Button 
                    type="submit"
                    disabled={isUploading || form.formState.isSubmitting}
                  >
                    {isUploading || form.formState.isSubmitting
                      ? "Saving..."
                      : "Save changes"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Profile;
