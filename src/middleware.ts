import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Only protect /dashboard routes
  if (req.nextUrl.pathname.startsWith("/dashboard")) {
    const session = await getIronSession<SessionData>(req, res, sessionOptions);

    if (!session.userId) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  return res;
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
