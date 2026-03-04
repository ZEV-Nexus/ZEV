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
import { createCategory } from "@/shared/service/api/room-category";
import { useChatStore } from "@/shared/store/chat-store";
import { useTranslations } from "next-intl";
export default function CreateCategoryDialog({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const { addChatCategory } = useChatStore();
  const t = useTranslations("chatDialog");
  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const res = await createCategory(name);
      return res;
    },
    onSuccess: (data) => {
      addChatCategory({
        id: data.id,
        title: data.title,
        index: data.index,
        items: [],
      });
      toast.success(t("categoryCreated"));
      setOpen(false);
      setName("");
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
          <DialogTitle>{t("createCategoryTitle")}</DialogTitle>
          <DialogDescription>
            {t("createCategoryDescription")}
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="category-name">{t("categoryName")}</FieldLabel>
            <Input
              placeholder={t("categoryNamePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">{t("cancel")}</Button>
          </DialogClose>
          <Button
            type="button"
            disabled={isPending}
            onClick={async () => {
              mutate();
            }}
          >
            {isPending ? (
              <RiLoader2Line className="animate-spin" />
            ) : (
              t("create")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
