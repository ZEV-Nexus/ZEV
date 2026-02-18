import mongoose, { InferSchemaType, Model } from "mongoose";
import { mongooseIdTransform } from "../service/dto/transform";

const commentSchema = new mongoose.Schema({
  post: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  deletedAt: Date,
});

commentSchema.index({ post: 1, createdAt: -1 });

export type IComment = InferSchemaType<typeof commentSchema>;
const commentModel =
  (mongoose.models.Comment as Model<IComment>) ||
  mongoose.model<IComment>("Comment", commentSchema);
commentSchema.plugin(mongooseIdTransform);
export default commentModel;
