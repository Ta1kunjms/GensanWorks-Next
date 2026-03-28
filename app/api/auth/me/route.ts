import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRequestId } from "@/lib/api-guardrails";

type SessionUser = {
  id?: string;
  email?: string | null;
  name?: string | null;
  role?: string;
  image?: string | null;
};

export async function GET(req: Request) {
  const requestId = getRequestId(req);

  try {
    const session = await auth();
    const user = (session?.user as SessionUser | undefined) ?? null;

    if (!user?.id || !user.role) {
      return NextResponse.json({ error: "Unauthorized", requestId }, { status: 401 });
    }

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email ?? null,
          name: user.name ?? null,
          role: user.role,
          image: user.image ?? null,
        },
        requestId,
      },
      { headers: { "x-request-id": requestId } }
    );
  } catch (error) {
    console.error("Auth me error:", { requestId, error });
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
  }
}
