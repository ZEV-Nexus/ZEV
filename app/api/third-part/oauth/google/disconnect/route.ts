import { getCurrentUser } from "@/shared/service/server/auth";
import { apiResponse } from "@/shared/service/server/response";
import { deleteUserOAuth } from "@/shared/service/server/user-oauth-account";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return apiResponse({ error: "Unauthorized", status: 401 });
  }
  const { id } = await req.json();
  const deleteOAuth = await deleteUserOAuth(id);
  try {
    return apiResponse({
      ok: true,
      message: `已成功斷開 Google ${deleteOAuth?.providerService}連結`,
    });
  } catch (err) {
    console.error("Google disconnect error:", err);
    return apiResponse({
      ok: false,
      error: "斷開 Google 帳號時發生錯誤",
      status: 500,
    });
  }
}
