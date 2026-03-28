import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getClientIp, enforceRateLimit, getRequestId } from "@/lib/api-guardrails";
import { STORAGE_BUCKETS, supabaseAdmin } from "@/lib/supabase";

const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const ALLOWED_DOCUMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

const documentTypeValues = [
  "srsFormFile",
  "businessPermitFile",
  "bir2303File",
  "doleCertificationFile",
  "companyProfileFile",
] as const;

type DocumentType = (typeof documentTypeValues)[number];

function isDocumentType(value: string): value is DocumentType {
  return (documentTypeValues as readonly string[]).includes(value);
}

function sanitizeFileName(name: string) {
  const base = name.replace(/\.[^.]+$/, "");
  return base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 50) || "document";
}

function getExtension(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{1,8}$/.test(fromName)) {
    return fromName;
  }

  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  return "pdf";
}

export async function POST(req: Request) {
  const requestId = getRequestId(req);

  try {
    const session = await auth();
    const user = session?.user as { id?: string; role?: string } | undefined;

    if (!user?.id || user.role !== "employer") {
      return NextResponse.json({ error: "Unauthorized", requestId }, { status: 401 });
    }

    const ip = getClientIp(req);
    const rate = enforceRateLimit({
      key: `upload:employer-document:${user.id}:${ip}`,
      maxRequests: 30,
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
    const documentTypeRaw = String(formData.get("documentType") ?? "").trim();
    const file = formData.get("file");

    if (!isDocumentType(documentTypeRaw)) {
      return NextResponse.json(
        {
          error: "Invalid document type",
          allowedDocumentTypes: documentTypeValues,
          requestId,
        },
        { status: 400 }
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required", requestId }, { status: 400 });
    }

    if (!ALLOWED_DOCUMENT_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type. Use PDF, JPG, or PNG.", requestId },
        { status: 400 }
      );
    }

    if (file.size <= 0 || file.size > MAX_DOCUMENT_BYTES) {
      return NextResponse.json(
        { error: "File is too large. Maximum size is 10MB.", requestId },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const extension = getExtension(file);
    const safeName = sanitizeFileName(file.name);
    const path = `${user.id}/${documentTypeRaw}/${Date.now()}-${safeName}.${extension}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKETS.employerDocs)
      .upload(path, bytes, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Employer document upload error:", { requestId, uploadError });
      return NextResponse.json({ error: "Failed to upload document", requestId }, { status: 500 });
    }

    const { data } = supabaseAdmin.storage.from(STORAGE_BUCKETS.employerDocs).getPublicUrl(path);

    return NextResponse.json(
      {
        message: "Document uploaded",
        url: data.publicUrl,
        documentType: documentTypeRaw,
        bucket: STORAGE_BUCKETS.employerDocs,
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
    console.error("Employer document upload route error:", { requestId, error });
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
  }
}
