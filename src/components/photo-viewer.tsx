"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewerPhoto = {
  id: string;
  name: string;
  /** Small, fast version shown while the large one loads */
  previewSrc: string;
  /** Large web version (e.g. 1600px) */
  src: string;
  /** The untouched original, for downloading */
  originalUrl: string;
};

/**
 * Full-screen photo gallery: swipe / arrow keys to move between photos,
 * low-res placeholder while the large version loads, download original,
 * and optional per-photo actions (Discuss, Edit with AI, …).
 */
export function PhotoViewer({
  photos,
  startIndex,
  onClose,
  actions,
}: {
  photos: ViewerPhoto[];
  startIndex: number;
  onClose: () => void;
  actions?: (photo: ViewerPhoto) => React.ReactNode;
}) {
  const [index, setIndex] = useState(startIndex);
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const touchX = useRef<number | null>(null);
  const photo = photos[index];

  const go = useCallback(
    (delta: number) => setIndex((i) => Math.min(photos.length - 1, Math.max(0, i + delta))),
    [photos.length]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [go, onClose]);

  // Warm the neighbours so swiping feels instant
  useEffect(() => {
    for (const n of [photos[index + 1], photos[index - 1]]) {
      if (n) new Image().src = n.src;
    }
  }, [index, photos]);

  if (!photo) return null;
  const isLoaded = loaded[photo.id];

  return (
    <div
      className="fixed inset-0 z-[70] bg-black flex flex-col"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}
    >
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 text-white">
        <button
          onClick={onClose}
          aria-label="Close"
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0"
        >
          <X size={20} />
        </button>
        <div className="flex-1 min-w-0 text-center">
          <p className="text-sm font-medium truncate" dir="auto">{photo.name}</p>
          {photos.length > 1 && (
            <p className="text-[11px] text-white/50">
              {index + 1} / {photos.length}
            </p>
          )}
        </div>
        <a
          href={photo.originalUrl}
          download={photo.name}
          target="_blank"
          rel="noreferrer"
          aria-label="Download original"
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0"
        >
          <Download size={18} />
        </a>
      </div>

      {/* Photo */}
      <div className="relative flex-1 min-h-0 flex items-center justify-center px-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={`p-${photo.id}`}
          src={photo.previewSrc}
          alt=""
          aria-hidden
          className={cn(
            "absolute max-w-full max-h-full object-contain blur-md transition-opacity",
            isLoaded ? "opacity-0" : "opacity-100"
          )}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={photo.id}
          src={photo.src}
          alt={photo.name}
          onLoad={() => setLoaded((l) => ({ ...l, [photo.id]: true }))}
          className={cn("relative max-w-full max-h-full object-contain transition-opacity", isLoaded ? "opacity-100" : "opacity-0")}
        />
        {!isLoaded && <Loader2 size={28} className="absolute text-white/70 animate-spin" />}

        {index > 0 && (
          <button
            onClick={() => go(-1)}
            aria-label="Previous photo"
            className="hidden sm:flex absolute left-3 w-11 h-11 rounded-full bg-white/10 text-white items-center justify-center"
          >
            <ChevronLeft size={22} />
          </button>
        )}
        {index < photos.length - 1 && (
          <button
            onClick={() => go(1)}
            aria-label="Next photo"
            className="hidden sm:flex absolute right-3 w-11 h-11 rounded-full bg-white/10 text-white items-center justify-center"
          >
            <ChevronRight size={22} />
          </button>
        )}
      </div>

      {/* Actions + filmstrip */}
      <div className="px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-3">
        {actions && <div className="flex items-center justify-center gap-2">{actions(photo)}</div>}
        {photos.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {photos.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setIndex(i)}
                className={cn(
                  "w-12 h-12 rounded-lg overflow-hidden shrink-0 border-2 transition-opacity",
                  i === index ? "border-white opacity-100" : "border-transparent opacity-50"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.previewSrc} alt="" loading="lazy" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
