
import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader, MessageCircle, Send } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import NavBar from "@/components/NavBar";
import BottomNav from "@/components/BottomNav";
import Post from "@/components/Post";
import { Post as PostType, Comment } from "@/types/supabase";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const PostDetail = () => {
  const { postId } = useParams<{ postId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentsSubscription, setCommentsSubscription] = useState<any>(null);
  
  // Fetch post details
  const fetchPost = async () => {
    if (!postId) return null;
    
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profile:profiles(*),
        images:post_images(*)
      `)
      .eq('id', postId)
      .single();
    
    if (error) throw error;
    
    // Get likes and comments count
    const { count: likesCount } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);
    
    const { count: commentsCount } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);
    
    let isLiked = false;
    let isBookmarked = false;
    
    if (user) {
      const { data: likeData } = await supabase
        .from('likes')
        .select('*')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .single();
      
      const { data: bookmarkData } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .single();
      
      isLiked = !!likeData;
      isBookmarked = !!bookmarkData;
    }
    
    return { 
      ...data, 
      likes_count: likesCount || 0,
      comments_count: commentsCount || 0,
      is_liked: isLiked,
      is_bookmarked: isBookmarked
    };
  };
  
  // Fetch comments for this post
  const fetchComments = async () => {
    if (!postId) return [];
    
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        profile:profiles(*)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    return data as Comment[];
  };
  
  // Query for post details
  const { 
    data: post, 
    isLoading: isPostLoading,
    isError: isPostError,
    error: postError,
    refetch: refetchPost
  } = useQuery({
    queryKey: ['post', postId],
    queryFn: fetchPost,
    enabled: !!postId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Query for comments
  const {
    data: comments,
    isLoading: isCommentsLoading,
    refetch: refetchComments
  } = useQuery({
    queryKey: ['comments', postId],
    queryFn: fetchComments,
    enabled: !!postId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Subscribe to new comments
  useEffect(() => {
    if (!postId) return;
    
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${postId}`
        },
        (payload) => {
          // Refresh comments list
          refetchComments();
          // Refresh post to update comment count
          refetchPost();
        }
      )
      .subscribe();
    
    setCommentsSubscription(channel);
    
    return () => {
      if (commentsSubscription) {
        supabase.removeChannel(commentsSubscription);
      }
    };
  }, [postId, refetchComments, refetchPost]);
  
  // Submit a new comment
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !postId || !commentText.trim()) return;
    
    try {
      setIsSubmitting(true);
      
      const { error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content: commentText.trim()
        });
      
      if (error) throw error;
      
      setCommentText("");
      toast.success("Comment added");
      
      // Refetch handled by subscription
    } catch (error) {
      console.error("Error submitting comment:", error);
      toast.error("Failed to add comment");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Error handling
  if (isPostError) {
    console.error("Error loading post:", postError);
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="h-16 w-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
          <MessageCircle className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Post not found</h3>
        <p className="text-gray-500 mb-4">
          The post you're looking for doesn't exist or has been removed
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
        {/* Header */}
        <div className="sticky top-16 z-10 bg-white border-b p-4 flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="mr-2" 
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Post</h1>
        </div>
        
        {/* Post Content */}
        {isPostLoading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Loader className="h-8 w-8 text-primary animate-spin mb-4" />
            <p className="text-gray-500">Loading post...</p>
          </div>
        ) : post ? (
          <>
            <Post {...post} onPostUpdate={refetchPost} />
            
            {/* Comments Section */}
            <div className="px-4 py-2 border-b">
              <h2 className="font-semibold">
                {post.comments_count} {post.comments_count === 1 ? "Comment" : "Comments"}
              </h2>
            </div>
            
            {/* Comment Form */}
            {user ? (
              <div className="p-4 border-b">
                <form onSubmit={handleSubmitComment} className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarImage src={user.user_metadata?.avatar_url || ''} />
                    <AvatarFallback className="bg-primary text-white">
                      {user.email?.substring(0, 2).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <Textarea
                      placeholder="Write a comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="w-full min-h-[80px] resize-none mb-2"
                    />
                    <div className="flex justify-end">
                      <Button 
                        type="submit"
                        className="rounded-full"
                        disabled={!commentText.trim() || isSubmitting}
                      >
                        {isSubmitting ? (
                          <Loader className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
                        )}
                        Comment
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            ) : (
              <div className="p-4 border-b text-center">
                <Link 
                  to="/auth" 
                  className="text-primary hover:underline font-medium"
                >
                  Sign in to comment
                </Link>
              </div>
            )}
            
            {/* Comments List */}
            <div className="divide-y">
              {isCommentsLoading ? (
                <div className="flex flex-col items-center justify-center h-32">
                  <Loader className="h-6 w-6 text-primary animate-spin mb-2" />
                  <p className="text-sm text-gray-500">Loading comments...</p>
                </div>
              ) : comments && comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 p-4 text-center">
                  <p className="text-gray-500">No comments yet</p>
                  <p className="text-sm text-gray-400">Be the first to comment on this post</p>
                </div>
              ) : (
                comments?.map((comment) => (
                  <div key={comment.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <Link to={`/profile/${comment.user_id}`}>
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarImage src={comment.profile?.avatar_url || ''} />
                          <AvatarFallback className="bg-primary text-white">
                            {comment.profile?.display_name?.substring(0, 2).toUpperCase() || 
                             comment.profile?.username?.substring(0, 2).toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                      
                      <div className="flex-1">
                        <div className="bg-gray-100 rounded-lg p-3">
                          <Link 
                            to={`/profile/${comment.user_id}`}
                            className="font-semibold hover:underline"
                          >
                            {comment.profile?.display_name}
                          </Link>
                          <p className="text-gray-600 mt-1">{comment.content}</p>
                        </div>
                        
                        <div className="mt-1 text-xs text-gray-500">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : null}
      </main>
      
      <BottomNav 
        isAuthenticated={!!user}
        onCreatePost={() => {}}
        onAuthClick={() => {}}
      />
    </div>
  );
};

export default PostDetail;
