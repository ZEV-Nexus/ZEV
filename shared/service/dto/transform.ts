import { Schema } from "mongoose";

export function mongooseIdTransform(schema: Schema) {
  schema.set("toJSON", {
    versionKey: false,
    transform: (_, ret) => {
      ret.id = ret?._id?.toString();
      delete ret?._id;
    },
  });
}
