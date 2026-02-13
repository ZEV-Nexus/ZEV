import type { LoginMethod } from "@/feature/auth/types";

export interface User {
  id: string;
  userId: string;
  nickname: string;
  email: string;
  bio?: string;
  avatar?: string;
  password: string;
  provider: LoginMethod;
  emailVerified: boolean;
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
