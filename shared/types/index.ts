import type { LoginMethod } from "@/feature/auth/types";

export interface User {
  id: string;
  userId: string;
  username?: string;
  nickname: string;
  email: string;
  bio?: string;
  avatar?: string;
  password: string;
  provider: LoginMethod;
  emailVerified: boolean;
  githubUsername?: string;
}
export interface ChatNavCategory {
  id: string;
  title?: string;
  items: ChatNavItem[];
  index: number;
}

export interface ChatNavItem {
  id: string;
  room: ChatRoom;
  members?: Member[];
  lastMessage?: string;
  unreadCount?: number;
}

export type RoomType = "dm" | "group" | "channel";

export interface Member {
  id: string;
  user: User;
  room: ChatRoom;
  nickname: string;
  role: "admin" | "owner" | "member" | "guest";
  lastReadMessage?: Message;
  lastReadMessageId?: string;
  notificationSetting: "all" | "mentions" | "mute";
  pinned: boolean;
  roomCategory?: RoomCategory;
  joinedAt: string;
}

export interface ChatRoom {
  id: string;
  roomId?: string;
  lastMessage?: Message;
  lastMessageId?: string;
  name: string;
  roomType: RoomType;
  createdAt: string;
  avatar?: string;
  members?: Member[];
}

export interface RoomCategory {
  id: string;
  title?: string;
  index: number;
}

export interface Message {
  id: string;
  room: ChatRoom;
  roomId: string;
  member: Member;
  memberId: string;
  content?: string;
  createdAt: string;
  attachments?: Attachment[];

  replyTo?: string | Message;
  replyToId?: string;
  editedAt?: string;
  deletedAt?: string;
}

export interface Attachment {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  publicId: string;
  resourceType?: string;
  uploadedAt: string;
}

export interface GitHubRepo {
  owner: string;
  repo: string;
  url: string;
  description?: string;
  stars?: number;
  language?: string;
  forks?: number;
}

export interface Post {
  id: string;
  author: Pick<User, "id" | "userId" | "username" | "nickname" | "avatar">;
  content: string;
  images?: string[];
  githubRepo?: GitHubRepo;
  likes: string[]; // array of user ObjectId
  commentCount: number;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
}

export interface Comment {
  id: string;
  post: string;
  author: Pick<User, "id" | "userId" | "username" | "nickname" | "avatar">;
  content: string;
  createdAt: string;
  deletedAt?: string;
}

export type NotificationType = "room_invite" | "post_like" | "post_comment";

export interface Notification {
  id: string;
  recipient: string;
  sender: Pick<User, "id" | "userId" | "username" | "nickname" | "avatar">;
  type: NotificationType;
  post?: Pick<Post, "id" | "content"> | null;
  comment?: Pick<Comment, "id" | "content"> | null;
  room?: Pick<ChatRoom, "id" | "name" | "roomType" | "roomId"> | null;
  read: boolean;
  createdAt: string;
}
