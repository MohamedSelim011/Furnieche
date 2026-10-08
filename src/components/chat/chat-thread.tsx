"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  AlertTriangle, ArrowRight, Check, FileText, FolderPlus, ImageIcon, Loader2, MessageCircle, Reply, Send,
  Sparkles, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatContext, ChatMessage } from "@/lib/chat";
import { toast } from "sonner";

export type ChatAttachment = Pick<ChatContext, "kind" | "id" | "title" | "imageUrl">;

const POLL_MS = 5000;

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function ChatThread({
  viewer,
  fetchUrl,
  postUrl,
  postExtras,
  initialAttachment,
  composerClassName,
  emptyHint,
  aiEditUrl,
  initialAiMode = false,
  saveEditBase,
}: {
  /** Which side is reading: their own messages render on the right. */
  viewer: "team" | "client";
  fetchUrl: string;
  postUrl: string;
  /** Extra fields sent with every message (e.g. the portal token). */
  postExtras?: Record<string, string>;
  initialAttachment?: ChatAttachment | null;
  /** Positions the composer above whichever bottom nav the page has. */
  composerClassName?: string;
  emptyHint?: string;
  /** Client only: endpoint that turns a message about a photo into an AI edit. */
  aiEditUrl?: string;
  initialAiMode?: boolean;
  /** Team only: base path for saving a finished AI edit into the folder ({base}/{editId}/save). */
  saveEditBase?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState<ChatAttachment | null>(initialAttachment ?? null);
  const [sending, setSending] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);
  const [aiMode, setAiMode] = useState(initialAiMode);
  const [savingEdit, setSavingEdit] = useState<string | null>(null);
  const canAiEdit = Boolean(aiEditUrl) && attachment?.kind === "file" && Boolean(attachment.imageUrl);
  const useAi = canAiEdit && aiMode;
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastCount = useRef(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch(fetchUrl, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages);
    } catch {
      // keep what we have; next poll retries
    }
  }, [fetchUrl]);

  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  // Scroll to the newest message when the list grows
  useLayoutEffect(() => {
    if (messages && messages.length !== lastCount.current) {
      bottomRef.current?.scrollIntoView({ block: "end" });
      lastCount.current = messages.length;
    }
  }, [messages]);

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const res = useAi
        ? await fetch(aiEditUrl!, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...postExtras, fileId: attachment!.id, prompt: body }),
          })
        : await fetch(postUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...postExtras,
              body,
              ...(attachment?.kind === "file" && { fileId: attachment.id }),
              ...(attachment?.kind === "update" && { updateId: attachment.id }),
            }),
          });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error);
      setMessages((prev) => [...(prev ?? []), data]);
      setText("");
      setAttachment(null);
      setAiMode(false);
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : "Message not sent");
    } finally {
      setSending(false);
    }
  }

  function replyAbout(context: ChatContext) {
    if (context.kind === "edit") {
      // Talk about the edited photo's original
      setAttachment({ kind: "file", id: context.fileId, title: "Photo", imageUrl: context.originalUrl });
    } else {
      setAttachment({ kind: context.kind, id: context.id, title: context.title, imageUrl: context.imageUrl });
    }
    inputRef.current?.focus();
  }

  async function saveEdit(editId: string) {
    if (!saveEditBase) return;
    setSavingEdit(editId);
    try {
      const res = await fetch(`${saveEditBase}/${editId}/save`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error);
      toast.success("Saved to the folder");
      load();
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : "Couldn't save the photo");
    } finally {
      setSavingEdit(null);
    }
  }

  return (
    <>
      <div className="px-4 pb-44">
        {messages === null ? (
          <div className="flex justify-center py-16">
            <Loader2 size={24} className="text-brand-600 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-white border border-gray-100 flex items-center justify-center mb-3">
              <MessageCircle size={24} className="text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-700">No messages yet</p>
            {emptyHint && <p className="text-xs text-gray-400 mt-1 max-w-[240px]">{emptyHint}</p>}
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((m, i) => {
              const mine = m.from === viewer;
              const newDay = i === 0 || dayLabel(messages[i - 1].createdAt) !== dayLabel(m.createdAt);
              return (
                <div key={m.id}>
                  {newDay && (
                    <div className="flex justify-center py-2">
                      <span className="text-[11px] font-semibold text-gray-500 bg-white/80 border border-gray-100 rounded-full px-3 py-1">
                        {dayLabel(m.createdAt)}
                      </span>
                    </div>
                  )}
                  <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[82%] flex flex-col", mine ? "items-end" : "items-start")}>
                      {!mine && <span className="text-[11px] font-semibold text-gray-500 px-1 mb-0.5">{m.authorName}</span>}
                      <div
                        className={cn(
                          "rounded-2xl overflow-hidden shadow-sm",
                          mine ? "bg-brand-600 text-white rounded-br-md" : "bg-white border border-gray-100 text-gray-800 rounded-bl-md"
                        )}
                      >
                        {m.context?.kind === "edit" && (
                          <div className={cn("p-2 pb-0", mine ? "bg-brand-700/60" : "bg-gray-50")}>
                            <p className={cn("flex items-center gap-1 px-1 pb-1.5 text-[11px] font-semibold", mine ? "text-white/85" : "text-oak-700")}>
                              <Sparkles size={12} /> AI photo edit
                            </p>
                            <div className="flex items-center gap-1.5">
                              <button type="button" onClick={() => setViewing(m.context!.kind === "edit" ? m.context!.originalUrl : null)} className="w-1/3 shrink-0">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={m.context.originalUrl} alt="Original" className="w-full aspect-square rounded-lg object-cover" />
                              </button>
                              <ArrowRight size={14} className={mine ? "text-white/60" : "text-gray-400"} />
                              <div className="flex-1">
                                {m.context.status === "COMPLETED" && m.context.imageUrl ? (
                                  <button type="button" onClick={() => setViewing(m.context!.imageUrl)} className="block w-full">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={m.context.imageUrl} alt="AI edit" className="w-full aspect-square rounded-lg object-cover" />
                                  </button>
                                ) : m.context.status === "FAILED" ? (
                                  <div className="w-full aspect-square rounded-lg bg-red-50 flex flex-col items-center justify-center gap-1 p-2 text-center">
                                    <AlertTriangle size={16} className="text-red-500" />
                                    <span className="text-[10px] text-red-700">{m.context.error ?? "Edit failed"}</span>
                                  </div>
                                ) : (
                                  <div className="w-full aspect-square rounded-lg bg-white/70 flex flex-col items-center justify-center gap-1.5">
                                    <Loader2 size={18} className="text-oak-600 animate-spin" />
                                    <span className="text-[10px] text-gray-500">Generating…</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            {viewer === "team" && m.context.status === "COMPLETED" && (
                              <div className="pt-2">
                                {m.context.savedToFolder ? (
                                  <span className="flex items-center justify-center gap-1 text-[11px] font-semibold text-green-700 py-1.5">
                                    <Check size={12} /> Saved to folder
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => saveEdit(m.context!.id)}
                                    disabled={savingEdit === m.context.id}
                                    className="w-full flex items-center justify-center gap-1 rounded-lg bg-brand-600 text-white text-[11px] font-semibold py-1.5 disabled:opacity-60"
                                  >
                                    {savingEdit === m.context.id ? <Loader2 size={12} className="animate-spin" /> : <FolderPlus size={12} />}
                                    Save to folder
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        {m.context && m.context.kind !== "edit" && (
                          <button
                            type="button"
                            onClick={() => (m.context?.imageUrl ? setViewing(m.context.imageUrl) : undefined)}
                            className={cn("block w-full text-left", mine ? "bg-brand-700/60" : "bg-gray-50")}
                          >
                            {m.context.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={m.context.imageUrl} alt="" className="w-full max-h-56 object-cover" />
                            ) : null}
                            <span
                              className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium",
                                mine ? "text-white/80" : "text-gray-500"
                              )}
                            >
                              {m.context.kind === "file" ? (
                                m.context.imageUrl ? <ImageIcon size={12} /> : <FileText size={12} />
                              ) : (
                                <MessageCircle size={12} />
                              )}
                              <span className="truncate">
                                {m.context.kind === "update" ? "Update: " : ""}
                                {m.context.title}
                              </span>
                            </span>
                          </button>
                        )}
                        <p className="px-3 py-2 text-sm whitespace-pre-wrap break-words">{m.body}</p>
                      </div>
                      <div className="flex items-center gap-2 px-1 mt-0.5">
                        <span className="text-[10px] text-gray-400">{timeLabel(m.createdAt)}</span>
                        {m.context && (
                          <button
                            type="button"
                            onClick={() => replyAbout(m.context!)}
                            className="text-[10px] font-semibold text-brand-600 flex items-center gap-0.5"
                          >
                            <Reply size={11} /> Reply
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className={cn("fixed left-0 right-0 z-40 px-3", composerClassName ?? "bottom-24")}>
        <div className="max-w-md mx-auto bg-white rounded-2xl border border-gray-200 shadow-[0_8px_24px_rgba(28,26,23,0.10)] p-2">
          {attachment && (
            <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-1.5 mb-2">
              {attachment.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={attachment.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shrink-0">
                  <FileText size={16} className="text-gray-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-600">
                  About this {attachment.kind === "file" ? (attachment.imageUrl ? "photo" : "file") : "update"}
                </p>
                <p className="text-xs text-gray-700 truncate">{attachment.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setAttachment(null)}
                aria-label="Remove attachment"
                className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-white"
              >
                <X size={14} />
              </button>
            </div>
          )}
          {canAiEdit && (
            <button
              type="button"
              onClick={() => setAiMode((v) => !v)}
              className={cn(
                "mb-2 w-full flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors",
                aiMode ? "bg-oak-500 border-oak-500 text-white" : "bg-oak-50 border-oak-100 text-oak-700"
              )}
            >
              <Sparkles size={13} />
              {aiMode ? "Edit with AI is on — describe the change" : "Edit this photo with AI"}
            </button>
          )}
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder={useAi ? "e.g. Make the wall a warm cream color" : "Write a message…"}
              className="flex-1 resize-none max-h-32 bg-transparent px-2 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={send}
              disabled={!text.trim() || sending}
              aria-label="Send"
              className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0 disabled:opacity-40"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* Full-screen photo */}
      {viewing && (
        <button
          type="button"
          onClick={() => setViewing(null)}
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
          aria-label="Close photo"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={viewing} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
          <span className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center">
            <X size={20} />
          </span>
        </button>
      )}
    </>
  );
}
