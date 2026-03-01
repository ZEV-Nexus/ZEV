import { getCurrentUser } from "@/shared/service/server/auth";
import { apiResponse } from "@/shared/service/server/response";
import { findUserOAuth } from "@/shared/service/server/user-oauth-account";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiResponse({ ok: false, message: "Unauthorized", status: 401 });
    }
    const userOAuths = await findUserOAuth(user.id);
    return apiResponse({ ok: true, data: userOAuths });
  } catch (error) {
    console.error("Error in third-party API route:", error);
    return apiResponse({
      ok: false,
      message: "Internal Server Error",
      status: 500,
    });
  }
}
