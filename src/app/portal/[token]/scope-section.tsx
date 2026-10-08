"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, FileText, FolderOpen, MessageCircle, Sparkles, Video } from "lucide-react";
import { PhotoViewer, type ViewerPhoto } from "@/components/photo-viewer";
import { imgUrl } from "@/lib/img";
import { cn } from "@/lib/utils";

type File = {
  id: string;
  name: string;
  url: string;
  type: "IMAGE" | "VIDEO" | "DOCUMENT";
  progressPercent: number;
};

type Folder = {
  id: string;
  name: string;
  progressPercent: number;
  files: File[];
  children?: Folder[];
};

function toViewerPhoto(f: File): ViewerPhoto {
  return {
    id: f.id,
    name: f.name,
    previewSrc: imgUrl("file", f.id, 320, f.url),
    src: imgUrl("file", f.id, 1600, f.url),
    originalUrl: f.url,
  };
}

function FileGroup({
  files,
  token,
  onOpenPhoto,
}: {
  files: File[];
  token: string;
  onOpenPhoto: (photos: File[], index: number) => void;
}) {
  const photos = files.filter((f) => f.type === "IMAGE");
  const others = files.filter((f) => f.type !== "IMAGE");

  return (
    <div className="space-y-3">
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5">
          {photos.map((photo, i) => (
            <button
              key={photo.id}
              onClick={() => onOpenPhoto(photos, i)}
              className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 active:scale-[0.98] transition-transform"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imgUrl("file", photo.id, 320, photo.url)}
                alt={photo.name}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
      {others.map((file) => (
        <div key={file.id} className="flex items-center gap-2.5">
          <a
            href={file.url}
            target="_blank"
            rel="noreferrer"
            className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center shrink-0"
          >
            {file.type === "VIDEO" ? <Video size={16} className="text-gray-400" /> : <FileText size={16} className="text-gray-400" />}
          </a>
          <a href={file.url} target="_blank" rel="noreferrer" className="flex-1 min-w-0">
            <span className="block text-xs text-gray-700 truncate" dir="auto">{file.name}</span>
          </a>
          <Link
            href={`/portal/${token}/chat?file=${file.id}`}
            className="shrink-0 flex items-center gap-1 rounded-full bg-brand-50 text-brand-700 px-2.5 py-1.5 text-[11px] font-semibold"
          >
            <MessageCircle size={12} /> Discuss
          </Link>
        </div>
      ))}
    </div>
  );
}

export function ScopeSection({ folders, token }: { folders: Folder[]; token: string }) {
  // Open the folder with the most photos first — that's what clients come to see
  const photoCount = (f: Folder) =>
    f.files.filter((x) => x.type === "IMAGE").length +
    (f.children?.reduce((n, c) => n + c.files.filter((x) => x.type === "IMAGE").length, 0) ?? 0);
  const mostPhotos = folders.reduce<Folder | null>((best, f) => (photoCount(f) > (best ? photoCount(best) : 0) ? f : best), null);
  const [expanded, setExpanded] = useState<string | null>(mostPhotos?.id ?? null);
  const [viewer, setViewer] = useState<{ photos: File[]; index: number } | null>(null);

  const openPhoto = (photos: File[], index: number) => setViewer({ photos, index });

  return (
    <div className="mt-4">
      <h2 className="text-base font-bold text-gray-900 mb-2 px-1">Project photos &amp; files</h2>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100 text-left">
        {folders.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No folders yet.</p>
        ) : (
          folders.map((folder) => {
            const open = expanded === folder.id;
            const count = folder.files.length + (folder.children?.reduce((n, c) => n + c.files.length, 0) ?? 0);
            return (
              <div key={folder.id} className="p-4">
                <button
                  onClick={() => setExpanded(open ? null : folder.id)}
                  className="w-full flex items-center gap-2.5"
                >
                  <span className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                    <FolderOpen size={16} className="text-brand-600" />
                  </span>
                  <span className="flex-1 min-w-0 text-left">
                    <span className="block text-sm font-semibold text-gray-900 truncate">{folder.name}</span>
                    <span className="block text-[11px] text-gray-400">
                      {count} item{count === 1 ? "" : "s"} · {folder.progressPercent}% done
                    </span>
                  </span>
                  <ChevronDown size={18} className={cn("text-gray-400 transition-transform", open && "rotate-180")} />
                </button>

                {open && (
                  <div className="mt-3 space-y-4">
                    {count === 0 && <p className="text-xs text-gray-400">No files yet</p>}
                    {folder.files.length > 0 && <FileGroup files={folder.files} token={token} onOpenPhoto={openPhoto} />}
                    {folder.children?.map((child) =>
                      child.files.length > 0 ? (
                        <div key={child.id}>
                          <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1.5">
                            <FolderOpen size={12} className="text-gray-400" /> {child.name}
                          </p>
                          <FileGroup files={child.files} token={token} onOpenPhoto={openPhoto} />
                        </div>
                      ) : null
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {viewer && (
        <PhotoViewer
          photos={viewer.photos.map(toViewerPhoto)}
          startIndex={viewer.index}
          onClose={() => setViewer(null)}
          actions={(photo) => (
            <>
              <Link
                href={`/portal/${token}/chat?file=${photo.id}`}
                className="flex items-center gap-1.5 rounded-full bg-white text-gray-900 px-4 py-2.5 text-sm font-semibold"
              >
                <MessageCircle size={15} /> Discuss
              </Link>
              <Link
                href={`/portal/${token}/chat?file=${photo.id}&ai=1`}
                className="flex items-center gap-1.5 rounded-full bg-oak-500 text-white px-4 py-2.5 text-sm font-semibold"
              >
                <Sparkles size={15} /> Edit with AI
              </Link>
            </>
          )}
        />
      )}
    </div>
  );
}
