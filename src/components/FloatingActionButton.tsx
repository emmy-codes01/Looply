
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FloatingActionButtonProps {
  onClick: () => void;
  className?: string;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onClick,
  className,
}) => {
  return (
    <Button
      className={cn(
        "fixed right-5 bottom-20 rounded-full w-14 h-14 bg-primary shadow-lg hover:bg-primary-600 transition-all animate-fade-in",
        className
      )}
      onClick={onClick}
      aria-label="Create new post"
    >
      <Plus className="h-6 w-6" />
    </Button>
  );
};

export default FloatingActionButton;
