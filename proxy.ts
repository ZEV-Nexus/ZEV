import { auth as proxy } from "@/auth";
import { NextResponse } from "next/server";
export default proxy((req) => {
  const authPath = req.nextUrl.pathname.startsWith("/auth/");
  const protectedPath = ["/", "/c"];
  if (protectedPath.includes(req.nextUrl.pathname) && !req.auth) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }
  if (authPath && req.auth) {
    return NextResponse.redirect(new URL("/c", req.url));
  }
});
