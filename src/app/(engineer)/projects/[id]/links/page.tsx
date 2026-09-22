"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Copy, RefreshCw, ShieldCheck, Eye, Ban, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type LinkType = "OWNER" | "VISITOR";
type PortalLink = {
  id: string;
  type: LinkType;
  token: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
};

const LINK_INFO: Record<LinkType, { title: string; description: string; icon: typeof ShieldCheck }> = {
  OWNER: {
    title: "Owner Link",
    description: "Full access — updates, folders, and the wallet. Share this with the person who owns the project.",
    icon: ShieldCheck,
  },
  VISITOR: {
    title: "Visitor Link",
    description: "Everything except the wallet. Share this with anyone who shouldn't see budget or payments.",
    icon: Eye,
  },
};

export default function ProjectLinksPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [links, setLinks] = useState<PortalLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  function load() {
    fetch(`/api/projects/${id}/links`)
      .then((r) => r.json())
      .then((data) => { setLinks(data); setLoading(false); })
      .catch(() => { toast.error("Failed to load links"); setLoading(false); });
  }

  useEffect(load, [id]);

  function urlFor(token: string) {
    return `${window.location.origin}/portal/${token}`;
  }

  async function copyLink(token: string) {
    await navigator.clipboard.writeText(urlFor(token));
    toast.success("Link copied");
  }

  async function generate(type: LinkType) {
    setBusy(type);
    try {
      const res = await fetch(`/api/projects/${id}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${LINK_INFO[type].title} generated`);
      load();
    } catch {
      toast.error("Failed to generate link");
    } finally {
      setBusy(null);
    }
  }

  async function toggleActive(linkId: string, isActive: boolean) {
    setBusy(linkId);
    try {
      const res = await fetch(`/api/projects/${id}/links/${linkId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error();
      setLinks((prev) => prev.map((l) => (l.id === linkId ? { ...l, isActive } : l)));
      toast.success(isActive ? "Link restored" : "Link revoked");
    } catch {
      toast.error("Failed to update link");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white max-w-md mx-auto flex items-center justify-center">
        <Loader2 size={28} className="text-brand-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto pb-8">
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">
            <ArrowLeft size={18} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Client Links</h1>
            <p className="text-xs text-gray-400">Two links, two levels of access</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {(["OWNER", "VISITOR"] as LinkType[]).map((type) => {
          const info = LINK_INFO[type];
          const Icon = info.icon;
          const active = links.filter((l) => l.type === type && l.isActive);
          const link = active[0];

          return (
            <div key={type} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <Icon size={16} className={type === "OWNER" ? "text-brand-600" : "text-amber-500"} />
                <h2 className="font-bold text-gray-900 text-sm">{info.title}</h2>
              </div>
              <p className="text-xs text-gray-500 mb-3">{info.description}</p>

              {link ? (
                <>
                  <div className="bg-gray-50 rounded-xl px-3 py-2.5 flex items-center gap-2 mb-3">
                    <code className="text-xs text-gray-600 truncate flex-1">{urlFor(link.token)}</code>
                    <button onClick={() => copyLink(link.token)} className="shrink-0">
                      <Copy size={14} className="text-brand-600" />
                    </button>
                  </div>
                  {link.lastUsedAt && (
                    <p className="text-[10px] text-gray-400 mb-3">
                      Last opened {new Date(link.lastUsedAt).toLocaleDateString()}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generate(type)}
                      disabled={busy === type}
                      className="flex-1"
                    >
                      <RefreshCw size={13} /> Regenerate
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleActive(link.id, false)}
                      disabled={busy === link.id}
                      className="flex-1 text-red-500 border-red-200 hover:bg-red-50"
                    >
                      <Ban size={13} /> Revoke
                    </Button>
                  </div>
                </>
              ) : (
                <Button size="sm" onClick={() => generate(type)} disabled={busy === type} fullWidth>
                  {busy === type ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                  Generate {info.title}
                </Button>
              )}
            </div>
          );
        })}

        {links.filter((l) => !l.isActive).length > 0 && (
          <div className="pt-2">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Revoked</p>
            <div className="space-y-2">
              {links.filter((l) => !l.isActive).map((l) => (
                <div key={l.id} className="bg-gray-50 rounded-xl px-3 py-2.5 flex items-center gap-2">
                  <code className="text-xs text-gray-400 truncate flex-1 line-through">{urlFor(l.token)}</code>
                  <button
                    onClick={() => toggleActive(l.id, true)}
                    disabled={busy === l.id}
                    className="shrink-0 text-xs text-brand-600 font-semibold flex items-center gap-1"
                  >
                    <CheckCircle2 size={12} /> Restore
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
