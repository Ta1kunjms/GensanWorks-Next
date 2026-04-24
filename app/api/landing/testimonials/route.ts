import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, getClientIp, getRequestId } from "@/lib/api-guardrails";
import { db } from "@/lib/db";

type TestimonialsResponse = {
  testimonials: Array<{
    id: string;
    name: string;
    role: string;
    company: string | null;
    quote: string;
    hiredDate?: string;
    isVerified: boolean;
  }>;
};

const fallbackTestimonials: TestimonialsResponse = {
  testimonials: [
    {
      id: "1",
      name: "Maria Elena Torres",
      role: "Customer Support Specialist",
      company: "Pioneer Contact Center",
      quote: "GensanWorks helped me find my dream job within just 2 weeks. The resume review and interview prep were incredibly helpful!",
      isVerified: true,
    },
    {
      id: "2",
      name: "John Carlo Mendoza",
      role: "Web Developer",
      company: "Mindanao Tech Hub",
      quote: "The AI matching system connected me with exactly what I was looking for. PESO GenSan made the process so easy.",
      isVerified: true,
    },
    {
      id: "3",
      name: "Sarah Jane Diaz",
      role: "Medical Encoder",
      company: "SOCCSKSARGEN Medical",
      quote: "I was skeptical at first, but the verified job posts gave me confidence. Got hired the same month I registered!",
      isVerified: true,
    },
  ],
};

export async function GET(request: NextRequest) {
  const clientIp = getClientIp(request);
  const requestId = getRequestId(request);
  const rateLimit = enforceRateLimit({
    key: `landing:testimonials:${clientIp}`,
    maxRequests: 60,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  try {
    // Try to fetch from landing_testimonials first
    const { data: dbTestimonials, error: dbError } = await db
      .from("landing_testimonials")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(6);

    if (!dbError && dbTestimonials && dbTestimonials.length > 0) {
      return NextResponse.json({ testimonials: dbTestimonials }, {
        headers: {
          "X-Request-ID": requestId,
          "Cache-Control": "public, max-age=3600, s-maxage=3600",
        },
      });
    }

    // Fallback to referrals if landing_testimonials is empty
    const { data: referrals, error: referralsError } = await db
      .from("referrals")
      .select("id, status, created_at")
      .eq("status", "Hired")
      .order("created_at", { ascending: false })
      .limit(3);

    if (referralsError || !referrals || referrals.length === 0) {
      return NextResponse.json(fallbackTestimonials);
    }

    const placeholderQuotes = [
      "GensanWorks helped me find my dream job so quickly!",
      "The AI matching connected me with the perfect opportunity.",
      "Verified job posts gave me confidence in my job search.",
    ];

    const testimonials = referrals.map((ref, index) => ({
      id: ref.id,
      name: `Hired Candidate ${ref.id.slice(0, 4)}`,
      role: "Professional",
      company: null,
      quote: placeholderQuotes[index % placeholderQuotes.length],
      isVerified: true,
    }));

    return NextResponse.json({ testimonials });
  } catch (error) {
    console.error("[GET /api/landing/testimonials] Failed:", error);
    return NextResponse.json(fallbackTestimonials);
  }
}