import userOAuthAccountModel from "@/shared/schema/user-oauth-account";

export async function findUserOAuth(userId: string) {
  return await userOAuthAccountModel
    .find({ user: userId })
    .select("-refreshToken");
}

export async function findUserOAuthByService(userId: string, service: string) {
  return await userOAuthAccountModel
    .findOne({
      user: userId,
      providerService: service,
    })
    .select("-refreshToken");
}
export async function findRefreshTokenByService(
  userId: string,
  service: string,
) {
  const userOAuth = await userOAuthAccountModel.findOne({
    user: userId,
    providerService: service,
  });
  return userOAuth?.refreshToken ?? "";
}

export async function createUserOAuth(
  userId: string,
  provider: string,
  providerService: string,

  refreshToken?: string,
) {
  const userOAuth = await userOAuthAccountModel.create({
    user: userId,
    provider,
    providerService,

    refreshToken,
  });
  return userOAuth;
}

export async function updateUserOAuthTokens(
  userId: string,
  providerService: string,
  refreshToken?: string,
) {
  const userOAuth = await userOAuthAccountModel.findOneAndUpdate(
    { user: userId, providerService },
    { refreshToken, updatedAt: new Date() },
    { new: true },
  );
  return userOAuth;
}

export async function deleteUserOAuth(id: string) {
  return await userOAuthAccountModel.findByIdAndDelete(id);
}
