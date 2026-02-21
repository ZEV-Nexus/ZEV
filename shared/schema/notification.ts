import mongoose, { InferSchemaType, Model } from "mongoose";
import { mongooseIdTransform } from "../service/dto/transform";

const notificationSchema = new mongoose.Schema({
  /** The user who receives this notification */
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  /** The user who triggered this notification */
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  /** Notification type */
  type: {
    type: String,
    enum: ["room_invite", "post_like", "post_comment"],
    required: true,
  },
  /** Related post (for post_like / post_comment) */
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post",
    default: null,
  },
  /** Related comment (for post_comment) */
  comment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Comment",
    default: null,
  },
  /** Related room (for room_invite) */
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Room",
    default: null,
  },
  /** Whether the notification has been read */
  read: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, read: 1 });

export type INotification = InferSchemaType<typeof notificationSchema>;
const notificationModel =
  (mongoose.models.Notification as Model<INotification>) ||
  mongoose.model<INotification>("Notification", notificationSchema);
notificationSchema.plugin(mongooseIdTransform);
export default notificationModel;
