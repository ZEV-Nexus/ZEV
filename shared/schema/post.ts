import mongoose, { InferSchemaType, Model } from "mongoose";
import { mongooseIdTransform } from "../service/dto/transform";

const postSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true },
  images: [{ type: String }],
  // GitHub project link
  githubRepo: {
    owner: String,
    repo: String,
    url: String,
    description: String,
    stars: Number,
    language: String,
    forks: Number,
  },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  commentCount: { type: Number, default: 0 },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: Date,
  deletedAt: Date,
});

postSchema.index({ createdAt: -1 });
postSchema.index({ author: 1, createdAt: -1 });

export type IPost = InferSchemaType<typeof postSchema>;
const postModel =
  (mongoose.models.Post as Model<IPost>) ||
  mongoose.model<IPost>("Post", postSchema);
postSchema.plugin(mongooseIdTransform);
export default postModel;
