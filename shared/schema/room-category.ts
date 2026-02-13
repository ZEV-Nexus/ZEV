import mongoose, { InferSchemaType, Model } from "mongoose";
import { mongooseIdTransform } from "../service/dto/transform";

const roomCategorySchema = new mongoose.Schema({
  index: { type: Number, required: true },
  title: String,

  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  createdAt: {
    type: Date,
    default: Date.now(),
  },
});
roomCategorySchema.index({ user: 1, index: 1 }, { unique: true });
roomCategorySchema.plugin(mongooseIdTransform);
export type IRoomCategory = InferSchemaType<typeof roomCategorySchema>;
const roomCategoryModel =
  (mongoose.models.RoomCategory as Model<IRoomCategory>) ||
  mongoose.model<IRoomCategory>("RoomCategory", roomCategorySchema);

export default roomCategoryModel;
