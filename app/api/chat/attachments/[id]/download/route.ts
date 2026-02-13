import { auth } from "@/auth";
import { connectMongoose } from "@/shared/lib/mongoose";
import AttachmentModel from "@/shared/schema/attachment";
import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const attachmentId = params.id;
    if (!attachmentId) {
      return new NextResponse("Missing attachment ID", { status: 400 });
    }

    await connectMongoose();
    const attachment = await AttachmentModel.findById(attachmentId);

    if (!attachment) {
      return new NextResponse("Attachment not found", { status: 404 });
    }

    if (!attachment.publicId) {
      // Fallback if no publicId (old uploads)
      return NextResponse.redirect(attachment.url!);
    }

    // Configure Cloudinary
    cloudinary.config({
      cloud_name:
        process.env.CLOUDINARY_NAME ||
        process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    // Determine resource type
    let resourceType = attachment.resourceType || "image";
    if (!attachment.resourceType) {
      if (attachment.mimeType?.startsWith("video/")) {
        resourceType = "video";
      } else if (!attachment.mimeType?.startsWith("image/")) {
        resourceType = "raw";
      }
    }

    // Generate signed download URL
    // We use "authenticated" type if we assume user set up restricted access,
    // or just standard signed URL which works for everything.
    // User mentioned "401 insecure", maybe refering to direct access.
    // Safest for "secure download" is to generate a URL with a short expiry (though Cloudinary signed URLs usually rely on secret).

    // Note: If the image was uploaded as 'upload' (public), signing doesn't restrict access,
    // but it does verify the URL wasn't tampered if we use transformations.
    // Typically "secure" means `type: "authenticated"` or `type: "private"`.
    // Since I don't control the upload type (it was likely default "upload"),
    // I will just generate a URL that forces download.
    // The "verification" part is checking `session.user` before redirecting.

    // Cloudinary URL generation
    const url = cloudinary.utils.url(attachment.publicId, {
      resource_type: resourceType,
      type: "upload", // Default is upload (public) unless private
      flags: "attachment", // Force download
      sign_url: true, // Sign the URL
      secure: true,
      // transformations if needed
    });

    return NextResponse.redirect(url);
  } catch (error) {
    console.error("Download error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
