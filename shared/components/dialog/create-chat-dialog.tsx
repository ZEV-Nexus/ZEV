"use client";

import React from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/shadcn/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
} from "@/shared/shadcn/components/ui/field";
import { Label } from "@/shared/shadcn/components/ui/label";
import { Input } from "@/shared/shadcn/components/ui/input";
import { Button } from "@/shared/shadcn/components/ui/button";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/shared/shadcn/components/ui/radio-group";
import useCreateChat from "@/shared/hooks/use-create-chat";
import { Checkbox } from "@/shared/shadcn/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/shadcn/components/ui/table";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/shared/shadcn/components/ui/avatar";
import { Skeleton } from "@/shared/shadcn/components/ui/skeleton";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/shared/shadcn/components/ui/input-group";
import { RiLoader2Line, RiSearch2Line } from "@remixicon/react";
import { ScrollArea } from "@/shared/shadcn/components/ui/scroll-area";
import { RoomType } from "@/shared/types";

export default function CreateChatDialog({
  categoryId,
  children,
}: {
  children: React.ReactNode;
  categoryId?: string;
}) {
  const {
    chatDetails,
    setChatDetails,
    query,
    setQuery,
    searchResults,
    isLoading,
    error,
    mutate,
    isPending,
  } = useCreateChat(categoryId);

  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Create Chat</DialogTitle>
          <DialogDescription>
            Create a new chat for personal room or group.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup
          value={chatDetails.roomType}
          defaultValue="dm"
          onValueChange={(v) => {
            setChatDetails((prev) => ({ ...prev, roomType: v as RoomType }));
            setQuery("");
            setChatDetails((prev) => ({ ...prev, members: [] }));
          }}
          className="flex gap-4"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="dm" id="type-dm" />
            <Label htmlFor="type-dm">Personal (DM)</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="group" id="type-group" />
            <Label htmlFor="type-group">Group</Label>
          </div>
        </RadioGroup>

        {chatDetails.roomType === "dm" ? (
          <>
            <FieldGroup>
              <FieldDescription>
                Search your friend by username to start a personal chat.
              </FieldDescription>
              <Field>
                <InputGroup>
                  <InputGroupInput
                    id="dm-username"
                    name="username"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search friends..."
                  />
                  <InputGroupAddon>
                    <RiSearch2Line />
                  </InputGroupAddon>
                  <InputGroupAddon align="inline-end">
                    <InputGroupText>
                      {searchResults?.length} friends
                    </InputGroupText>
                  </InputGroupAddon>
                </InputGroup>
              </Field>
            </FieldGroup>
          </>
        ) : (
          <FieldGroup>
            <FieldDescription>
              Search your friends by username to start a group chat.
            </FieldDescription>
            <Field>
              <Label htmlFor="group-name">Group name</Label>
              <Input
                id="group-name"
                name="name"
                required
                placeholder="Enter group name"
                value={chatDetails.chatName}
                onChange={(e) =>
                  setChatDetails((prev) => ({
                    ...prev,
                    chatName: e.target.value,
                  }))
                }
              />
            </Field>
            <Field>
              <InputGroup>
                <InputGroupInput
                  id="group-members"
                  name="members"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search friends..."
                />
                <InputGroupAddon>
                  <RiSearch2Line />
                </InputGroupAddon>
                <InputGroupAddon align="inline-end">
                  <InputGroupText>
                    {searchResults?.length} friends
                  </InputGroupText>
                </InputGroupAddon>
              </InputGroup>
            </Field>
          </FieldGroup>
        )}
        {!error && (
          <ScrollArea className="h-40">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    {chatDetails.roomType === "group" && (
                      <Checkbox
                        checked={
                          chatDetails.members.length ===
                            searchResults?.length && searchResults?.length > 0
                        }
                        onCheckedChange={(checked) => {
                          setChatDetails((prev) => {
                            if (!checked) {
                              return {
                                ...prev,
                                members: [],
                              };
                            }
                            return {
                              ...prev,
                              members: Array.from(
                                new Set([
                                  ...prev.members,
                                  ...(searchResults || []),
                                ]),
                              ),
                            };
                          });
                        }}
                      />
                    )}
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading &&
                  Array.from({ length: 3 }).map((_, index) => (
                    <TableRow key={index}>
                      {Array.from({ length: 3 }).map((_, columnIndex) => (
                        <TableCell key={columnIndex}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                {!isLoading &&
                  chatDetails.members.length > 0 &&
                  chatDetails.members.map((member) => (
                    <TableRow
                      key={member.id}
                      data-state={
                        chatDetails.members.some((m) => m.id === member.id) &&
                        "selected"
                      }
                    >
                      <TableCell>
                        <Checkbox
                          id={`row-${member.id}-checkbox`}
                          name={`row-${member.id}-checkbox`}
                          checked={chatDetails.members.some(
                            (m) => m.id === member.id,
                          )}
                          onCheckedChange={(checked) =>
                            setChatDetails((prev) => {
                              const isMember = prev.members.find(
                                (m) => m.id === member.id,
                              );
                              let updatedMembers;
                              if (checked && !isMember) {
                                // Add member
                                updatedMembers = [...prev.members, member];
                              } else if (!checked && isMember) {
                                // Remove member
                                updatedMembers = prev.members.filter(
                                  (m) => m.id !== member.id,
                                );
                              }
                              return {
                                ...prev,
                                members: updatedMembers || prev.members,
                              };
                            })
                          }
                        />
                      </TableCell>
                      <TableCell className="font-medium flex items-center gap-2">
                        <Avatar>
                          <AvatarFallback>
                            {member.nickname.charAt(0)}
                          </AvatarFallback>
                          <AvatarImage
                            src={member.avatar}
                            alt={member.nickname}
                          />
                        </Avatar>
                        {member.nickname}
                      </TableCell>
                      <TableCell className=" truncate">
                        {member.email}
                      </TableCell>
                    </TableRow>
                  ))}
                {searchResults?.map((row) => {
                  if (
                    chatDetails.members.some((member) => member.id === row.id)
                  ) {
                    return null;
                  }
                  return (
                    <TableRow
                      key={row.id}
                      data-state={
                        chatDetails.members.find(
                          (member) => member.id === row.id,
                        )
                          ? "selected"
                          : undefined
                      }
                      data-disabled={
                        chatDetails.roomType == "dm" &&
                        chatDetails.members.length >= 1
                      }
                      className="data-disabled:opacity-50 data-disabled:cursor-not-allowed"
                    >
                      <TableCell>
                        <Checkbox
                          disabled={
                            chatDetails.roomType == "dm" &&
                            chatDetails.members.length >= 1
                          }
                          id={`row-${row.id}-checkbox`}
                          name={`row-${row.id}-checkbox`}
                          checked={chatDetails.members.some(
                            (member) => member.id === row.id,
                          )}
                          onCheckedChange={(checked) =>
                            setChatDetails((prev) => {
                              const isMember = prev.members.find(
                                (member) => member.id === row.id,
                              );
                              let updatedMembers;
                              if (checked && !isMember) {
                                // Add member
                                updatedMembers = [...prev.members, row];
                              } else if (!checked && isMember) {
                                // Remove member
                                updatedMembers = prev.members.filter(
                                  (member) => member.id !== row.id,
                                );
                              }
                              return {
                                ...prev,
                                members: updatedMembers || prev.members,
                              };
                            })
                          }
                        />
                      </TableCell>
                      <TableCell className="font-medium flex items-center gap-2">
                        <Avatar>
                          <AvatarFallback>
                            {row.nickname.charAt(0)}
                          </AvatarFallback>
                          <AvatarImage src={row.avatar} alt={row.nickname} />
                        </Avatar>
                        {row.nickname}
                      </TableCell>
                      <TableCell className=" truncate">{row.email}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            type="button"
            disabled={isPending}
            onClick={() => {
              mutate(undefined, {
                onSuccess: () => {
                  setOpen(false);
                },
              });
            }}
          >
            {isPending ? <RiLoader2Line className="animate-spin" /> : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
