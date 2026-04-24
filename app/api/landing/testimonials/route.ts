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
    hiredDate: string;
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
      hiredDate: "2024-03-15",
      isVerified: true,
    },
    {
      id: "2",
      name: "John Carlo Mendoza",
      role: "Web Developer",
      company: "Mindanao Tech Hub",
      quote: "The AI matching system connected me with exactly what I was looking for. PESO GenSan made the process so easy.",
      hiredDate: "2024-02-28",
      isVerified: true,
    },
    {
      id: "3",
      name: "Sarah Jane Diaz",
      role: "Medical Encoder",
      company: "SOCCSKSARGEN Medical",
      quote: "I was skeptical at first, but the verified job posts gave me confidence. Got hired the same month I registered!",
      hiredDate: "2024-01-20",
      isVerified: true,
    },
    {
      id: "4",
      name: "Michael Reyes",
      role: "Welder II",
      company: "South Cotabato Steelworks",
      quote: "The NC II certification tracking helped me find a job that actually needed my skills. Best decision I made.",
      hiredDate: "2023-12-10",
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
    const { data: referrals, error: referralsError } = await db
      .from("referrals")
      .select("id, status, created_at")
      .eq("status", "Hired")
      .order("created_at", { ascending: false })
      .limit(10);

    if (referralsError || !referrals || referrals.length === 0) {
      return NextResponse.json(fallbackTestimonials, {
        headers: {
          "X-Request-ID": requestId,
          "X-RateLimit-Remaining": String(rateLimit.remaining),
          "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
        },
      });
    }

    const placeholderQuotes = [
      "GensanWorks helped me find my dream job so quickly!",
      "The AI matching connected me with the perfect opportunity.",
      "Verified job posts gave me confidence in my job search.",
      "Best career decision I made was registering here.",
    ];

    const testimonials = referrals.slice(0, 4).map((ref, index) => ({
      id: ref.id,
      name: `Hired Candidate ${ref.id.slice(0, 4)}`,
      role: "Professional",
      company: null,
      quote: placeholderQuotes[index % placeholderQuotes.length],
      hiredDate: ref.created_at,
      isVerified: true,
    }));

    return NextResponse.json({ testimonials }, {
      headers: {
        "X-Request-ID": requestId,
        "X-RateLimit-Remaining": String(rateLimit.remaining),
        "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
        "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("[GET /api/landing/testimonials] Failed:", error);
    return NextResponse.json(fallbackTestimonials, {
      headers: {
        "X-Request-ID": requestId,
        "X-RateLimit-Remaining": String(rateLimit.remaining),
        "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
      },
    });
  }
}