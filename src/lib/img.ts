// Client-safe helpers for the image service at /api/img/[kind]/[id].
// It converts iPhone HEIC photos, resizes to the requested width and serves
// compressed WebP, cached on the CDN — never send clients the raw originals.

export type ImgKind = "file" | "media" | "cover" | "edit";

export const IMG_WIDTHS = [160, 320, 640, 1080, 1600, 2048] as const;
export type ImgWidth = (typeof IMG_WIDTHS)[number];

/** Short stable hash of the source URL so a changed photo gets a new cache key. */
function version(src: string): string {
  let h = 5381;
  for (let i = 0; i < src.length; i++) h = ((h << 5) + h + src.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export function imgUrl(kind: ImgKind, id: string, width: ImgWidth, srcUrl?: string | null): string {
  return `/api/img/${kind}/${id}?w=${width}${srcUrl ? `&v=${version(srcUrl)}` : ""}`;
}

/** True when the browser can't show the original directly (e.g. HEIC from iPhones). */
export function isHeic(nameOrUrl: string): boolean {
  return /\.(heic|heif)(\?|$)/i.test(nameOrUrl);
}
