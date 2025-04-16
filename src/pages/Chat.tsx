import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, ArrowLeft, Loader, Search, Info, MessageCircle, HomeIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Message, Profile, Conversation } from "@/types/supabase";

// Define properly typed interfaces to fix recursion
interface MessageWithSender extends Omit<Message, 'sender'> {
  sender?: Profile;
  conversation_id?: string;
}

interface ConversationWithUsers extends Omit<Conversation, 'user1' | 'user2'> {
  user1?: Profile;
  user2?: Profile;
}

const Chat = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [messageInput, setMessageInput] = useState("");
  const [messageSubscription, setMessageSubscription] = useState<any>(null);
  const [isSending, setIsSending] = useState(false);
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
    
    if (error) {
      console.error("Error fetching conversations:", error);
      throw error;
    }
    
    return data as ConversationWithUsers[];
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
    
    if (error) {
      console.error("Error fetching messages:", error);
      throw error;
    }
    
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
    
    return data as MessageWithSender[];
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
    refetch: refetchChatPartner
  } = useQuery({
    queryKey: ['chat-partner', conversationId, conversations],
    queryFn: async () => {
      if (!user || !conversationId || !conversations) return null;
      
      // Find the conversation
      const conversation = conversations.find(c => c.id === conversationId);
      
      if (!conversation) {
        // If conversation isn't in the list, try to fetch it directly
        const { data, error } = await supabase
          .from('conversations')
          .select(`
            *,
            user1:profiles!user1_id(*),
            user2:profiles!user2_id(*)
          `)
          .eq('id', conversationId)
          .single();
          
        if (error) {
          console.error("Error fetching single conversation:", error);
          return null;
        }
        
        return data.user1_id === user.id ? data.user2 : data.user1;
      }
      
      return conversation.user1_id === user.id 
        ? conversation.user2
        : conversation.user1;
    },
    enabled: !!user && !!conversationId,
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
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
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
    if (!user || !conversationId || !messageInput.trim() || !chatPartner || isSending) return;
    
    setIsSending(true);
    
    try {
      // Get partner user ID
      const partnerId = chatPartner.id;
      
      // Check if conversation exists
      const { data: existingConv, error: convCheckError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .maybeSingle();
      
      let actualConversationId = conversationId;
      
      // If conversation doesn't exist, create it
      if (!existingConv) {
        // Create a new conversation
        const { data: newConv, error: createConvError } = await supabase
          .from('conversations')
          .insert({
            // Don't send the existing conversationId if it doesn't exist in DB
            user1_id: user.id,
            user2_id: partnerId,
            last_message_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (createConvError) {
          console.error("Error creating conversation:", createConvError);
          toast.error("Failed to create conversation. Please try again.");
          setIsSending(false);
          return;
        }
        
        actualConversationId = newConv.id;
        
        // If we created a new conversation, redirect to it
        if (actualConversationId !== conversationId) {
          navigate(`/chat/${actualConversationId}`, { replace: true });
        }
      }
      
      // Send the message
      const { error: msgError } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: partnerId,
          conversation_id: actualConversationId,
          content: messageInput.trim(),
          is_read: false
        });
      
      if (msgError) {
        console.error("Error sending message:", msgError);
        toast.error("Failed to send message. Please try again.");
        setIsSending(false);
        return;
      }
      
      // Update conversation last_message_at
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', actualConversationId);
      
      setMessageInput("");
      
      // Refetch data
      queryClient.invalidateQueries({ queryKey: ['messages', actualConversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      refetchChatPartner();
      
      setIsSending(false);
    } catch (error) {
      console.error("Error in send message flow:", error);
      toast.error("An error occurred while sending your message.");
      setIsSending(false);
    }
  };
  
  const formatMessageTime = (timestamp: string) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };
  
  const getOtherUser = (conversation: ConversationWithUsers) => {
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
      .maybeSingle();
    
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
        last_message_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error("Error creating conversation:", error);
      toast.error("Failed to start conversation. Please try again.");
      return;
    }
    
    navigate(`/chat/${data.id}`);
  };
  
  // Handler for going back to previous page
  const handleGoBack = () => {
    navigate(-1);
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
          <div className="p-4 flex justify-between items-center">
              
              <h1 className="text-xl font-bold flex-1">Messages</h1>
              <Link 
                to="/"
              className="mr-2"
            >
              <HomeIcon className="h-6 w-6" />
            </Link>
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
              {conversations?.map((conversation: ConversationWithUsers) => {
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
                disabled={isSending}
              />
              <Button 
                type="submit"
                size="icon"
                className="rounded-full"
                disabled={!messageInput.trim() || isSending}
              >
                {isSending ? (
                  <Loader className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </form>
          </div>
        </>
      )}
    </div>
  );
};

export default Chat;