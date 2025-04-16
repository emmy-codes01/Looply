import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, ArrowLeft, Loader, Search, Info, MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Define interfaces to fix type recursion issue
interface MessageType {
  id: string;
  sender_id: string;
  receiver_id: string;
  conversation_id?: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface ProfileType {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio?: string | null;
}

interface ConversationType {
  id: string;
  user1_id: string;
  user2_id: string;
  last_message_at: string;
  created_at: string;
  user1?: ProfileType;
  user2?: ProfileType;
}

const Chat = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [messageInput, setMessageInput] = useState("");
  const [messageSubscription, setMessageSubscription] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const fetchConversations = async () => {
    if (!user) return [];
    
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        user1:profiles!user1_id(*),
        user2:profiles!user2_id(*)
      `)
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false });
    
    if (error) throw error;
    
    return data as ConversationType[];
  };
  
  const fetchMessages = async () => {
    if (!user || !conversationId) return [];
    
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!sender_id(*)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at');
    
    if (error) throw error;
    
    // Mark messages as read
    const unreadMessages = data.filter(msg => 
      msg.receiver_id === user.id && !msg.is_read
    );
    
    if (unreadMessages.length > 0) {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .in('id', unreadMessages.map(msg => msg.id));
    }
    
    return data as MessageType[];
  };
  
  const { 
    data: conversations, 
    isLoading: conversationsLoading,
  } = useQuery({
    queryKey: ['conversations'],
    queryFn: fetchConversations,
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
  
  const {
    data: messages,
    isLoading: messagesLoading,
  } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: fetchMessages,
    enabled: !!user && !!conversationId,
    staleTime: 1000 * 60 * 1, // 1 minute
  });
  
  const { 
    data: chatPartner,
    isLoading: profileLoading,
  } = useQuery({
    queryKey: ['chat-partner', conversationId, conversations],
    queryFn: async () => {
      if (!user || !conversationId || !conversations) return null;
      
      // Find the conversation
      const conversation = conversations.find(c => c.id === conversationId);
      
      if (!conversation) return null;
      
      return conversation.user1_id === user.id 
        ? conversation.user2
        : conversation.user1;
    },
    enabled: !!user && !!conversationId && !!conversations,
  });
  
  // Subscribe to new messages
  useEffect(() => {
    if (!user || !conversationId) return;
    
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
        }
      )
      .subscribe();
    
    setMessageSubscription(channel);
    
    return () => {
      if (messageSubscription) {
        supabase.removeChannel(messageSubscription);
      }
    };
  }, [user, conversationId, queryClient]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  const sendMessage = async () => {
    if (!user || !conversationId || !messageInput.trim() || !chatPartner) return;
    
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: chatPartner.id,
          conversation_id: conversationId,
          content: messageInput.trim()
        });
      
      if (error) throw error;
      
      // Update conversation last_message_at
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);
      
      setMessageInput("");
      
      // Refetch messages and conversations
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    }
  };
  
  const formatMessageTime = (timestamp: string) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };
  
  const getOtherUser = (conversation: ConversationType) => {
    if (!user) return null;
    
    return conversation.user1_id === user.id 
      ? conversation.user2
      : conversation.user1;
  };
  
  const startNewConversation = async (partnerId: string) => {
    if (!user) return;
    
    // Check if conversation already exists
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('*')
      .or(
        `and(user1_id.eq.${user.id},user2_id.eq.${partnerId}),` + 
        `and(user1_id.eq.${partnerId},user2_id.eq.${user.id})`
      )
      .single();
    
    if (existingConv) {
      navigate(`/chat/${existingConv.id}`);
      return;
    }
    
    // Create new conversation
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user1_id: user.id,
        user2_id: partnerId,
      })
      .select()
      .single();
    
    if (error) {
      console.error("Error creating conversation:", error);
      return;
    }
    
    navigate(`/chat/${data.id}`);
  };
  
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-30">
        {conversationId ? (
          <div className="p-4 flex items-center">
            <Button 
              variant="ghost" 
              size="icon" 
              className="mr-2" 
              onClick={() => navigate('/chat')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            
            {profileLoading ? (
              <div className="flex-1 flex items-center">
                <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse mr-3" />
                <div className="h-5 w-32 bg-gray-200 animate-pulse" />
              </div>
            ) : chatPartner ? (
              <div className="flex-1 flex items-center">
                <Avatar className="h-10 w-10 mr-3">
                  <AvatarImage src={chatPartner.avatar_url || ''} />
                  <AvatarFallback className="bg-primary text-white">
                    {chatPartner.display_name?.substring(0, 2).toUpperCase() || 
                     chatPartner.username?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold">{chatPartner.display_name}</div>
                  <div className="text-xs text-gray-500">@{chatPartner.username}</div>
                </div>
              </div>
            ) : (
              <div className="flex-1">
                <div className="text-sm text-gray-500">Conversation not found</div>
              </div>
            )}
            
            {chatPartner && (
              <Button 
                variant="ghost" 
                size="icon"
                asChild
              >
                <Link to={`/profile/${chatPartner.id}`}>
                  <Info className="h-5 w-5" />
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="p-4">
            <h1 className="text-xl font-bold">Messages</h1>
          </div>
        )}
      </div>
      
      {!conversationId ? (
        <div className="flex-1 overflow-y-auto">
          {!user ? (
            <div className="flex flex-col items-center justify-center h-64 p-4 text-center">
              <MessageCircle className="h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Sign in to view messages</h3>
              <p className="text-gray-500">
                Create an account or sign in to start chatting
              </p>
            </div>
          ) : conversationsLoading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <Loader className="h-8 w-8 text-primary animate-spin mb-4" />
              <p className="text-gray-500">Loading conversations...</p>
            </div>
          ) : conversations && conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 p-4 text-center">
              <MessageCircle className="h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No messages yet</h3>
              <p className="text-gray-500 mb-4">
                Start a conversation with someone
              </p>
              <Link to="/search">
                <Button className="rounded-full">
                  <Search className="h-4 w-4 mr-2" />
                  Find people
                </Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y">
              {conversations?.map((conversation: ConversationType) => {
                const otherUser = getOtherUser(conversation);
                if (!otherUser) return null;
                
                return (
                  <Link 
                    key={conversation.id} 
                    to={`/chat/${conversation.id}`}
                    className="block hover:bg-gray-50 transition-colors"
                  >
                    <div className="p-4 flex items-center">
                      <Avatar className="h-12 w-12 mr-3">
                        <AvatarImage src={otherUser.avatar_url || ''} />
                        <AvatarFallback className="bg-primary text-white">
                          {otherUser.display_name?.substring(0, 2).toUpperCase() || 
                           otherUser.username?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold">{otherUser.display_name}</div>
                        <div className="text-sm text-gray-500 truncate">@{otherUser.username}</div>
                      </div>
                      
                      <div className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-4">
            {messagesLoading ? (
              <div className="flex flex-col items-center justify-center h-64">
                <Loader className="h-8 w-8 text-primary animate-spin mb-4" />
                <p className="text-gray-500">Loading messages...</p>
              </div>
            ) : messages && messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 p-4 text-center">
                <MessageCircle className="h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold mb-2">No messages yet</h3>
                <p className="text-gray-500">
                  Send a message to start the conversation
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages?.map((message, index) => {
                  const isCurrentUser = message.sender_id === user?.id;
                  const showSender = index === 0 || 
                    messages[index - 1].sender_id !== message.sender_id;
                  
                  return (
                    <div 
                      key={message.id}
                      className={cn(
                        "flex",
                        isCurrentUser ? "justify-end" : "justify-start"
                      )}
                    >
                      <div className="max-w-[75%]">
                        {!isCurrentUser && showSender && (
                          <div className="flex items-center mb-1">
                            <Avatar className="h-6 w-6 mr-2">
                              <AvatarImage src={message.sender?.avatar_url || ''} />
                              <AvatarFallback className="bg-primary text-white text-xs">
                                {message.sender?.display_name?.substring(0, 2).toUpperCase() || 
                                 message.sender?.username?.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-gray-500">
                              {message.sender?.display_name || message.sender?.username}
                            </span>
                          </div>
                        )}
                        
                        <div 
                          className={cn(
                            "px-4 py-2 rounded-2xl",
                            isCurrentUser 
                              ? "bg-primary text-white rounded-br-none" 
                              : "bg-gray-200 text-gray-800 rounded-bl-none"
                          )}
                        >
                          {message.content}
                        </div>
                        
                        <div 
                          className={cn(
                            "text-xs mt-1",
                            isCurrentUser ? "text-right" : "text-left",
                            "text-gray-500"
                          )}
                        >
                          {formatMessageTime(message.created_at)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
          
          <div className="p-4 bg-white border-t">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="flex items-center space-x-2"
            >
              <Input
                placeholder="Type a message..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                className="flex-1 rounded-full"
              />
              <Button 
                type="submit"
                size="icon"
                className="rounded-full"
                disabled={!messageInput.trim()}
              >
                <Send className="h-5 w-5" />
              </Button>
            </form>
          </div>
        </>
      )}
    </div>
  );
};

export default Chat;
