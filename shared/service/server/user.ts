import { userModel } from "@/shared/schema";
import { User } from "@/shared/types";

export const searchUsers = async (
  user: Pick<
    User,
    | "id"
    | "username"
    | "nickname"
    | "avatar"
    | "email"
    | "bio"
    | "provider"
    | "emailVerified"
    | "githubUsername"
  >,
  query: string,
) => {
  const users = await userModel
    .find({
      $or: [
        { nickname: { $regex: query, $options: "i" } },
        { username: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
      ],
      _id: { $ne: user.id },
    })
    .select("id  username nickname email avatar");
  return users;
};
