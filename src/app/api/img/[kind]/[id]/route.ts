import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import convertHeic from "heic-convert";
import { prisma } from "@/lib/prisma";
import { isStorageUrl } from "@/lib/storage";
import { IMG_WIDTHS, type ImgKind } from "@/lib/img";

export const runtime = "nodejs";
// Run next to Supabase storage (eu-west-1) — downloading originals is the slow part
export const preferredRegion = "dub1";
export const maxDuration = 60;

const CACHE_FOREVER = "public, max-age=31536000, s-maxage=31536000, immutable";

async function sourceUrl(kind: ImgKind, id: string): Promise<string | null> {
  switch (kind) {
    case "file": {
      const f = await prisma.projectFile.findUnique({ where: { id }, select: { url: true, type: true } });
      return f?.type === "IMAGE" ? f.url : null;
    }
    case "media": {
      const m = await prisma.media.findUnique({ where: { id }, select: { url: true, type: true } });
      return m?.type === "IMAGE" ? m.url : null;
    }
    case "cover": {
      const p = await prisma.project.findUnique({ where: { id }, select: { coverUrl: true } });
      return p?.coverUrl ?? null;
    }
    case "edit": {
      const e = await prisma.imageEdit.findUnique({ where: { id }, select: { resultUrl: true } });
      return e?.resultUrl ?? null;
    }
    default:
      return null;
  }
}

/** HEIC/HEIF files start with an ISO-BMFF "ftyp" box naming a HEIF brand. */
function looksLikeHeic(buf: Buffer): boolean {
  if (buf.length < 12 || buf.toString("ascii", 4, 8) !== "ftyp") return false;
  const brand = buf.toString("ascii", 8, 12);
  return ["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"].includes(brand);
}

// GET /api/img/[kind]/[id]?w=320 — resized, web-friendly version of a project photo
export async function GET(req: NextRequest, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  const w = Number(req.nextUrl.searchParams.get("w"));
  if (!(IMG_WIDTHS as readonly number[]).includes(w)) {
    return NextResponse.json({ error: "Unsupported width" }, { status: 400 });
  }

  const src = await sourceUrl(kind as ImgKind, id);
  if (!src || !isStorageUrl(src)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`Source responded ${res.status}`);
    let input: Buffer = Buffer.from(await res.arrayBuffer());

    // sharp can't decode iPhone HEIC (HEVC) — convert it to JPEG first
    if (looksLikeHeic(input)) {
      input = Buffer.from(await convertHeic({ buffer: input, format: "JPEG", quality: 0.92 }));
    }

    const output = await sharp(input, { failOn: "none" })
      .rotate() // respect EXIF orientation
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: w <= 320 ? 72 : 80 })
      .toBuffer();

    return new NextResponse(new Uint8Array(output), {
      headers: { "Content-Type": "image/webp", "Cache-Control": CACHE_FOREVER },
    });
  } catch (err) {
    console.error(`[IMG] ${kind}/${id} w=${w} failed:`, err);
    // Fall back to the original for formats browsers can show; short cache so it retries later
    return NextResponse.redirect(src, { status: 307, headers: { "Cache-Control": "public, max-age=60" } });
  }
}
