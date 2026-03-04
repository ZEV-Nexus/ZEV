"use client";

import {
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
  Dialog,
  DialogContent,
  DialogHeader,
} from "@/shared/shadcn/components/ui/dialog";

import { Button } from "@/shared/shadcn/components/ui/button";
import { RiLoader2Line } from "@remixicon/react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  FieldGroup,
  Field,
  FieldLabel,
} from "@/shared/shadcn/components/ui/field";
import { Input } from "@/shared/shadcn/components/ui/input";
import { useState } from "react";
import { updateCategory } from "@/shared/service/api/room-category";
import { useChatStore } from "@/shared/store/chat-store";
import { useTranslations } from "next-intl";

export default function EditCategoryDialog({
  children,
  categoryId,
  currentName,
}: {
  children: React.ReactNode;
  categoryId: string;
  currentName: string;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(currentName);
  const { updateChatCategoryTitle } = useChatStore();
  const t = useTranslations("chatDialog");

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const res = await updateCategory(categoryId, name);
      return res;
    },
    onSuccess: () => {
      updateChatCategoryTitle(categoryId, name);
      toast.success(t("categoryUpdated"));
      setOpen(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("editCategoryTitle")}</DialogTitle>
          <DialogDescription>{t("editCategoryDescription")}</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="category-name">{t("categoryName")}</FieldLabel>
            <Input
              placeholder={t("categoryNamePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim() && !isPending) {
                  mutate();
                }
              }}
            />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">{t("cancel")}</Button>
          </DialogClose>
          <Button
            type="button"
            disabled={isPending || !name.trim()}
            onClick={() => mutate()}
          >
            {isPending ? <RiLoader2Line className="animate-spin" /> : t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
