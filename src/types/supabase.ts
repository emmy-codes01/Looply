
export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
};

export type Post = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  profile?: Profile;
  likes_count?: number;
  comments_count?: number;
  is_liked?: boolean;
  is_bookmarked?: boolean;
  images?: PostImage[];
};

export type PostImage = {
  id: string;
  post_id: string;
  image_url: string;
  created_at: string;
};

export type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  profile?: Profile;
};

export type Like = {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
};

export type Bookmark = {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
};

export type Follow = {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
};

export type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: Profile;
};

export type Notification = {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: 'like' | 'comment' | 'follow' | 'message';
  post_id: string | null;
  comment_id: string | null;
  message_id: string | null;
  is_read: boolean;
  created_at: string;
  actor?: Profile;
  post?: Post;
  comment?: Comment;
  message?: Message;
};

export type Conversation = {
  id: string;
  user1_id: string;
  user2_id: string;
  last_message_at: string;
  created_at: string;
  user1?: Profile;
  user2?: Profile;
  last_message?: Message;
};
