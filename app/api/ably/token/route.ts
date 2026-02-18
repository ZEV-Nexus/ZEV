import { NextResponse } from "next/server";
import Ably from "ably";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const client = new Ably.Rest(process.env.ABLY_API_KEY!);
  const searchParams = new URL(request.url).searchParams;
  const clientId = searchParams.get("clientId");

  if (!clientId) {
    return NextResponse.json(
      { error: "Missing clientId parameter" },
      { status: 400 },
    );
  }

  try {
    const tokenRequestData = await client.auth.createTokenRequest({
      clientId: clientId,
    });
    return NextResponse.json(tokenRequestData);
  } catch (error) {
    console.error("Error creating token request:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
