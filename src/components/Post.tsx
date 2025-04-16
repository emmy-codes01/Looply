
import { useState } from "react";
import { Heart, MessageCircle, Share, Bookmark, MoreHorizontal, Link2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

interface PostProps {
  id: string;
  user_id: string;
  content: string;
  images?: { id: string; image_url: string }[];
  created_at: string;
  updated_at: string;
  profile?: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  likes_count: number;
  comments_count: number;
  is_liked?: boolean;
  is_bookmarked?: boolean;
  onPostUpdate?: () => void;
}

const Post: React.FC<PostProps> = ({
  id,
  user_id,
  content,
  images,
  created_at,
  updated_at,
  profile,
  likes_count: initialLikesCount = 0,
  comments_count: initialCommentsCount = 0,
  is_liked: initialIsLiked = false,
  is_bookmarked: initialIsBookmarked = false,
  onPostUpdate,
}) => {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [isBookmarked, setIsBookmarked] = useState(initialIsBookmarked);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const toggleLike = async () => {
    if (!user) {
      toast.error("Please sign in to like posts");
      return;
    }
    
    // Optimistic update
    setIsLiked(prev => !prev);
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
    
    try {
      if (isLiked) {
        // Unlike
        await supabase
          .from('likes')
          .delete()
          .eq('post_id', id)
          .eq('user_id', user.id);
      } else {
        // Like
        await supabase
          .from('likes')
          .insert({
            post_id: id,
            user_id: user.id
          });
      }
      
      if (onPostUpdate) {
        onPostUpdate();
      }
    } catch (error) {
      // Revert on failure
      console.error("Error toggling like:", error);
      setIsLiked(prev => !prev);
      setLikesCount(prev => isLiked ? prev + 1 : prev - 1);
      toast.error("Failed to update like");
    }
  };
  
  const toggleBookmark = async () => {
    if (!user) {
      toast.error("Please sign in to bookmark posts");
      return;
    }
    
    // Optimistic update
    setIsBookmarked(prev => !prev);
    
    try {
      if (isBookmarked) {
        // Remove bookmark
        await supabase
          .from('bookmarks')
          .delete()
          .eq('post_id', id)
          .eq('user_id', user.id);
      } else {
        // Add bookmark
        await supabase
          .from('bookmarks')
          .insert({
            post_id: id,
            user_id: user.id
          });
      }
      
      if (onPostUpdate) {
        onPostUpdate();
      }
    } catch (error) {
      // Revert on failure
      console.error("Error toggling bookmark:", error);
      setIsBookmarked(prev => !prev);
      toast.error("Failed to update bookmark");
    }
  };
  
  const deletePost = async () => {
    if (!user || user.id !== user_id) return;
    
    try {
      setIsDeleting(true);
      
      // Delete the post (cascade will handle related records)
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success("Post deleted successfully");
      
      if (onPostUpdate) {
        onPostUpdate();
      }
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Failed to delete post");
    } finally {
      setIsDeleting(false);
    }
  };
  
  const sharePost = async () => {
    const postUrl = `${window.location.origin}/post/${id}`;
    
    // Check if the Web Share API is supported
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Check out this post on Corner Chat',
          text: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
          url: postUrl,
        });
        return;
      } catch (error) {
        console.log('Error sharing:', error);
      }
    }
    
    // Fallback to clipboard copy
    try {
      await navigator.clipboard.writeText(postUrl);
      toast.success("Link copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy link:", error);
      toast.error("Failed to copy link");
    }
  };
  
  const formatPostDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };
  
  return (
    <div className="border-b border-gray-100 p-4">
      <div className="flex justify-between items-start">
        <div className="flex space-x-3">
          <Link to={`/profile/${profile?.id || user_id}`}>
            <Avatar className="h-10 w-10">
              <AvatarImage src={profile?.avatar_url || ''} />
              <AvatarFallback className="bg-primary text-white">
                {profile?.display_name?.substring(0, 2).toUpperCase() || 
                 profile?.username?.substring(0, 2).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div>
            <div className="flex items-center">
              <Link 
                to={`/profile/${profile?.id || user_id}`}
                className="font-semibold hover:underline"
              >
                {profile?.display_name || 'User'}
              </Link>
              <Link 
                to={`/profile/${profile?.id || user_id}`}
                className="text-sm text-gray-500 ml-2 hover:underline"
              >
                @{profile?.username || 'user'}
              </Link>
              <span className="mx-1 text-gray-500">·</span>
              <span className="text-sm text-gray-500">
                {formatPostDate(created_at)}
              </span>
            </div>
            <p className="mt-1 text-gray-800">{content}</p>
          </div>
        </div>
        
        {user && user.id === user_id && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full text-gray-500 hover:text-primary hover:bg-primary-100"
              >
                <MoreHorizontal size={18} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={sharePost}
                className="cursor-pointer"
              >
                <Link2 className="h-4 w-4 mr-2" />
                Share post
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={deletePost}
                disabled={isDeleting}
                className="cursor-pointer text-red-500 focus:text-red-500"
              >
                {isDeleting ? "Deleting..." : "Delete post"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      
      {/* Image Grid */}
      {images && images.length > 0 && (
        <div className={cn(
          "mt-3 rounded-xl overflow-hidden",
          images.length === 1 ? "aspect-video" : 
          images.length === 2 ? "grid grid-cols-2 gap-1 max-h-80" :
          images.length === 3 ? "grid grid-cols-2 gap-1 max-h-80" :
          "grid grid-cols-2 grid-rows-2 gap-1 max-h-96"
        )}>
          {images.map((image, index) => (
            <div 
              key={index} 
              className={cn(
                "overflow-hidden",
                images.length === 3 && index === 0 ? "row-span-2" : ""
              )}
            >
              <img 
                src={image.image_url} 
                alt={`Post by ${profile?.username || 'user'}`} 
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="flex justify-between mt-3">
        <Link to={`/post/${id}`} className="inline-block">
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-primary hover:bg-primary-100 rounded-full px-3"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            <span>{initialCommentsCount}</span>
          </Button>
        </Link>
        
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-full px-3",
            isLiked && "text-red-500"
          )}
          onClick={toggleLike}
        >
          <Heart className={cn("h-4 w-4 mr-2", isLiked && "fill-red-500")} />
          <span>{likesCount}</span>
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-500 hover:text-primary hover:bg-primary-100 rounded-full px-3"
          onClick={sharePost}
        >
          <Share className="h-4 w-4 mr-2" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "text-gray-500 hover:text-primary hover:bg-primary-100 rounded-full px-3",
            isBookmarked && "text-primary"
          )}
          onClick={toggleBookmark}
        >
          <Bookmark className={cn("h-4 w-4 mr-2", isBookmarked && "fill-primary")} />
        </Button>
      </div>
    </div>
  );
};

export default Post;
