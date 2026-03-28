import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isEmailVerified } from "@/lib/auth-account-tokens";
import { getRequestId } from "@/lib/api-guardrails";

type SessionUser = {
  id?: string;
  email?: string | null;
  role?: string;
};

export async function GET(req: Request) {
  const requestId = getRequestId(req);

  try {
    const session = await auth();
    const user = (session?.user as SessionUser | undefined) ?? null;

    if (!user?.id || !user.role || !user.email) {
      return NextResponse.json({ error: "Unauthorized", requestId }, { status: 401 });
    }

    if (user.role !== "admin" && user.role !== "employer" && user.role !== "jobseeker") {
      return NextResponse.json({ error: "Unsupported role", requestId }, { status: 400 });
    }

    return NextResponse.json(
      {
        email: user.email,
        verified: await isEmailVerified(user.role, user.id),
        requestId,
      },
      { headers: { "x-request-id": requestId } }
    );
  } catch (error) {
    console.error("Verify email status error:", { requestId, error });
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
  }
}
