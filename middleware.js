import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = () =>
  new TextEncoder().encode(process.env.SESSION_SECRET || "dev-secret-change-me");

function homeFor(role) {
  if (role === "production") return "/production";
  if (role === "staff") return "/jobs";
  return "/";
}

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("npc_session")?.value;
  let session = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, secret());
      session = payload;
    } catch {}
  }

  if (pathname === "/login") {
    return session
      ? NextResponse.redirect(new URL(homeFor(session.role), req.url))
      : NextResponse.next();
  }
  if (!session) return NextResponse.redirect(new URL("/login", req.url));

  const role = session.role || "staff";
  // Production team can only open the Production section
  if (role === "production" && !pathname.startsWith("/production")) {
    return NextResponse.redirect(new URL("/production", req.url));
  }
  // Dashboard is owner/manager only
  if (pathname === "/" && !["owner", "manager"].includes(role)) {
    return NextResponse.redirect(new URL(homeFor(role), req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/jobs/:path*", "/enquiries", "/customers", "/production", "/login"],
};
