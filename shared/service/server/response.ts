import { NextResponse } from "next/server";

export function apiResponse({
  ok = true,
  data,
  message,
  status = 200,
  error,
}: {
  ok?: boolean;
  data?: unknown;
  message?: string;
  status?: number;
  error?: string;
}) {
  return NextResponse.json({ ok, data, message, status, error }, { status });
}
