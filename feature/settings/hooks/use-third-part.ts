"use client";
import { ThirdPartyProvider } from "@/shared/config/third-part";
import { getUserOAuths } from "@/shared/service/api/user-oauth-account";
import { UserOAuthAccount } from "@/shared/types";
import { useQuery } from "@tanstack/react-query";

import { useSession } from "next-auth/react";
import { useState } from "react";

export const useThirdPart = () => {
  const [userOAuths, setUserOAuths] = useState<UserOAuthAccount[]>([]);
  const { data: session } = useSession();
  const { isLoading } = useQuery({
    queryKey: ["userOAuths"],
    queryFn: async () => {
      const response = await getUserOAuths(session?.user?.id || "");
      setUserOAuths(response);
      return response;
    },
  });
  const handleConnect = (connectPayload: ThirdPartyProvider) => {
    window.open(
      `/api/third-part/oauth/${connectPayload.provider}/${connectPayload.service}`,
      `${connectPayload.provider}-connect`,
      `width=500,height=600,toolbar=no,menubar=no`,
    );
  };
  return { handleConnect, isLoading, userOAuths };
};
