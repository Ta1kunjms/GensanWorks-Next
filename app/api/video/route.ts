import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, getClientIp, getRequestId } from "@/lib/api-guardrails";
import { db } from "@/lib/db";

type VideoData = {
  title: string;
  description: string;
  successRate: number;
  videoUrl: string;
  thumbnailUrl: string;
};

type VideoResponse = {
  video: VideoData | null;
};

const fallbackVideo: VideoResponse = {
  video: {
    title: "Empowering GenSan's Workforce Since 1999",
    description: "Learn how PESO General Santos City has been connecting talent with opportunity for over two decades, creating sustainable employment and driving economic growth in our community.",
    successRate: 95,
    videoUrl: "/about", // Fallback to about page if no video
    thumbnailUrl: "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1600&q=80",
  }
};

export async function GET(request: NextRequest) {
  const clientIp = getClientIp(request);
  const requestId = getRequestId(request);
  const rateLimit = enforceRateLimit({
    key: `video:${clientIp}`,
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
    // Try to fetch from video_content table (assuming it exists)
    const { data: videoData, error } = await db
      .from("video_content")
      .select("title, description, success_rate, video_url, thumbnail_url")
      .order("created_at", { ascending: false })
      .limit(1);

    if (error || !videoData || videoData.length === 0) {
      // Return fallback data if no data in table
      return NextResponse.json(fallbackVideo, {
        headers: {
          "X-Request-ID": requestId,
          "X-RateLimit-Remaining": String(rateLimit.remaining),
          "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
          "Cache-Control": "public, max-age=600, s-maxage=600, stale-while-revalidate=3600",
        },
      });
    }

    // Transform data to match expected format
    const video: VideoData = {
      title: videoData[0]?.title ?? (fallbackVideo.video?.title ?? ""),
      description: videoData[0]?.description ?? (fallbackVideo.video?.description ?? ""),
      successRate: videoData[0]?.success_rate ?? (fallbackVideo.video?.successRate ?? 0),
      videoUrl: videoData[0]?.video_url ?? (fallbackVideo.video?.videoUrl ?? ""),
      thumbnailUrl: videoData[0]?.thumbnail_url ?? (fallbackVideo.video?.thumbnailUrl ?? "")
    };

    return NextResponse.json({ video }, {
      headers: {
        "X-Request-ID": requestId,
        "X-RateLimit-Remaining": String(rateLimit.remaining),
        "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
        "Cache-Control": "public, max-age=600, s-maxage=600, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    console.error("[GET /api/video] Failed:", error);
    return NextResponse.json(fallbackVideo, {
      headers: {
        "X-Request-ID": requestId,
        "X-RateLimit-Remaining": String(rateLimit.remaining),
        "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
        "Cache-Control": "public, max-age=600, s-maxage=600, stale-while-revalidate=3600",
      },
    });
  }
}