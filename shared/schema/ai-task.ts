import mongoose from "mongoose";

const aiTaskSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  room: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true },
  type: {
    type: String,
    enum: ["create_schedule", "translate", "attachment_reply"],
    required: true,
  },
  payload: { type: mongoose.Schema.Types.Mixed, required: true },
  confidence: { type: Number, min: 0, max: 1 },
  status: {
    type: String,
    enum: ["pending", "confirmed", "rejected"],
    default: "pending",
  },
  createdAt: { type: Date, default: Date.now },
});

export type IAITask = mongoose.InferSchemaType<typeof aiTaskSchema>;
const aiTaskModel =
  mongoose.models.AITask || mongoose.model<IAITask>("AITask", aiTaskSchema);
export default aiTaskModel;
