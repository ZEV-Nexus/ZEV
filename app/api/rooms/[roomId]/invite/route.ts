import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { inviteMembers } from "@/shared/service/server/member";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roomId } =await params;
    const { userIds } = await req.json(); // Array of user IDs to invite

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: "Invalid userIds" }, { status: 400 });
    }

    const members = await inviteMembers(roomId, userIds);

    return NextResponse.json({ success: true, data: members });
  } catch (error) {
    console.error("Error inviting members:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
