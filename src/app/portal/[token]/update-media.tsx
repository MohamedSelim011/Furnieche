"use client";

import { useState } from "react";
import { PhotoViewer } from "@/components/photo-viewer";
import { imgUrl } from "@/lib/img";
import { SmartImg } from "@/components/smart-img";

type MediaItem = { id: string; url: string; type: "IMAGE" | "VIDEO" | "DOCUMENT"; filename: string | null };

/** Update photos: fast resized thumbnails, tap to open the in-app viewer. */
export function UpdateMedia({ media }: { media: MediaItem[] }) {
  const [openAt, setOpenAt] = useState<number | null>(null);
  const photos = media.filter((m) => m.type === "IMAGE");
  const single = media.length === 1;

  return (
    <>
      <div className={`mt-3 grid gap-1.5 ${single ? "grid-cols-1" : "grid-cols-2"}`}>
        {media.slice(0, 4).map((m, mi) => (
          <div key={m.id} className={`relative rounded-xl overflow-hidden bg-gray-100 ${single ? "h-48" : "h-32"}`}>
            {m.type === "IMAGE" ? (
              <button className="w-full h-full" onClick={() => setOpenAt(photos.findIndex((p) => p.id === m.id))}>
                <SmartImg src={imgUrl("media", m.id, single ? 1080 : 640, m.url)} className="w-full h-full" />
              </button>
            ) : (
              <video src={m.url} className="w-full h-full object-cover" controls preload="metadata" />
            )}
            {mi === 3 && media.length > 4 && (
              <button
                onClick={() => setOpenAt(Math.min(3, photos.length - 1))}
                className="absolute inset-0 bg-black/45 flex items-center justify-center"
              >
                <span className="text-white font-bold text-lg">+{media.length - 4}</span>
              </button>
            )}
          </div>
        ))}
      </div>

      {openAt !== null && openAt >= 0 && (
        <PhotoViewer
          photos={photos.map((p, i) => ({
            id: p.id,
            name: p.filename ?? `Photo ${i + 1}`,
            previewSrc: imgUrl("media", p.id, 320, p.url),
            src: imgUrl("media", p.id, 1600, p.url),
            originalUrl: p.url,
          }))}
          startIndex={openAt}
          onClose={() => setOpenAt(null)}
        />
      )}
    </>
  );
}
