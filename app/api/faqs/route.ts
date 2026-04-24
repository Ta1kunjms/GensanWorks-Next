import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, getClientIp, getRequestId } from "@/lib/api-guardrails";
import { db } from "@/lib/db";

type FAQ = {
  question: string;
  answer: string;
};

type FAQsResponse = {
  faqs: FAQ[];
};

const fallbackFAQs: FAQsResponse = {
  faqs: [
    {
      question: "How do I register as a jobseeker on GensanWorks?",
      answer: "Click on 'Sign Up' or 'Get Started' button, fill in your personal information, upload your resume, and complete your profile."
    },
    {
      question: "Is there a fee to use GensanWorks?",
      answer: "No, GensanWorks is completely free for jobseekers."
    },
    {
      question: "How can employers post job vacancies?",
      answer: "Employers need to register for an employer account, verify their company information with PESO."
    },
    {
      question: "What documents do I need to upload?",
      answer: "At minimum, upload your resume/CV. Additional documents will strengthen your profile."
    },
    {
      question: "How does the AI-powered job matching system work?",
      answer: "Our intelligent matching system analyzes your skills, experience, and preferences."
    },
    {
      question: "Can I apply for jobs outside General Santos City?",
      answer: "Yes! Our platform features jobs from across SOCCSKSARGEN region and nationwide."
    },
    {
      question: "How long does it take to get hired?",
      answer: "Most candidates receive interview invitation within 48 hours of application."
    },
    {
      question: "What makes GensanWorks different from other job platforms?",
      answer: "GensanWorks is the official PESO platform, all employers and jobs are verified by the government."
    }
  ]
};

export async function GET(request: NextRequest) {
  const clientIp = getClientIp(request);
  const requestId = getRequestId(request);
  const rateLimit = enforceRateLimit({
    key: `faqs:${clientIp}`,
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
    // Try to fetch from faqs table
    const { data: faqsData, error } = await db
      .from("faqs")
      .select("question, answer")
      .order("id", { ascending: true });

    if (error || !faqsData || faqsData.length === 0) {
      // Return fallback data if no data in table
      return NextResponse.json(fallbackFAQs, {
        headers: {
          "X-Request-ID": requestId,
          "X-RateLimit-Remaining": String(rateLimit.remaining),
          "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
          "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
        },
      });
    }

    // Transform data to match expected format
    const faqs: FAQ[] = faqsData.map((faq: any) => ({
      question: faq.question,
      answer: faq.answer
    }));

    return NextResponse.json({ faqs }, {
      headers: {
        "X-Request-ID": requestId,
        "X-RateLimit-Remaining": String(rateLimit.remaining),
        "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
        "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("[GET /api/faqs] Failed:", error);
    return NextResponse.json(fallbackFAQs, {
      headers: {
        "X-Request-ID": requestId,
        "X-RateLimit-Remaining": String(rateLimit.remaining),
        "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
        "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
      },
    });
  }
}