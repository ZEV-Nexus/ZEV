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
export default function CreateCategoryDialog({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const { addChatCategory } = useChatStore();
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
      toast.success("Category created successfully");
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
          <DialogTitle>Create Category</DialogTitle>
          <DialogDescription>
            Create a new category to setting up group chat
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="category-name">Category Name</FieldLabel>
            <Input
              placeholder="Category Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            type="button"
            disabled={isPending}
            onClick={async () => {
              mutate();
            }}
          >
            {isPending ? <RiLoader2Line className="animate-spin" /> : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
