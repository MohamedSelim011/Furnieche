"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, FolderOpen, FileText, Image as ImageIcon, MessageCircle, Sparkles, Video } from "lucide-react";

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

function fileIcon(type: File["type"]) {
  if (type === "IMAGE") return <ImageIcon size={13} className="text-gray-400 shrink-0" />;
  if (type === "VIDEO") return <Video size={13} className="text-gray-400 shrink-0" />;
  return <FileText size={13} className="text-gray-400 shrink-0" />;
}

function FileRow({ file, token }: { file: File; token: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <a href={file.url} target="_blank" rel="noreferrer" className="shrink-0">
        {file.type === "IMAGE" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={file.url} alt="" className="w-11 h-11 rounded-lg object-cover bg-gray-100" />
        ) : (
          <span className="w-11 h-11 rounded-lg bg-gray-50 flex items-center justify-center">{fileIcon(file.type)}</span>
        )}
      </a>
      <a href={file.url} target="_blank" rel="noreferrer" className="flex-1 min-w-0">
        <span className="block text-xs text-gray-700 truncate">{file.name}</span>
        <span className="text-[11px] text-gray-400">{file.progressPercent}%</span>
      </a>
      <Link
        href={`/portal/${token}/chat?file=${file.id}`}
        className="shrink-0 flex items-center gap-1 rounded-full bg-brand-50 text-brand-700 px-2.5 py-1.5 text-[11px] font-semibold"
      >
        <MessageCircle size={12} /> Discuss
      </Link>
      {file.type === "IMAGE" && (
        <Link
          href={`/portal/${token}/chat?file=${file.id}&ai=1`}
          aria-label="Edit with AI"
          className="shrink-0 flex items-center gap-1 rounded-full bg-oak-50 text-oak-700 border border-oak-100 px-2 py-1.5 text-[11px] font-semibold"
        >
          <Sparkles size={12} /> AI
        </Link>
      )}
    </div>
  );
}

export function ScopeSection({ folders, token }: { folders: Folder[]; token: string }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="mt-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full bg-gray-900 text-white rounded-2xl py-3 text-sm font-semibold flex items-center justify-center gap-2"
      >
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        View Project Folders
      </button>

      {open && (
        <div className="mt-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-left">
          {folders.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-2">No folders defined for this project.</p>
          ) : (
            <div className="space-y-3">
              {folders.map((folder) => (
                <div key={folder.id}>
                  <button
                    onClick={() => setExpanded(expanded === folder.id ? null : folder.id)}
                    className="w-full flex items-center gap-2"
                  >
                    <FolderOpen size={15} className="text-brand-600 shrink-0" />
                    <span className="text-sm font-semibold text-gray-800 flex-1 text-left">{folder.name}</span>
                    <span className="text-xs font-semibold text-brand-600">{folder.progressPercent}%</span>
                  </button>
                  <div className="h-1 bg-gray-100 rounded-full mt-1.5 mb-2 overflow-hidden">
                    <div
                      className="h-full bg-brand-600 rounded-full transition-all"
                      style={{ width: `${folder.progressPercent}%` }}
                    />
                  </div>

                  {expanded === folder.id && (
                    <div className="ml-5 space-y-2.5">
                      {folder.files.length === 0 && !folder.children?.length ? (
                        <p className="text-xs text-gray-400">No files yet</p>
                      ) : (
                        <>
                          {folder.files.map((file) => (
                            <FileRow key={file.id} file={file} token={token} />
                          ))}
                          {folder.children?.map((child) => (
                            <div key={child.id}>
                              <div className="flex items-center gap-2">
                                <FolderOpen size={12} className="text-gray-400 shrink-0" />
                                <span className="text-xs font-semibold text-gray-700 flex-1 truncate">{child.name}</span>
                                <span className="text-[11px] text-gray-400">{child.progressPercent}%</span>
                              </div>
                              {child.files.length > 0 && (
                                <div className="ml-5 mt-2 space-y-2">
                                  {child.files.map((file) => (
                                    <FileRow key={file.id} file={file} token={token} />
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
