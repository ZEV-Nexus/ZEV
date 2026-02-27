"use client";

import { Label } from "@/shared/shadcn/components/ui/label";

export function AppearanceSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">外觀</h3>
        <p className="text-sm text-muted-foreground">
          自訂應用程式的外觀和主題。
        </p>
      </div>

      <div className="grid gap-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>主題</Label>
            <p className="text-sm text-muted-foreground">
              選擇應用程式的色彩主題
            </p>
          </div>
          <span className="text-sm text-muted-foreground">系統</span>
        </div>
      </div>
    </div>
  );
}
