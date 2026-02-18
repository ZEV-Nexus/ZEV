"use client";

import React, { useState } from "react";
import { Input } from "@/shared/shadcn/components/ui/input";
import { RiSearchLine, RiUserLine, RiChat1Line } from "@remixicon/react";
import { ScrollArea } from "@/shared/shadcn/components/ui/scroll-area";

export default function SearchPanel() {
  const [query, setQuery] = useState("");

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border p-4">
        <h2 className="text-base font-semibold text-foreground mb-3">搜尋</h2>
        <div className="relative">
          <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜尋使用者或聊天室..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 h-9 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary/50"
          />
        </div>
      </div>

      {/* Results */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          {!query ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <RiSearchLine className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">輸入關鍵字開始搜尋</p>
            </div>
          ) : (
            <div className="space-y-1">
              {/* Placeholder results - connect to real search API later */}
              <p className="text-xs font-medium text-muted-foreground px-2 py-1.5">
                搜尋結果
              </p>
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <p className="text-sm">沒有找到 &quot;{query}&quot; 的結果</p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
