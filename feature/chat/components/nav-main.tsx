"use client";
import { ReactSortable } from "react-sortablejs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/shadcn/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  useSidebar,
} from "@/shared/shadcn/components/ui/sidebar";
import {
  RiArrowRightSLine,
  RiChatAiLine,
  RiPencilLine,
  RiDeleteBinLine,
  RiListSettingsLine,
  RiMore2Line,
  RiDraggable,
  RiListCheck3,
  RiFolderAddLine,
  RiUserLine,
  RiGroupLine,
  RiFolderLine,
} from "@remixicon/react";

import { Button } from "@/shared/shadcn/components/ui/button";

import {
  DropdownMenuTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuItem,
  DropdownMenuGroup,
} from "../../../shared/shadcn/components/ui/dropdown-menu";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import CreateChatDialog from "@/shared/components/dialog/create-chat-dialog";
import { cn } from "../../../shared/shadcn/lib/utils";
import { useChatStore } from "@/shared/store/chat-store";
import {
  updateMemberSort,
  deleteCategory,
  updateCategorySort,
} from "@/shared/service/api/room-category";
import { getUserRooms } from "@/shared/service/api/room";
import NavRoomItem, { NavRoomItemSkeleton } from "./nav-room-item";
import CreateCategoryDialog from "@/shared/components/dialog/create-category-dialog";
import EditCategoryDialog from "@/shared/components/dialog/edit-category-dialog";
import { useSession } from "next-auth/react";
import { Badge } from "@/shared/shadcn/components/ui/badge";

export function NavMain() {
  const { isMobile } = useSidebar();
  const { data: session, status } = useSession();

  const [isEditMode, setIsEditMode] = useState(false);

  const { chatCategorys, setChatCategorys } = useChatStore();

  const { data: fetchedCategories, isLoading: isQueryLoading } = useQuery({
    queryKey: ["user-rooms", session?.user?.userId],
    queryFn: () => getUserRooms(),
    enabled: !!session?.user?.userId,
  });

  useEffect(() => {
    if (fetchedCategories && session?.user?.userId) {
      setChatCategorys(fetchedCategories, session.user.userId);
    }
  }, [fetchedCategories, setChatCategorys, session?.user?.userId]);

  const isLoading =
    status === "loading" || (!!session?.user?.userId && isQueryLoading);

  return (
    <SidebarGroup>
      <span className=" flex justify-between">
        <SidebarGroupLabel className="text-base">Chat</SidebarGroupLabel>
        {isEditMode ? (
          <Button
            variant={"ghost"}
            size={"icon"}
            className={cn(
              isEditMode && "text-primary  border border-border  animate-pulse",
            )}
            onClick={() => setIsEditMode((prev) => !prev)}
          >
            <RiListCheck3 />
          </Button>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto text-muted-foreground"
              >
                <RiListSettingsLine />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              side={isMobile ? "right" : "bottom"}
              sideOffset={isMobile ? 10 : 0}
              align={isMobile ? "start" : "end"}
            >
              <CreateChatDialog>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <RiChatAiLine /> Add New Chat
                </DropdownMenuItem>
              </CreateChatDialog>
              <CreateCategoryDialog>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <RiFolderAddLine /> Add New Category
                </DropdownMenuItem>
              </CreateCategoryDialog>
              {!isEditMode && (
                <DropdownMenuItem
                  onClick={() => setIsEditMode((prev) => !prev)}
                >
                  <RiPencilLine />
                  Edit Groups
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </span>
      <SidebarMenu>
        {isLoading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <NavRoomItemSkeleton key={index} />
          ))
        ) : (
          <ReactSortable
            handle=".handle"
            list={chatCategorys}
            disabled={!isEditMode}
            animation={300}
            setList={(newList) => setChatCategorys(newList)}
            onEnd={async (evt) => {
              const itemId = evt.item.getAttribute("data-id");
              if (itemId && typeof evt.newIndex === "number") {
                await updateCategorySort(itemId, evt.newIndex);
              }
            }}
          >
            {chatCategorys.map((record) => {
              return (
                <div key={record.id} className="flex " data-id={record.id}>
                  {isEditMode &&
                    record.id !== "dm" &&
                    record.id !== "group" && (
                      <Button
                        variant="ghost"
                        className="handle   cursor-grab text-muted-foreground"
                        size="icon"
                      >
                        <RiDraggable />
                      </Button>
                    )}
                  <Collapsible
                    defaultOpen={record.id === "dm" || record.id === "group"}
                    asChild
                    className="group/collapsible flex-1 overflow-hidden "
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          tooltip={record?.title}
                          className="text-muted-foreground hover:bg-transparent focus:bg-transparent! flex justify-between text-base"
                        >
                          <div className="flex items-center gap-2">
                            {record.id === "dm" && <RiUserLine />}
                            {record.id === "group" && <RiGroupLine />}
                            {record.id !== "dm" && record.id !== "group" && (
                              <RiFolderLine />
                            )}
                            <span>{record.title}</span>{" "}
                            <RiArrowRightSLine className=" transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          </div>

                          {record.items.length > 0 && (
                            <Badge variant="secondary">
                              {record.items.length}
                            </Badge>
                          )}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="bg-background rounded-xl ml-3">
                        <SidebarMenuSub className="w-full m-0 p-0 border-none">
                          <ReactSortable
                            list={record.items || []}
                            setList={(newItems) => {
                              const currentCats =
                                useChatStore.getState().chatCategorys;
                              const newCats = currentCats.map((cat) =>
                                cat.id === record.id
                                  ? { ...cat, items: newItems }
                                  : cat,
                              );
                              useChatStore.getState().setChatCategorys(newCats);
                            }}
                            onAdd={async (evt) => {
                              const itemId = evt.item.getAttribute("data-id");
                              if (itemId && typeof evt.newIndex === "number") {
                                await updateMemberSort(
                                  itemId,
                                  record.id,
                                  evt.newIndex,
                                );
                              }
                            }}
                            onUpdate={async (evt) => {
                              const itemId = evt.item.getAttribute("data-id");
                              if (itemId && typeof evt.newIndex === "number") {
                                await updateMemberSort(
                                  itemId,
                                  record.id,
                                  evt.newIndex,
                                );
                              }
                            }}
                            group="nav-room-items"
                            handle=".handle-item"
                            disabled={!isEditMode}
                            animation={200}
                            className="flex flex-col gap-0.5"
                          >
                            {record.items?.map((item) => {
                              return (
                                <div
                                  key={item.id}
                                  className="flex items-center"
                                  data-id={item.id}
                                >
                                  {isEditMode && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="handle-item h-6 w-6 shrink-0 cursor-grab text-muted-foreground mr-1"
                                    >
                                      <RiDraggable className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <NavRoomItem item={item} />
                                  </div>
                                </div>
                              );
                            })}
                          </ReactSortable>
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                  {record.id !== "dm" && record.id !== "group" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <RiMore2Line />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                        side={isMobile ? "bottom" : "bottom"}
                        align="end"
                      >
                        <CreateChatDialog categoryId={record.id}>
                          <DropdownMenuItem
                            onSelect={(e) => e.preventDefault()}
                          >
                            <RiChatAiLine /> Add New Chat
                          </DropdownMenuItem>
                        </CreateChatDialog>
                        <EditCategoryDialog
                          categoryId={record.id}
                          currentName={record.title ?? ""}
                        >
                          <DropdownMenuItem
                            onSelect={(e) => e.preventDefault()}
                          >
                            <RiPencilLine /> Edit Category
                          </DropdownMenuItem>
                        </EditCategoryDialog>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup className=" text-destructive ">
                          <DropdownMenuItem
                            className="hover:bg-destructive/30 hover:text-destructive cursor-pointer"
                            onSelect={async () => {
                              try {
                                await deleteCategory(record.id);
                                useChatStore
                                  .getState()
                                  .removeChatCategory(record.id);
                                // toast.success("Category deleted"); // Optional: add toast if desired
                              } catch (error) {
                                console.error(
                                  "Failed to delete category",
                                  error,
                                );
                                // toast.error("Failed to delete category");
                              }
                            }}
                          >
                            <RiDeleteBinLine />
                            Delete Group
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              );
            })}
          </ReactSortable>
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}
