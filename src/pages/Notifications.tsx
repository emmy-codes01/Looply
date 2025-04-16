
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Heart, MessageCircle, UserPlus, Loader } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import NavBar from "@/components/NavBar";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { Notification } from "@/types/supabase";
import { useAuth } from "@/hooks/use-auth";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const Notifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [notificationsSubscription, setNotificationsSubscription] = useState<any>(null);
  
  const fetchNotifications = async () => {
    if (!user) return [];
    
    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        actor:profiles!actor_id(*),
        post:posts(*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) throw error;
    
    return data as Notification[];
  };
  
  const { 
    data: notifications, 
    isLoading, 
    isError, 
    error 
  } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Subscribe to notifications on component mount
  useEffect(() => {
    if (!user) return;
    
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          // Refresh notifications
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
      )
      .subscribe();
    
    setNotificationsSubscription(channel);
    
    return () => {
      if (notificationsSubscription) {
        supabase.removeChannel(notificationsSubscription);
      }
    };
  }, [user, queryClient]);
  
  // Mark notifications as read
  useEffect(() => {
    const markAsRead = async () => {
      if (!user || !notifications || notifications.length === 0) return;
      
      const unreadNotifications = notifications.filter(notification => !notification.is_read);
      
      if (unreadNotifications.length === 0) return;
      
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', unreadNotifications.map(n => n.id));
      
      if (error) {
        console.error("Error marking notifications as read:", error);
      }
    };
    
    markAsRead();
  }, [notifications, user]);
  
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="h-4 w-4 text-red-500" />;
      case 'comment':
        return <MessageCircle className="h-4 w-4 text-blue-500" />;
      case 'follow':
        return <UserPlus className="h-4 w-4 text-green-500" />;
      case 'message':
        return <MessageCircle className="h-4 w-4 text-purple-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };
  
  const getNotificationContent = (notification: Notification) => {
    const actorName = notification.actor?.display_name || notification.actor?.username || 'Someone';
    
    switch (notification.type) {
      case 'like':
        return `${actorName} liked your post`;
      case 'comment':
        return `${actorName} commented on your post`;
      case 'follow':
        return `${actorName} started following you`;
      case 'message':
        return `${actorName} sent you a message`;
      default:
        return `You have a new notification`;
    }
  };
  
  if (isError) {
    console.error("Error loading notifications:", error);
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar 
        isAuthenticated={!!user}
        onAuthClick={() => {}}
        onMenuToggle={() => {}}
      />
      
      <main className="max-w-2xl mx-auto pt-16 pb-24 bg-white min-h-screen">
        <div className="sticky top-16 z-10 bg-white border-b">
          <div className="p-4">
            <h1 className="text-xl font-bold">Notifications</h1>
          </div>
        </div>
        
        {!user && (
          <div className="flex flex-col items-center justify-center h-64 p-4 text-center">
            <Bell className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Sign in to see notifications</h3>
            <p className="text-gray-500">
              Create an account or sign in to view your notifications
            </p>
          </div>
        )}
        
        {user && isLoading && (
          <div className="flex flex-col items-center justify-center h-64">
            <Loader className="h-8 w-8 text-primary animate-spin mb-4" />
            <p className="text-gray-500">Loading notifications...</p>
          </div>
        )}
        
        {user && !isLoading && notifications?.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 p-4 text-center">
            <Bell className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No notifications yet</h3>
            <p className="text-gray-500">
              When you get notifications, they'll appear here
            </p>
          </div>
        )}
        
        {user && !isLoading && notifications && notifications.length > 0 && (
          <div>
            {notifications.map((notification) => (
              <div 
                key={notification.id}
                className={cn(
                  "p-4 border-b hover:bg-gray-50 transition-colors",
                  !notification.is_read && "bg-blue-50/30"
                )}
              >
                <div className="flex items-start">
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarImage src={notification.actor?.avatar_url || ''} />
                    <AvatarFallback className="bg-primary text-white">
                      {notification.actor?.display_name?.substring(0, 2).toUpperCase() || 
                       notification.actor?.username?.substring(0, 2).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center">
                      <div className="mr-2 flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <p className="text-sm">
                        {getNotificationContent(notification)}
                      </p>
                    </div>
                    
                    {notification.post?.content && (
                      <div className="mt-2 text-sm text-gray-600 p-2 bg-gray-100 rounded-md line-clamp-2">
                        {notification.post.content}
                      </div>
                    )}
                    
                    <div className="mt-1 text-xs text-gray-500">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      
      <BottomNav 
        isAuthenticated={!!user}
        onCreatePost={() => {}}
        onAuthClick={() => {}}
      />
    </div>
  );
};

export default Notifications;
