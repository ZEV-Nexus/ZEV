import AttachmentModel, { IAttachment } from "@/shared/schema/attachment";

export async function createAttachment(
  attachment: IAttachment,
  messageId: string,
) {
  const att = new AttachmentModel({
    ...attachment,
    message: messageId,
  });
  return await att.save();
}
