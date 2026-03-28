import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getClientIp, getRequestId, enforceRateLimit } from "@/lib/api-guardrails";
import { STORAGE_BUCKETS, supabaseAdmin } from "@/lib/supabase";

const MAX_RESUME_BYTES = 10 * 1024 * 1024;
const ALLOWED_RESUME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function sanitizeFileName(name: string) {
  const base = name.replace(/\.[^.]+$/, "");
  return base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 50) || "resume";
}

function getExtension(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{1,8}$/.test(fromName)) {
    return fromName;
  }

  if (file.type === "application/pdf") return "pdf";
  if (file.type === "application/msword") return "doc";
  return "docx";
}

export async function POST(req: Request) {
  const requestId = getRequestId(req);

  try {
    const session = await auth();
    const user = session?.user as { id?: string; role?: string } | undefined;

    if (!user?.id || user.role !== "jobseeker") {
      return NextResponse.json({ error: "Unauthorized", requestId }, { status: 401 });
    }

    const ip = getClientIp(req);
    const rate = enforceRateLimit({
      key: `upload:resume:${user.id}:${ip}`,
      maxRequests: 20,
      windowMs: 10 * 60 * 1000,
    });

    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many upload attempts", requestId },
        {
          status: 429,
          headers: {
            "x-request-id": requestId,
            "x-ratelimit-remaining": String(rate.remaining),
            "x-ratelimit-reset": String(rate.resetInSeconds),
          },
        }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required", requestId }, { status: 400 });
    }

    if (!ALLOWED_RESUME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type. Use PDF, DOC, or DOCX.", requestId },
        { status: 400 }
      );
    }

    if (file.size <= 0 || file.size > MAX_RESUME_BYTES) {
      return NextResponse.json(
        { error: "File is too large. Maximum size is 10MB.", requestId },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const extension = getExtension(file);
    const safeName = sanitizeFileName(file.name);
    const path = `${user.id}/${Date.now()}-${safeName}.${extension}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKETS.resumes)
      .upload(path, bytes, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Resume upload error:", { requestId, uploadError });
      return NextResponse.json({ error: "Failed to upload resume", requestId }, { status: 500 });
    }

    const { data } = supabaseAdmin.storage.from(STORAGE_BUCKETS.resumes).getPublicUrl(path);

    return NextResponse.json(
      {
        message: "Upload successful",
        url: data.publicUrl,
        bucket: STORAGE_BUCKETS.resumes,
        path,
        requestId,
      },
      {
        headers: {
          "x-request-id": requestId,
          "x-ratelimit-remaining": String(rate.remaining),
          "x-ratelimit-reset": String(rate.resetInSeconds),
        },
      }
    );
  } catch (error) {
    console.error("Resume upload route error:", { requestId, error });
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
  }
}
