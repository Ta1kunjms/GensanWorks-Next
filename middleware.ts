import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

type Role = "admin" | "employer" | "jobseeker";

function dashboardPath(role: Role): string {
  if (role === "admin") return "/admin/dashboard";
  if (role === "employer") return "/employer/dashboard";
  return "/jobseeker/dashboard";
}

function loginPathForRole(role: Role): string {
  if (role === "admin") return "/login?role=admin";
  return `/login?role=${role}`;
}

function requiredRoleForPath(pathname: string): Role | null {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/employer")) return "employer";
  if (pathname.startsWith("/jobseeker")) return "jobseeker";
  return null;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const roleParam = req.nextUrl.searchParams.get("role");

  if (pathname === "/login" && roleParam === "admin") {
    return NextResponse.redirect(new URL("/login/admin", req.url));
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!authSecret) {
    const message =
      "Missing auth secret. Set AUTH_SECRET or NEXTAUTH_SECRET before serving protected routes.";
    if (process.env.NODE_ENV === "production") {
      throw new Error(message);
    }
    console.warn(message);
  }

  const token = authSecret ? await getToken({ req, secret: authSecret }) : null;
  const tokenRole = token?.role as Role | undefined;
  const requestedRole: Role | null =
    roleParam === "admin" || roleParam === "employer" || roleParam === "jobseeker"
      ? roleParam
      : null;

  const requiredRole = requiredRoleForPath(pathname);

  if (requiredRole && !tokenRole) {
    return NextResponse.redirect(new URL(loginPathForRole(requiredRole), req.url));
  }

  if (requiredRole && tokenRole && tokenRole !== requiredRole) {
    return NextResponse.redirect(new URL(dashboardPath(tokenRole), req.url));
  }

  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/signup");
  const isAdminRequestPage = pathname === "/signup/admin-request";
  const isRoleSwitchLogin =
    (pathname === "/login" &&
      requestedRole !== null &&
      tokenRole !== undefined &&
      requestedRole !== tokenRole) ||
    (pathname === "/login/admin" && tokenRole !== undefined && tokenRole !== "admin");

  if (isAuthPage && tokenRole && !isRoleSwitchLogin && !isAdminRequestPage) {
    return NextResponse.redirect(new URL(dashboardPath(tokenRole), req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/employer/:path*", "/jobseeker/:path*", "/login/:path*", "/signup/:path*"],
};
