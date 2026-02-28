import mongoose, { Model } from "mongoose";
import { mongooseIdTransform } from "../service/dto/transform";

const userOAuthAccountSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  provider: { type: String, enum: ["google", "github"], required: true },
  providerService: { type: String, required: true },

  refreshToken: { type: String, required: true },
  expiresAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

userOAuthAccountSchema.index(
  { provider: 1, providerService: 1 },
  { unique: true },
);

export type IUserOAuthAccount = mongoose.InferSchemaType<
  typeof userOAuthAccountSchema
>;
userOAuthAccountSchema.plugin(mongooseIdTransform);
const userOAuthAccountModel =
  (mongoose.models.UserOAuthAccount as Model<IUserOAuthAccount>) ||
  mongoose.model<IUserOAuthAccount>("UserOAuthAccount", userOAuthAccountSchema);
export default userOAuthAccountModel;
