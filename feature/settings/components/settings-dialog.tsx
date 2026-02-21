"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/shadcn/components/ui/dialog";
import { Label } from "@/shared/shadcn/components/ui/label";
import { Input } from "@/shared/shadcn/components/ui/input";
import { Button } from "@/shared/shadcn/components/ui/button";
import { AIProvider } from "@/shared/store/ai-store";
import { RiSettings4Line, RiEyeLine, RiEyeOffLine } from "@remixicon/react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/shadcn/components/ui/tooltip";
import { Switch } from "@/shared/shadcn/components/ui/switch";
import { useKey } from "../hooks/use-key";

export function SettingsDialog() {
  const [open, setOpen] = useState(false);

  const {
    apiKeys,
    setApiKeys,
    maskedKeys,
    showKeys,
    toggleShowKey,
    saveUserApiKeysMutation,
    isEditing,
    setIsEditing,
  } = useKey();

  console.log(maskedKeys);

  const providers: { id: AIProvider; label: string; placeholder: string }[] = [
    { id: "openai", label: "OpenAI API Key", placeholder: "sk-..." },
    { id: "anthropic", label: "Anthropic API Key", placeholder: "sk-ant-..." },
    { id: "google", label: "Google Gemini API Key", placeholder: "AIza..." },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <button className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200">
              <RiSettings4Line className="h-5 w-5" />
            </button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent side="right">設定</TooltipContent>
      </Tooltip>

      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>AI Assistant Settings</DialogTitle>
          <DialogDescription>
            設定您的 AI 提供商 API
            金鑰。金鑰會加密後儲存於伺服器，不會以明文傳回前端。
          </DialogDescription>
          <div className="flex items-center gap-2">
            <Label htmlFor="edit-mode">編輯</Label>
            <Switch
              checked={isEditing}
              onCheckedChange={setIsEditing}
              id="edit-mode"
            />
          </div>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {providers.map((provider) => (
            <div key={provider.id} className="grid gap-2">
              <Label htmlFor={provider.id}>
                {provider.label}
                {!isEditing && maskedKeys[provider.id] && (
                  <span className="ml-2 text-xs text-green-500 font-normal">
                    已設定
                  </span>
                )}
              </Label>
              <div className="relative">
                <Input
                  id={provider.id}
                  type={
                    showKeys[provider.id] || maskedKeys[provider.id]
                      ? "text"
                      : "password"
                  }
                  value={
                    isEditing
                      ? apiKeys[provider.id]
                      : maskedKeys[provider.id] || ""
                  }
                  onChange={(e) =>
                    setApiKeys({
                      ...apiKeys,
                      [provider.id]: e.target.value,
                    })
                  }
                  placeholder={
                    isEditing
                      ? provider.placeholder
                      : maskedKeys[provider.id]
                        ? maskedKeys[provider.id]
                        : "（未設定）"
                  }
                  disabled={!isEditing || saveUserApiKeysMutation.isPending}
                  className="pr-10"
                />
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => toggleShowKey(provider.id)}
                    className="absolute right-0 top-0 h-full px-3 flex items-center justify-center hover:bg-transparent"
                  >
                    {showKeys[provider.id] ? (
                      <RiEyeOffLine className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <RiEyeLine className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <Button
            disabled={!isEditing || saveUserApiKeysMutation.isPending}
            onClick={() => saveUserApiKeysMutation.mutate(apiKeys)}
          >
            {saveUserApiKeysMutation.isPending ? "儲存中..." : "儲存設定"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
