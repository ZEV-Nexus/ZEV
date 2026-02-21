import mongoose, { InferSchemaType, Model } from "mongoose";
import { mongooseIdTransform } from "../service/dto/transform";

const userApiKeySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  apiKey: {
    type: String,
    required: true,
  },
  ivKey: {
    type: String,
    required: true,
  },
  tag: {
    type: String,
    required: true,
  },
  maskedKey: {
    type: String,
    required: true,
  },
  provider: {
    type: String,
    enum: ["openai", "anthropic", "google"],
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export type IUserApiKey = InferSchemaType<typeof userApiKeySchema>;
userApiKeySchema.index({ user: 1 });
userApiKeySchema.plugin(mongooseIdTransform);
const userApiKeyModel = mongoose.models.UserApiKey as Model<IUserApiKey> || mongoose.model("UserApiKey", userApiKeySchema);
export default userApiKeyModel;

