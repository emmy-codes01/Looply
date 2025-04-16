
import { useState } from "react";
import { Heart, MessageCircle, Share, Bookmark, MoreHorizontal } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PostProps {
  id: string;
  username: string;
  avatar: string;
  content: string;
  images?: string[];
  createdAt: string;
  likesCount: number;
  commentsCount: number;
  isLiked?: boolean;
  isBookmarked?: boolean;
}

const Post: React.FC<PostProps> = ({
  id,
  username,
  avatar,
  content,
  images,
  createdAt,
  likesCount: initialLikesCount,
  commentsCount,
  isLiked: initialIsLiked = false,
  isBookmarked: initialIsBookmarked = false,
}) => {
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [isBookmarked, setIsBookmarked] = useState(initialIsBookmarked);
  
  const toggleLike = () => {
    setIsLiked(prev => !prev);
    setLikesCount(prev => (isLiked ? prev - 1 : prev + 1));
  };
  
  const toggleBookmark = () => {
    setIsBookmarked(prev => !prev);
  };
  
  return (
    <div className="border-b border-gray-100 p-4">
      <div className="flex justify-between items-start">
        <div className="flex space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={avatar} />
            <AvatarFallback className="bg-primary text-white">
              {username.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center">
              <h3 className="font-semibold">{username}</h3>
              <span className="text-sm text-gray-500 ml-2">@{username.toLowerCase().replace(/\s/g, '')}</span>
              <span className="mx-1 text-gray-500">·</span>
              <span className="text-sm text-gray-500">{createdAt}</span>
            </div>
            <p className="mt-1 text-gray-800">{content}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full text-gray-500 hover:text-primary hover:bg-primary-100"
        >
          <MoreHorizontal size={18} />
        </Button>
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
                src={image} 
                alt={`Post by ${username}`} 
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="flex justify-between mt-3">
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
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          <span>{commentsCount}</span>
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-500 hover:text-primary hover:bg-primary-100 rounded-full px-3"
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
