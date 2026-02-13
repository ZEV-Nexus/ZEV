import ZEVWelcomeEmail from "@/shared/components/email/welcome-email";
import resend from "@/shared/lib/resend";
export default async function sendWelcomeEmail(
  nickname: string,
  email: string,
) {
  try {
    const response = await resend.emails.send({
      from: "ZEV <noreply@2026.yuzen.dev>",
      to: email,
      subject: `Welcome to ZEV, ${nickname}!`,
      react: <ZEVWelcomeEmail name={nickname} />,
    });
    return response;
  } catch (error) {
    console.error("Error sending welcome email:", error);
    throw new Error("Failed to send welcome email");
  }
}
