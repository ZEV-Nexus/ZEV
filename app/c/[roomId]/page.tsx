import ChatRoom from "@/feature/chat/components/chat-room";
import { getChatRoomById } from "@/shared/service/server/room";
import { getMembersByRoomId } from "@/shared/service/server/member";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/shared/service/server/auth";
import { Viewport } from "next";
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};
export default async function ChatRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { roomId } = await params;
  const roomDoc = await getChatRoomById(roomId);
  const memberDocs = await getMembersByRoomId(roomId);

  if (!roomDoc || !memberDocs.find((member) => member.user.id === user.id)) {
    redirect("/c");
  }

  const room = JSON.parse(JSON.stringify(roomDoc));
  const members = JSON.parse(JSON.stringify(memberDocs));

  return (
    <div className="h-full w-full">
      <ChatRoom room={room} members={members} currentUserId={user.id} />
    </div>
  );
}
