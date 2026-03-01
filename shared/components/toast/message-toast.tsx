"use client";
import { Message } from "@/shared/types";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/shared/shadcn/components/ui/avatar";
import moment from "moment";
import Link from "next/link";
import { toast } from "sonner";

import { MentionText } from "@/feature/chat/components/mention-text";
import { useChatStore } from "@/shared/store/chat-store";

export default function MessageToast(message: Message) {
  return toast.custom((t) => <Toast id={t} message={message} />, {
    position: "top-right",
    duration: 5000,
    closeButton: true,
  });
}

function Toast({ id, message }: { id: string | number; message: Message }) {
  const { content, member, room, createdAt } = message;
  const displayName = room.roomType === "dm" ? member.user.nickname : room.name;
  const { chatCategorys } = useChatStore();
  const members = chatCategorys
    .find((cat) => cat.items.some((item) => item.room?.id === room.id))
    ?.items.find((item) => item.room?.id === room.id)?.members;
  const displayAvatar =
    room.roomType === "dm" ? member.user.avatar : room.avatar;
  return (
    <Link id={`toast-${id}`} href={`/c/${room.id}`} className="w-full">
      <div className="flex rounded-lg bg-background/50 backdrop-blur-sm shadow-lg ring-1 ring-black/5 w-full items-center p-4">
        <div className="flex gap-2 flex-1 min-w-0 overflow-hidden  ">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={displayAvatar} alt={displayName} />
            <AvatarFallback>{displayName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex-1 flex items-center gap-4 justify-between">
              <p className=" font-medium text-foreground truncate">
                {displayName}
              </p>
              <p className="text-xs text-muted-foreground/70">
                {moment(createdAt).fromNow()}
              </p>
            </div>

            <p className="text-sm text-foreground/50 truncate">
              <MentionText content={content ?? ""} members={members ?? []} />
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
