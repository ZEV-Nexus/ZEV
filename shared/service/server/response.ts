import { NextResponse } from "next/server";

export function apiResponse({
  ok = true,
  data,
  message,
  status = 200,
}: {
  ok?: boolean;
  data?: any;
  message?: string;
  status?: number;
}) {
  return NextResponse.json({ ok, data, message }, { status });
}
