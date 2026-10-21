import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getClientIp, getRequestId, enforceRateLimit } from "@/lib/api-guardrails";
import { supabaseAdmin } from "@/lib/supabase";

// Raster images only (no SVG: it can carry script when served from a public URL),
// with the extension taken from the validated type, never the client file name.
const MAX_LICENSE_BYTES = 5 * 1024 * 1024;
const LICENSE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(req: NextRequest) {
  const requestId = getRequestId(req);

  try {
    const session = await auth();
    const user = session?.user as { id?: string; role?: string } | undefined;

    if (!user?.id || user.role !== "jobseeker") {
      return NextResponse.json({ error: "Unauthorized", requestId }, { status: 401 });
    }

    const rate = enforceRateLimit({
      key: `upload:license:${user.id}:${getClientIp(req)}`,
      maxRequests: 20,
      windowMs: 10 * 60 * 1000,
    });
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many upload attempts", requestId }, { status: 429 });
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided", requestId }, { status: 400 });
    }

    const extension = LICENSE_EXTENSIONS[file.type];
    if (!extension) {
      return NextResponse.json({ error: "Unsupported image type. Use JPG, PNG, or WEBP.", requestId }, { status: 400 });
    }

    if (file.size <= 0 || file.size > MAX_LICENSE_BYTES) {
      return NextResponse.json({ error: "Image is too large. Maximum size is 5MB.", requestId }, { status: 400 });
    }

    const fileBuffer = await file.arrayBuffer();
    const fileName = `license_${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
    const filePath = `${user.id}/${fileName}`;

    const { error } = await supabaseAdmin.storage
      .from("jobseeker-documents")
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error("Storage upload error:", { requestId, message: error.message });
      return NextResponse.json({ error: "Failed to upload file to storage", requestId }, { status: 500 });
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("jobseeker-documents")
      .getPublicUrl(filePath);

    return NextResponse.json({ url: publicUrlData.publicUrl }, { status: 200 });

  } catch (error) {
    console.error("Upload error:", { requestId, error });
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
  }
}
