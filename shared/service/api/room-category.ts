import { fetchApi } from "./fetch";
import { RoomCategory } from "@/shared/types";

export const createCategory = async (name: string) => {
  const response = await fetchApi<RoomCategory>(`category`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  return response.data;
};

export const updateMemberSort = async (
  roomId: string,
  categoryId: string,
  index: number,
) => {
  return await fetchApi("category/member-sort", {
    method: "POST",
    body: JSON.stringify({ roomId, categoryId, index }),
  });
};

export const updateCategory = async (categoryId: string, name: string) => {
  const response = await fetchApi<RoomCategory>("category/update", {
    method: "POST",
    body: JSON.stringify({ categoryId, name }),
  });
  return response.data;
};

export const deleteCategory = async (categoryId: string) => {
  return await fetchApi("category/delete", {
    method: "POST",
    body: JSON.stringify({ categoryId }),
  });
};

export const updateCategorySort = async (categoryId: string, index: number) => {
  return await fetchApi("category/sort", {
    method: "POST",
    body: JSON.stringify({ categoryId, index }),
  });
};
