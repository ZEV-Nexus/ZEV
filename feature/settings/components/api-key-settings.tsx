"use client";

import { Label } from "@/shared/shadcn/components/ui/label";
import { Input } from "@/shared/shadcn/components/ui/input";
import { Button } from "@/shared/shadcn/components/ui/button";
import { Switch } from "@/shared/shadcn/components/ui/switch";
import { AIProvider } from "@/shared/store/ai-store";
import { RiEyeLine, RiEyeOffLine } from "@remixicon/react";
import { useKey } from "../hooks/use-key";

const providers: { id: AIProvider; label: string; placeholder: string }[] = [
  { id: "openai", label: "OpenAI API Key", placeholder: "sk-..." },
  { id: "anthropic", label: "Anthropic API Key", placeholder: "sk-ant-..." },
  { id: "google", label: "Google Gemini API Key", placeholder: "AIza..." },
];

export function ApiKeySettings() {
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

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">API 金鑰</h3>
        <p className="text-sm text-muted-foreground">
          設定您的 AI 提供商 API
          金鑰。金鑰會加密後儲存於伺服器，不會以明文傳回前端。
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Label htmlFor="edit-mode">編輯模式</Label>
        <Switch
          checked={isEditing}
          onCheckedChange={setIsEditing}
          id="edit-mode"
        />
      </div>

      <div className="grid gap-4">
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
                    ? apiKeys[provider.id]?.key || ""
                    : maskedKeys[provider.id]?.key || ""
                }
                onChange={(e) =>
                  setApiKeys({
                    ...apiKeys,
                    [provider.id]: {
                      key: e.target.value,
                      id: maskedKeys[provider.id]
                        ? maskedKeys[provider.id].id
                        : "",
                    },
                  })
                }
                placeholder={
                  isEditing
                    ? provider.placeholder
                    : maskedKeys[provider.id]
                      ? maskedKeys[provider.id].key
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
    </div>
  );
}
