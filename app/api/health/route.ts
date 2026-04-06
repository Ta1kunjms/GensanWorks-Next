import { NextResponse } from "next/server";
import { getRequestId } from "@/lib/api-guardrails";

export async function GET(req: Request) {
  const requestId = getRequestId(req);

  return NextResponse.json(
    {
      status: "ok",
    },
    {
      headers: {
        "X-Request-ID": requestId,
      },
    }
  );
}
