import { NextRequest, NextResponse } from "next/server";

// Wallet auth is client-side (wagmi/RainbowKit).
// Dashboard pages protect themselves via useAccount() hook.
// Middleware just passes all requests through.
export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
