import { getCurrentUser } from "@/shared/service/server/auth";
import { apiResponse } from "@/shared/service/server/response";
import { searchUsers } from "@/shared/service/server/user";

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || "";
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Failed to create group" },
        { status: 401 },
      );
    }
    const users = await searchUsers(user, query);

    return apiResponse({ ok: true, data: users });
  } catch (error: unknown) {
    console.error("User search error:", error);
    return apiResponse({
      ok: false,
      error: (error as Error).message || "Internal Server Error",
      status: 500,
    });
  }
}
