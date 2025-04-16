
import { useState, useRef } from "react";
import { Image, Link2, Smile, X } from "lucide-react";
import BottomSheet from "./BottomSheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

interface CreatePostSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreatePostSheet: React.FC<CreatePostSheetProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [content, setContent] = useState("");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imageURLs, setImageURLs] = useState<string[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      
      // Limit to 4 images max
      if (selectedImages.length + newFiles.length > 4) {
        toast({
          title: "Too many images",
          description: "You can only attach up to 4 images per post",
          variant: "destructive",
        });
        return;
      }
      
      // Create object URLs for previews
      const newURLs = newFiles.map(file => URL.createObjectURL(file));
      
      setSelectedImages(prev => [...prev, ...newFiles]);
      setImageURLs(prev => [...prev, ...newURLs]);
    }
  };
  
  const removeImage = (index: number) => {
    URL.revokeObjectURL(imageURLs[index]); // Clean up object URL
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImageURLs(prev => prev.filter((_, i) => i !== index));
  };
  
  const handlePost = () => {
    if (!content.trim() && selectedImages.length === 0) {
      toast({
        title: "Cannot create empty post",
        description: "Please add some text or an image to your post",
        variant: "destructive",
      });
      return;
    }
    
    setIsPosting(true);
    
    // Simulate API call with timeout
    setTimeout(() => {
      setIsPosting(false);
      toast({
        title: "Post created",
        description: "Your post has been published successfully",
      });
      
      // Clean up and reset
      imageURLs.forEach(url => URL.revokeObjectURL(url));
      setContent("");
      setSelectedImages([]);
      setImageURLs([]);
      
      onSuccess();
    }, 1500);
  };
  
  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Create Post"
    >
      <div className="space-y-4">
        <div className="flex space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src="https://images.unsplash.com/photo-1649972904349-6e44c42644a7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=100" />
            <AvatarFallback className="bg-primary text-white">JD</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-semibold">Jane Doe</p>
            <p className="text-sm text-gray-500">@janedoe</p>
          </div>
        </div>
        
        <Textarea
          placeholder="What's on your mind?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full min-h-[120px] text-lg resize-none rounded-xl border-gray-200 focus-visible:ring-primary"
        />
        
        {/* Image Previews */}
        {imageURLs.length > 0 && (
          <div className={`grid ${imageURLs.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-2 mt-3`}>
            {imageURLs.map((url, index) => (
              <div key={index} className="relative rounded-xl overflow-hidden aspect-square">
                <img 
                  src={url} 
                  alt={`Attachment ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <div className="flex space-x-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-gray-500 hover:text-primary hover:bg-primary-100 rounded-full"
              onClick={() => fileInputRef.current?.click()}
            >
              <Image size={20} />
              <input
                type="file"
                accept="image/*"
                multiple
                ref={fileInputRef}
                onChange={handleImageSelect}
                className="hidden"
              />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-gray-500 hover:text-primary hover:bg-primary-100 rounded-full"
            >
              <Smile size={20} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-gray-500 hover:text-primary hover:bg-primary-100 rounded-full"
            >
              <Link2 size={20} />
            </Button>
          </div>
          
          <Button
            type="button"
            className="rounded-full bg-primary hover:bg-primary-600"
            disabled={isPosting || (!content.trim() && selectedImages.length === 0)}
            onClick={handlePost}
          >
            {isPosting ? "Posting..." : "Post"}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
};

export default CreatePostSheet;
