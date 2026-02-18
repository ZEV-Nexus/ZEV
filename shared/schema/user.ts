import mongoose, { InferSchemaType, Model } from "mongoose";
import { mongooseIdTransform } from "../service/dto/transform";
const UserProfileSchema = new mongoose.Schema({
  userId: { type: String, unique: true },
  username: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
  },
  nickname: String,
  email: { type: String, unique: true },
  password: String,
  bio: String,
  provider: String,
  avatar: String,
  githubUsername: { type: String, default: "" },
  emailVerified: { type: Boolean, default: false, required: true },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
});
export type IUser = InferSchemaType<typeof UserProfileSchema>;
const userModel =
  (mongoose.models.User as Model<IUser>) ||
  mongoose.model<IUser>("User", UserProfileSchema);
UserProfileSchema.plugin(mongooseIdTransform);
export default userModel;
