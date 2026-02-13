import mongoose, { InferSchemaType, Model } from "mongoose";
import { mongooseIdTransform } from "../service/dto/transform";
const attachmentSchema = new mongoose.Schema({
  message: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
  url: String,
  filename: String,
  publicId: String,
  resourceType: String,
  mimeType: String,
  size: Number,
  uploadedAt: {
    type: Date,
    default: Date.now, // fix Date.now() call
  },
});
export type IAttachment = InferSchemaType<typeof attachmentSchema>;
const AttachmentModel =
  (mongoose.models.Attachment as Model<IAttachment>) ||
  mongoose.model<IAttachment>("Attachment", attachmentSchema);
attachmentSchema.plugin(mongooseIdTransform);
export default AttachmentModel;
