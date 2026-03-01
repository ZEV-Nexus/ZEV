import { NextResponse } from "next/server";

import { updateMemberSettings } from "@/shared/service/server/member";
import { getCurrentUser } from "@/shared/service/server/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roomId } = await params;
    const { notificationSetting, pinned } = await req.json();

    const result = await updateMemberSettings(
      user.id,
      roomId,
      notificationSetting,
      pinned,
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Error updating member settings:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
