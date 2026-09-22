"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, FolderOpen, FileText, Image as ImageIcon, Video } from "lucide-react";

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

export function ScopeSection({ folders }: { folders: Folder[] }) {
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
                            <a
                              key={file.id}
                              href={file.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-2 text-xs text-gray-600 hover:underline"
                            >
                              {fileIcon(file.type)}
                              <span className="flex-1 truncate">{file.name}</span>
                              <span className="text-gray-400 shrink-0">{file.progressPercent}%</span>
                            </a>
                          ))}
                          {folder.children?.map((child) => (
                            <div key={child.id}>
                              <div className="flex items-center gap-2">
                                <FolderOpen size={12} className="text-gray-400 shrink-0" />
                                <span className="text-xs font-semibold text-gray-700 flex-1 truncate">{child.name}</span>
                                <span className="text-[11px] text-gray-400">{child.progressPercent}%</span>
                              </div>
                              {child.files.length > 0 && (
                                <div className="ml-5 mt-1 space-y-1">
                                  {child.files.map((file) => (
                                    <a
                                      key={file.id}
                                      href={file.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex items-center gap-2 text-xs text-gray-600 hover:underline"
                                    >
                                      {fileIcon(file.type)}
                                      <span className="flex-1 truncate">{file.name}</span>
                                      <span className="text-gray-400 shrink-0">{file.progressPercent}%</span>
                                    </a>
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
