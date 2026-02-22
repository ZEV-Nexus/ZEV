import { roomCategoryModel } from "@/shared/schema";

export async function createRoomCategory(userId: string, name: string) {
  const lastCategory = await roomCategoryModel
    .findOne({ user: userId })
    .sort({ index: -1 })
    .select("index");

  const roomCategory = new roomCategoryModel({
    title: name,
    user: userId,
    index: lastCategory ? lastCategory.index + 1 : 0,
  });

  return await roomCategory.save();
}

export async function getRoomCategories(userId: string) {
  return await roomCategoryModel.find({ user: userId }).sort({ index: 1 });
}

export async function updateRoomCategoryIndex(
  categoryId: string,
  index: number,
) {
  return await roomCategoryModel.findByIdAndUpdate(categoryId, { index });
}

export async function updateRoomCategoryTitle(
  categoryId: string,
  title: string,
) {
  return await roomCategoryModel.findByIdAndUpdate(
    categoryId,
    { title },
    { new: true },
  );
}

export async function deleteRoomCategory(categoryId: string) {
  // Delete the category
  await roomCategoryModel.findByIdAndDelete(categoryId);

  // Reset members who were in this category to default (null)
  // This effectively moves them back to "Group" or "Direct Messages" based on logic
  const { memberModel } = await import("@/shared/schema");
  await memberModel.updateMany(
    { roomCategory: categoryId },
    { $set: { roomCategory: null } },
  );

  return true;
}
