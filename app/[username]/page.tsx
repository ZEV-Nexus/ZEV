import { userModel } from "@/shared/schema";
import { connectMongoose } from "@/shared/lib/mongoose";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/shared/service/server/auth";
import UserProfile from "@/feature/user/components/user-profile";
import type { Metadata } from "next";

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({
  params,
}: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  await connectMongoose();
  const user = await userModel
    .findOne({ username: username.toLowerCase() })
    .select("nickname username bio");

  if (!user) {
    return { title: "User not found" };
  }

  return {
    title: `${user.nickname || user.username} | Chat.to`,
    description: user.bio || `${user.nickname || user.username} 的個人檔案`,
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;
  await connectMongoose();

  const user = await userModel
    .findOne({ username: username.toLowerCase() })
    .select("-password -__v");

  if (!user) {
    notFound();
  }

  const currentUser = await getCurrentUser();
  const isOwnProfile = currentUser?.userId === user.userId;

  const profileData = {
    id: user.id,
    userId: user.userId!,
    username: user.username || "",
    nickname: user.nickname || "",
    email: user.email || "",
    bio: user.bio || "",
    avatar: user.avatar || "",
    createdAt: user.createdAt?.toISOString() || "",
  };

  return (
    <UserProfile
      profile={profileData}
      isOwnProfile={isOwnProfile}
      currentUserId={currentUser?.userId}
    />
  );
}
