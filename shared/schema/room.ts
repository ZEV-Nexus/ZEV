import mongoose, { InferSchemaType, Model } from "mongoose";
import { mongooseIdTransform } from "../service/dto/transform";

const roomSchema = new mongoose.Schema({
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
  name: { type: String, default: "" },
  avatar: { type: String, default: "" },
  roomType: {
    type: String,
    enum: ["dm", "group", "channel", "ai"],
    default: "dm",
  },
  dmKey: { type: String },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
});

export type IRoom = InferSchemaType<typeof roomSchema>;
const roomModel =
  (mongoose.models.Room as Model<IRoom>) ||
  mongoose.model<IRoom>("Room", roomSchema);
roomSchema.plugin(mongooseIdTransform);
export default roomModel;
