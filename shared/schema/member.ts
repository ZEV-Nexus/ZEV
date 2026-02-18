import mongoose, { InferSchemaType, Model } from "mongoose";
import { mongooseIdTransform } from "../service/dto/transform";

const memberSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  room: { type: mongoose.Schema.Types.ObjectId, ref: "Room" },
  nickname: String,
  role: {
    type: String,
    enum: ["admin", "owner", "member", "guest"],
    default: "member",
  },
  lastReadMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Message",
    default: null,
  },
  notificationSetting: {
    type: String,
    enum: ["all", "mentions", "mute"],
    default: "all",
  },
  pinned: Boolean,
  roomCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "RoomCategory",
    default: null,
  },
  joinedAt: {
    type: Date,
    default: Date.now(),
  },
});
export type IMember = InferSchemaType<typeof memberSchema>;
const memberModel =
  (mongoose.models.Member as Model<IMember>) ||
  mongoose.model<IMember>("Member", memberSchema);
memberSchema.plugin(mongooseIdTransform);
export default memberModel;
