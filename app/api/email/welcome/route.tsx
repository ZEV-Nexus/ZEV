import { Resend } from "resend";

import { NextRequest, NextResponse } from "next/server";
import { ZEVWelcomeEmail } from "@/shared/components/email/welcome-email";
const resend = new Resend(process.env.NEXT_RESEND_API_KEY!);

export async function POST(request: NextRequest) {
  const { nickname, email } = await request.json();
  const response = await resend.emails.send({
    from: "ZEV <zev@2026.yuzen.dev>",
    to: email,
    subject: `Welcome to ZEV, ${nickname}!`,
    react: <ZEVWelcomeEmail name={nickname} />,
  });

  if (response.error) {
    return NextResponse.json(
      { message: "Failed to send email", error: response.error },
      { status: 500 },
    );
  }
  return NextResponse.json(
    { message: "Email sent successfully", response },
    { status: 200 },
  );
}
