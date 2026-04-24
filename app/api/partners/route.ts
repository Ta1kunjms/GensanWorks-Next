import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, getClientIp, getRequestId } from "@/lib/api-guardrails";
import { db } from "@/lib/db";

type Partner = {
  name: string;
  tagline: string;
  icon: string; // This would map to lucide icon names
};

type PartnersResponse = {
  partners: Partner[];
};

type TrustSignal = {
  title: string;
  description: string;
  icon: string; // This would map to lucide icon names
  accent: string;
};

type TrustSignalsResponse = {
  trustSignals: TrustSignal[];
};

const fallbackPartners: PartnersResponse = {
  partners: [
    { name: "General Milling Corp", tagline: "Food Manufacturing", icon: "Building2" },
    { name: "SM City General Santos", tagline: "Retail & Lifestyle", icon: "Briefcase" },
    { name: "Dole Philippines", tagline: "Agri & Export", icon: "Globe" },
    { name: "Gaisano Mall", tagline: "Shopping & Leisure", icon: "Star" },
    { name: "Robinsons Place", tagline: "Retail Group", icon: "Target" },
    { name: "KCC Mall", tagline: "Regional Retail", icon: "TrendingUp" },
    { name: "Mindanao Tech Hub", tagline: "Technology Park", icon: "Laptop" },
    { name: "South Cotabato Steelworks", tagline: "Industrial & Steel", icon: "Wrench" },
    { name: "SOCCSKSARGEN Medical", tagline: "Healthcare Network", icon: "Stethoscope" },
    { name: "Pioneer Contact Center", tagline: "BPO & Support", icon: "HeadphonesIcon" },
  ]
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
    key: `partners:${clientIp}`,
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
    // Try to fetch from partners table
    const { data: partnersData, error: partnersError } = await db
      .from("partners")
      .select("name, tagline, icon")
      .order("name", { ascending: true });

    // Try to fetch from trust_signals table
    const { data: trustSignalsData, error: trustSignalsError } = await db
      .from("trust_signals")
      .select("title, description, icon, accent")
      .order("title", { ascending: true });

    // Use fallback data if needed
    const partners: Partner[] = partnersError || !partnersData || partnersData.length === 0 
      ? fallbackPartners.partners 
      : partnersData.map((partner: any) => ({
          name: partner.name,
          tagline: partner.tagline,
          icon: partner.icon
        }));

    const trustSignals: TrustSignal[] = trustSignalsError || !trustSignalsData || trustSignalsData.length === 0 
      ? fallbackTrustSignals.trustSignals 
      : trustSignalsData.map((signal: any) => ({
          title: signal.title,
          description: signal.description,
          icon: signal.icon,
          accent: signal.accent
        }));

    return NextResponse.json({ partners, trustSignals }, {
      headers: {
        "X-Request-ID": requestId,
        "X-RateLimit-Remaining": String(rateLimit.remaining),
        "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
        "Cache-Control": "public, max-age=600, s-maxage=600, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    console.error("[GET /api/partners] Failed:", error);
    return NextResponse.json({ partners: fallbackPartners.partners, trustSignals: fallbackTrustSignals.trustSignals }, {
      headers: {
        "X-Request-ID": requestId,
        "X-RateLimit-Remaining": String(rateLimit.remaining),
        "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
        "Cache-Control": "public, max-age=600, s-maxage=600, stale-while-revalidate=3600",
      },
    });
  }
}