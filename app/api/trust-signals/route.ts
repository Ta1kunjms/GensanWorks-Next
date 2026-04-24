import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, getClientIp, getRequestId } from "@/lib/api-guardrails";
import { db } from "@/lib/db";

type TrustSignal = {
  title: string;
  description: string;
  icon: string; // This would map to lucide icon names
  accent: string;
};

type TrustSignalsResponse = {
  trustSignals: TrustSignal[];
};

const fallbackTrustSignals: TrustSignalsResponse = {
  trustSignals: [
    {
      title: "Government Certified",
      description: "Official PESO platform",
      icon: "Shield",
      accent: "bg-blue-50 text-blue-600",
    },
    {
      title: "Data Protected",
      description: "Secure by design",
      icon: "Clock",
      accent: "bg-blue-50 text-blue-600",
    },
    {
      title: "Service Excellence",
      description: "ISO-aligned workflows",
      icon: "Award",
      accent: "bg-slate-100 text-slate-600",
    },
  ]
};

export async function GET(request: NextRequest) {
  const clientIp = getClientIp(request);
  const requestId = getRequestId(request);
  const rateLimit = enforceRateLimit({
    key: `trust-signals:${clientIp}`,
    maxRequests: 60,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Rate limited" },
      {
        status: 429,
        headers: {
          "X-Request-ID": requestId,
          "X-RateLimit-Remaining": String(rateLimit.remaining),
          "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
        },
      }
    );
  }

  try {
    // Try to fetch from trust_signals table
    const { data: trustSignalsData, error } = await db
      .from("trust_signals")
      .select("title, description, icon, accent")
      .order("title", { ascending: true });

    if (error || !trustSignalsData || trustSignalsData.length === 0) {
      // Return fallback data if no data in table
      return NextResponse.json(fallbackTrustSignals, {
        headers: {
          "X-Request-ID": requestId,
          "X-RateLimit-Remaining": String(rateLimit.remaining),
          "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
          "Cache-Control": "public, max-age=600, s-maxage=600, stale-while-revalidate=3600",
        },
      });
    }

    // Transform data to match expected format
    const trustSignals: TrustSignal[] = trustSignalsData.map((signal: any) => ({
      title: signal.title,
      description: signal.description,
      icon: signal.icon,
      accent: signal.accent
    }));

    return NextResponse.json({ trustSignals }, {
      headers: {
        "X-Request-ID": requestId,
        "X-RateLimit-Remaining": String(rateLimit.remaining),
        "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
        "Cache-Control": "public, max-age=600, s-maxage=600, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    console.error("[GET /api/trust-signals] Failed:", error);
    return NextResponse.json(fallbackTrustSignals, {
      headers: {
        "X-Request-ID": requestId,
        "X-RateLimit-Remaining": String(rateLimit.remaining),
        "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
        "Cache-Control": "public, max-age=600, s-maxage=600, stale-while-revalidate=3600",
      },
    });
  }
}