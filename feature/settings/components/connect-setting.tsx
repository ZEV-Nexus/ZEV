import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/shared/shadcn/components/ui/card";
import { cn } from "@/shared/shadcn/lib/utils";
import { RiLinkM, RiLinkUnlinkM, RiLoader2Line } from "@remixicon/react";
import Image from "next/image";
import {
  THIRD_PARTY_PROVIDERS,
  ThirdPartyProvider,
} from "@/shared/config/third-part";

import { Badge } from "@/shared/shadcn/components/ui/badge";
import { Button } from "@/shared/shadcn/components/ui/button";
import { UserOAuthAccount } from "@/shared/types";
import { useTranslations } from "next-intl";
type ConnectSettingProps = {
  handleConnect: (connectPayload: ThirdPartyProvider) => void;
  userOAuths: UserOAuthAccount[];
  isLoading: boolean;
};
export default function ConnectSetting({
  handleConnect,
  userOAuths,
  isLoading,
}: ConnectSettingProps) {
  const t = useTranslations("settings");
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">{t("connections")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("connectionsDescription")}
        </p>
      </div>
      <div className="grid gap-4 ">
        {THIRD_PARTY_PROVIDERS.map((provider) => {
          const isConnected = userOAuths.find(
            (o) => o.providerService === provider.service,
          );
          return (
            <Card className="w-full flex-row" key={provider.id}>
              <CardContent className="flex-1 flex items-center gap-4">
                <Image
                  src={provider.image}
                  alt={provider.label}
                  width={32}
                  height={32}
                />
                <div className="flex-1">
                  <CardTitle className="">
                    {provider.label}
                    <Badge
                      variant="outline"
                      className={cn(
                        "ml-2",
                        isConnected
                          ? "text-green-500"
                          : "text-red-500 border-red-500",
                      )}
                    >
                      {isConnected ? t("connected") : t("notConnected")}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="flex items-center justify-between">
                    <p className="text-xs">
                      {provider.provider}
                      {isConnected ? `．${isConnected?.createdAt}` : ""}
                    </p>
                    {userOAuths.length === 0 && isLoading && (
                      <RiLoader2Line className="animate-spin" />
                    )}
                    {isConnected && !isLoading ? (
                      <Button
                        variant={"destructive"}
                        onClick={() => handleConnect(provider)}
                        className={cn(
                          "px-3 py-1 rounded-md text-sm flex gap-2 items-center",
                          "text-red-500 border border-red-500",
                        )}
                      >
                        <RiLinkUnlinkM size={14} />

                        <p>{t("disconnect")}</p>
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleConnect(provider)}
                        className={cn(
                          "px-3 py-1 rounded-md text-sm flex gap-2 items-center",
                        )}
                      >
                        <RiLinkM size={14} />

                        <p>{t("connect")}</p>
                      </Button>
                    )}
                  </CardDescription>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
