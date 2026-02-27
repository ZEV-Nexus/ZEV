"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/shared/shadcn/components/ui/avatar";
import { Card, CardContent } from "@/shared/shadcn/components/ui/card";
import { Label } from "@/shared/shadcn/components/ui/label";
import { Button } from "@/shared/shadcn/components/ui/button";
import { useSession } from "next-auth/react";

export function GeneralSettings() {
  const { data: session } = useSession();
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">一般</h3>
        <p className="text-sm text-muted-foreground">
          管理您的帳號和偏好設定。
        </p>
      </div>

      <div className="grid gap-4">
        <Card className="flex-row items-center justify-between">
          <CardContent className=" w-full flex  items-center   justify-between">
            <div className="flex flex-row items-center">
              <Avatar>
                <AvatarImage src={session?.user?.avatar || undefined} />
                <AvatarFallback>
                  {session?.user?.nickname?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="ml-4">
                <p className="text-sm font-medium">{session?.user?.nickname}</p>
                <p className="text-sm text-muted-foreground">
                  {session?.user?.email}
                </p>
              </div>
            </div>

            <Button variant="destructive">登出</Button>
          </CardContent>
        </Card>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>語言</Label>
            <p className="text-sm text-muted-foreground">選擇介面顯示語言</p>
          </div>
          <span className="text-sm text-muted-foreground">繁體中文</span>
        </div>
      </div>
    </div>
  );
}
