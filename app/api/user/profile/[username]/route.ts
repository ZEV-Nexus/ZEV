import { userModel } from "@/shared/schema";
import { connectMongoose } from "@/shared/lib/mongoose";
import { apiResponse } from "@/shared/service/server/response";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  try {
    const { username } = await params;

    await connectMongoose();
    const user = await userModel
      .findOne({ username: username.toLowerCase() })
      .select("-password -__v");

    if (!user) {
      return apiResponse({ ok: false, error: "User not found", status: 404 });
    }

    return apiResponse({ ok: true, data: user });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return apiResponse({
      ok: false,
      error: (error as Error).message || "Internal Server Error",
      status: 500,
    });
  }
}
