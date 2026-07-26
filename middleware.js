import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = () =>
  new TextEncoder().encode(process.env.SESSION_SECRET || "dev-secret-change-me");

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("npc_session")?.value;
  let authed = false;
  if (token) {
    try {
      await jwtVerify(token, secret());
      authed = true;
    } catch {}
  }

  if (pathname === "/login") {
    return authed ? NextResponse.redirect(new URL("/", req.url)) : NextResponse.next();
  }
  if (!authed) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/order/:path*", "/login"],
};
