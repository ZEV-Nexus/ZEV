"use client";
import { ThirdPartyProvider } from "@/shared/config/third-part";
import {
  deleteUserOAuthApi,
  getUserOAuths,
} from "@/shared/service/api/user-oauth-account";
import { useConnectStore } from "@/shared/store/connect-store";

import { useQuery } from "@tanstack/react-query";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { toast } from "sonner";

export const useThirdPart = () => {
  const { userOAuthAccounts, setUserOAuthAccounts, deleteUserOAuthAccount } =
    useConnectStore();
  const { data: session } = useSession();

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const { type, success, message } = event.data;
      if (type === "github-connect" || type === "google-connect") {
        toast.success(message);
        if (success) {
          getUserOAuths(session?.user?.id || "").then(setUserOAuthAccounts);
        }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [session, setUserOAuthAccounts]);
  const { isLoading } = useQuery({
    queryKey: ["userOAuths"],
    queryFn: async () => {
      const response = await getUserOAuths(session?.user?.id || "");
      setUserOAuthAccounts(response);
      return response;
    },
  });

  const handleDisconnect = async (id: string, provider: string) => {
    try {
      const response = await deleteUserOAuthApi(id, provider);
      toast.success(response.message || "已成功斷開連結");
      deleteUserOAuthAccount(id);
    } catch (err) {
      console.error("Disconnect error:", err);
      toast.error("斷開連結時發生錯誤");
    }
  };

  const handleConnect = (connectPayload: ThirdPartyProvider) => {
    window.open(
      `/api/third-part/oauth/${connectPayload.provider}/${connectPayload.service}`,
      `${connectPayload.provider}-connect`,
      `width=500,height=600,toolbar=no,menubar=no`,
    );
  };
  return { handleConnect, handleDisconnect, isLoading, userOAuthAccounts };
};
