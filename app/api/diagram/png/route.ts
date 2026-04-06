import { NextResponse } from "next/server";
import sharp from "sharp";
import { z } from "zod";
import { ensureAuthenticated } from "@/lib/legacy-compat";

const diagramPngSchema = z
  .object({
    svg: z.string().min(1).max(5_000_000),
    scale: z.number().optional(),
    fileName: z.string().optional(),
  })
  .strict();

function sanitizeFilename(input?: string) {
  return (input || "diagram")
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

export async function POST(req: Request) {
  try {
    const authResult = await ensureAuthenticated(req);
    if (authResult.unauthorizedResponse) return authResult.unauthorizedResponse;

    const body = diagramPngSchema.parse(await req.json());
    const scale = Math.min(8, Math.max(1, body.scale ?? 2));
    const density = 72 * scale;

    const pngBuffer = await sharp(Buffer.from(body.svg, "utf8"), { density })
      .flatten({ background: "#ffffff" })
      .png()
      .toBuffer();

    const safeName = sanitizeFilename(body.fileName);

    return new NextResponse(new Uint8Array(pngBuffer), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename=\"${safeName || "diagram"}.png\"`,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issue = error.issues[0];
      return NextResponse.json(
        {
          error: issue?.message || "Invalid request",
          field: issue?.path?.[0],
        },
        { status: 400 }
      );
    }

    console.error("[POST /api/diagram/png] Failed:", error);
    return NextResponse.json({ error: "Failed to render diagram PNG" }, { status: 500 });
  }
}
