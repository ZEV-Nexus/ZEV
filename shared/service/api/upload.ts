import { fetchApi } from "./fetch";
import { Attachment } from "@/shared/types";

interface SignatureResponse {
  signature: string;
  timestamp: number;
  cloudName: string;
  apiKey: string;
  folder: string;
}

interface CloudinaryResponse {
  secure_url: string;
  bytes: number;
  format: string;
  original_filename: string;
  resource_type: string;
  public_id: string;
}

export async function uploadFileToCloudinary(
  file: File,
): Promise<Partial<Attachment>> {
  // 1. Get Signature
  const response = await fetchApi<SignatureResponse>("upload/signature", {
    method: "POST",
  });

  const sigData = response.data;

  if (!sigData) throw new Error("Failed to get upload signature");

  // 2. Upload to Cloudinary
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", sigData.apiKey);
  formData.append("timestamp", String(sigData.timestamp));
  formData.append("signature", sigData.signature);
  formData.append("folder", sigData.folder);

  const uploadUrl = `https://api.cloudinary.com/v1_1/${sigData.cloudName}/auto/upload`;

  const res = await fetch(uploadUrl, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error?.message || "Upload failed");
  }

  const result: CloudinaryResponse = await res.json();

  return {
    url: result.secure_url,
    filename: file.name,
    mimeType: file.type,
    size: result.bytes,
    publicId: result.public_id,
    resourceType: result.resource_type,
  };
}
