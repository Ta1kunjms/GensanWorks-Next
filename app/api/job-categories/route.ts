import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, getClientIp, getRequestId } from "@/lib/api-guardrails";
import { db } from "@/lib/db";

type JobCategory = {
  name: string;
  category: string;
  jobs: string;
  icon: string; // This would map to lucide icon names
  color: string;
  iconColor: string;
  border: string;
};

type JobCategoriesResponse = {
  categories: JobCategory[];
};

const fallbackJobCategories: JobCategoriesResponse = {
  categories: [
    {
      name: "Technology & IT",
      category: "technology",
      jobs: "2,341 jobs available",
      icon: "Code",
      color: "bg-blue-50 hover:bg-blue-100",
      iconColor: "text-blue-600",
      border: "hover:border-blue-200",
    },
    {
      name: "Healthcare",
      category: "healthcare",
      jobs: "1,876 jobs available",
      icon: "Stethoscope",
      color: "bg-green-50 hover:bg-green-100",
      iconColor: "text-green-600",
      border: "hover:border-green-200",
    },
    {
      name: "Education",
      category: "education",
      jobs: "1,432 jobs available",
      icon: "GraduationCap",
      color: "bg-purple-50 hover:bg-purple-100",
      iconColor: "text-purple-600",
      border: "hover:border-purple-200",
    },
    {
      name: "Engineering",
      category: "engineering",
      jobs: "1,098 jobs available",
      icon: "Wrench",
      color: "bg-amber-50 hover:bg-amber-100",
      iconColor: "text-amber-600",
      border: "hover:border-amber-200",
    },
    {
      name: "Customer Service",
      category: "customer-service",
      jobs: "987 jobs available",
      icon: "HeadphonesIcon",
      color: "bg-pink-50 hover:bg-pink-100",
      iconColor: "text-pink-600",
      border: "hover:border-pink-200",
    },
    {
      name: "Sales & Marketing",
      category: "sales",
      jobs: "1,654 jobs available",
      icon: "TrendingUp",
      color: "bg-cyan-50 hover:bg-cyan-100",
      iconColor: "text-cyan-600",
      border: "hover:border-cyan-200",
    },
    {
      name: "Admin & Office",
      category: "admin",
      jobs: "1,234 jobs available",
      icon: "FileText",
      color: "bg-indigo-50 hover:bg-indigo-100",
      iconColor: "text-indigo-600",
      border: "hover:border-indigo-200",
    },
    {
      name: "All Categories",
      category: "all",
      jobs: "10,000+ jobs available",
      icon: "Search",
      color: "bg-slate-100 hover:bg-slate-200",
      iconColor: "text-slate-600",
      border: "hover:border-slate-400",
    }
  ]
};

export async function GET(request: NextRequest) {
  const clientIp = getClientIp(request);
  const requestId = getRequestId(request);
  const rateLimit = enforceRateLimit({
    key: `job-categories:${clientIp}`,
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
    // Try to fetch from job_categories table
    const { data: categoriesData, error } = await db
      .from("job_categories")
      .select("name, category, jobs, icon, color, icon_color, border")
      .order("name", { ascending: true });

    if (error || !categoriesData || categoriesData.length === 0) {
      // Return fallback data if no data in table
      return NextResponse.json(fallbackJobCategories, {
        headers: {
          "X-Request-ID": requestId,
          "X-RateLimit-Remaining": String(rateLimit.remaining),
          "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
          "Cache-Control": "public, max-age=600, s-maxage=600, stale-while-revalidate=3600",
        },
      });
    }

    // Transform data to match expected format
    const categories: JobCategory[] = categoriesData.map((category: any) => ({
      name: category.name,
      category: category.category,
      jobs: category.jobs,
      icon: category.icon,
      color: category.color,
      iconColor: category.icon_color,
      border: category.border
    }));

    return NextResponse.json({ categories }, {
      headers: {
        "X-Request-ID": requestId,
        "X-RateLimit-Remaining": String(rateLimit.remaining),
        "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
        "Cache-Control": "public, max-age=600, s-maxage=600, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    console.error("[GET /api/job-categories] Failed:", error);
    return NextResponse.json(fallbackJobCategories, {
      headers: {
        "X-Request-ID": requestId,
        "X-RateLimit-Remaining": String(rateLimit.remaining),
        "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
        "Cache-Control": "public, max-age=600, s-maxage=600, stale-while-revalidate=3600",
      },
    });
  }
}