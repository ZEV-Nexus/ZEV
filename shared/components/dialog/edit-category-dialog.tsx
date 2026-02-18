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
import { useEffect, useState } from "react";
import { updateCategory } from "@/shared/service/api/room-category";
import { useChatStore } from "@/shared/store/chat-store";

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

  useEffect(() => {
    if (open) {
      setName(currentName);
    }
  }, [open, currentName]);

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const res = await updateCategory(categoryId, name);
      return res;
    },
    onSuccess: () => {
      updateChatCategoryTitle(categoryId, name);
      toast.success("Category updated successfully");
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
          <DialogTitle>Edit Category</DialogTitle>
          <DialogDescription>
            Change the name of this category
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="category-name">Category Name</FieldLabel>
            <Input
              placeholder="Category Name"
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
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            type="button"
            disabled={isPending || !name.trim()}
            onClick={() => mutate()}
          >
            {isPending ? <RiLoader2Line className="animate-spin" /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
