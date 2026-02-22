import crypto from "crypto";

const algorithm = "aes-256-gcm";
const KEY = Buffer.from(process.env.AI_KEY_ENCRYPTION_SECRET!, "base64");

export function encrypt(text: string) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(text, "utf-8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return {
    encrypted: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
}

export function decrypt(payload: { iv: string; content: string; tag: string }) {
  console.log(payload);
  const decipher = crypto.createDecipheriv(
    algorithm,
    KEY,
    Buffer.from(payload.iv, "base64"),
  );

  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.content, "base64")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
