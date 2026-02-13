import mongoose, { InferSchemaType, Model } from "mongoose";
import { mongooseIdTransform } from "../service/dto/transform";

const messageSchema = new mongoose.Schema({
  room: { type: mongoose.Schema.Types.ObjectId, ref: "Room" },
  member: { type: mongoose.Schema.Types.ObjectId, ref: "Member" },
  content: String,
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  aiRoom: { type: mongoose.Schema.Types.ObjectId, ref: "Room" },
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
  editedAt: Date,
  deletedAt: Date,
  attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Attachment" }],
});
export type IMessage = InferSchemaType<typeof messageSchema>;
const messageModel =
  (mongoose.models.Message as Model<IMessage>) ||
  mongoose.model<IMessage>("Message", messageSchema);
messageSchema.plugin(mongooseIdTransform);
export default messageModel;
