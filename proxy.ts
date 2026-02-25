import { auth as proxy } from "@/auth";
import { NextResponse } from "next/server";
export default proxy((req) => {
  const authPath = req.nextUrl.pathname.startsWith("/auth/");
  const protectedPath = ["/c"];
  if (protectedPath.includes(req.nextUrl.pathname) && !req.auth) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }
  if (authPath && req.auth) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
});
