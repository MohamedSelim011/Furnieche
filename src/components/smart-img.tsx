"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Image for the photo grid/thumbnails: shimmer while loading, one automatic
 * retry, then a neutral placeholder — never the browser's broken-image icon
 * with the file name spilling out.
 */
export function SmartImg({
  src,
  alt = "",
  className,
  loading = "lazy",
}: {
  src: string;
  alt?: string;
  className?: string;
  loading?: "lazy" | "eager";
}) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<"loading" | "loaded" | "failed">("loading");

  const url = attempt === 0 ? src : `${src}${src.includes("?") ? "&" : "?"}retry=${attempt}`;

  return (
    <span className={cn("relative block overflow-hidden bg-gray-100", className)}>
      {state === "loading" && <span className="absolute inset-0 animate-pulse bg-gray-200/70" />}
      {state === "failed" ? (
        <span className="absolute inset-0 flex items-center justify-center text-gray-300">
          <ImageOff size={20} />
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={url}
          src={url}
          alt={alt}
          loading={loading}
          decoding="async"
          onLoad={() => setState("loaded")}
          onError={() => {
            if (attempt === 0) {
              setTimeout(() => setAttempt(1), 1500);
            } else {
              setState("failed");
            }
          }}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300",
            state === "loaded" ? "opacity-100" : "opacity-0"
          )}
        />
      )}
    </span>
  );
}
