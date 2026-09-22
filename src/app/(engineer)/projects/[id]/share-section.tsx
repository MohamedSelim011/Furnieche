"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, X, DollarSign, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

type Member = {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  role: "EDITOR" | "VIEWER";
  canViewBudget: boolean;
  allFolders: boolean;
  folderIds: string[];
};

type Teammate = { id: string; name: string | null; email: string };
type FolderOption = { id: string; name: string };

function FolderChecklist({
  folders,
  selected,
  onToggle,
}: {
  folders: FolderOption[];
  selected: Set<string>;
  onToggle: (folderId: string) => void;
}) {
  if (folders.length === 0) {
    return <p className="text-[11px] text-gray-400">No folders yet — create one first to scope access.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {folders.map((f) => (
        <label key={f.id} className="flex items-center gap-1.5 text-xs text-gray-600">
          <input type="checkbox" checked={selected.has(f.id)} onChange={() => onToggle(f.id)} />
          <span className="truncate">{f.name}</span>
        </label>
      ))}
    </div>
  );
}

export function ShareSection({
  projectId,
  isOwner,
  folders,
  members: initialMembers,
  availableTeammates,
}: {
  projectId: string;
  isOwner: boolean;
  folders: FolderOption[];
  members: Member[];
  availableTeammates: Teammate[];
}) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [selectedTeammate, setSelectedTeammate] = useState("");
  const [role, setRole] = useState<"EDITOR" | "VIEWER">("VIEWER");
  const [canViewBudget, setCanViewBudget] = useState(false);
  const [restrictFolders, setRestrictFolders] = useState(false);
  const [newFolderIds, setNewFolderIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFolderIds, setEditFolderIds] = useState<Set<string>>(new Set());

  function toggleNewFolder(folderId: string) {
    setNewFolderIds((prev) => {
      const next = new Set(prev);
      next.has(folderId) ? next.delete(folderId) : next.add(folderId);
      return next;
    });
  }

  async function addMember() {
    if (!selectedTeammate) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedTeammate,
          role,
          canViewBudget,
          ...(restrictFolders && { folderIds: Array.from(newFolderIds) }),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Teammate added to project");
      setSelectedTeammate("");
      setNewFolderIds(new Set());
      setRestrictFolders(false);
      router.refresh();
    } catch {
      toast.error("Failed to add teammate");
    } finally {
      setSaving(false);
    }
  }

  async function removeMember(memberId: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/members/${memberId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      toast.success("Access removed");
    } catch {
      toast.error("Failed to remove access");
    } finally {
      setSaving(false);
    }
  }

  async function toggleBudget(memberId: string, next: boolean) {
    setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, canViewBudget: next } : m)));
    try {
      const res = await fetch(`/api/projects/${projectId}/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canViewBudget: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error("Failed to update budget access");
    }
  }

  function startEditingFolders(member: Member) {
    setEditingId(member.id);
    setEditFolderIds(new Set(member.folderIds));
  }

  function toggleEditFolder(folderId: string) {
    setEditFolderIds((prev) => {
      const next = new Set(prev);
      next.has(folderId) ? next.delete(folderId) : next.add(folderId);
      return next;
    });
  }

  async function saveFolderAccess(memberId: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderIds: Array.from(editFolderIds) }),
      });
      if (!res.ok) throw new Error();
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, allFolders: false, folderIds: Array.from(editFolderIds) } : m))
      );
      setEditingId(null);
      toast.success("Folder access updated");
    } catch {
      toast.error("Failed to update folder access");
    } finally {
      setSaving(false);
    }
  }

  async function grantAllFolders(memberId: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allFolders: true }),
      });
      if (!res.ok) throw new Error();
      setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, allFolders: true, folderIds: [] } : m)));
      setEditingId(null);
      toast.success("Now sees every folder");
    } catch {
      toast.error("Failed to update folder access");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <Users size={15} className="text-gray-400" />
        <h2 className="font-bold text-gray-900 text-sm">Shared With</h2>
      </div>

      {members.length === 0 ? (
        <p className="text-xs text-gray-400">Only you can see this project.</p>
      ) : (
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.id} className="bg-gray-50 rounded-xl px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{m.name || m.email}</p>
                  <p className="text-[10px] text-gray-400">{m.role === "EDITOR" ? "Can edit" : "View only"}</p>
                </div>
                {isOwner && (
                  <button
                    onClick={() => toggleBudget(m.id, !m.canViewBudget)}
                    title="Toggle budget visibility"
                    className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full ${
                      m.canViewBudget ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    <DollarSign size={10} /> {m.canViewBudget ? "Sees budget" : "No budget"}
                  </button>
                )}
                {isOwner && (
                  <button onClick={() => removeMember(m.id)} disabled={saving}>
                    <X size={13} className="text-gray-300" />
                  </button>
                )}
              </div>

              {isOwner && folders.length > 0 && (
                <div className="mt-1.5">
                  <button
                    onClick={() => (editingId === m.id ? setEditingId(null) : startEditingFolders(m))}
                    className="flex items-center gap-1 text-[10px] font-semibold text-brand-600"
                  >
                    {editingId === m.id ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                    Folders: {m.allFolders ? "All" : `${m.folderIds.length} of ${folders.length}`}
                  </button>

                  {editingId === m.id && (
                    <div className="mt-2 space-y-2">
                      <FolderChecklist folders={folders} selected={editFolderIds} onToggle={toggleEditFolder} />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => saveFolderAccess(m.id)}
                          disabled={saving}
                          className="text-xs font-semibold text-brand-600 disabled:opacity-40"
                        >
                          Save
                        </button>
                        {!m.allFolders && (
                          <button
                            onClick={() => grantAllFolders(m.id)}
                            disabled={saving}
                            className="text-xs text-gray-400"
                          >
                            Give access to all folders instead
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isOwner && availableTeammates.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-50 space-y-2">
          <select
            value={selectedTeammate}
            onChange={(e) => setSelectedTeammate(e.target.value)}
            className="w-full h-9 text-xs rounded-lg border border-gray-200 px-2"
          >
            <option value="">Add a teammate...</option>
            {availableTeammates.map((t) => (
              <option key={t.id} value={t.id}>{t.name || t.email}</option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "EDITOR" | "VIEWER")}
              className="h-9 text-xs rounded-lg border border-gray-200 px-2"
            >
              <option value="VIEWER">View only</option>
              <option value="EDITOR">Can edit</option>
            </select>
            <label className="flex items-center gap-1.5 text-xs text-gray-500">
              <input type="checkbox" checked={canViewBudget} onChange={(e) => setCanViewBudget(e.target.checked)} />
              Wallet
            </label>
          </div>

          {folders.length > 0 && (
            <div>
              <label className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
                <input
                  type="checkbox"
                  checked={restrictFolders}
                  onChange={(e) => setRestrictFolders(e.target.checked)}
                />
                Limit to specific folders
              </label>
              {restrictFolders && (
                <FolderChecklist folders={folders} selected={newFolderIds} onToggle={toggleNewFolder} />
              )}
            </div>
          )}

          <button
            onClick={addMember}
            disabled={!selectedTeammate || saving}
            className="w-full text-xs font-semibold text-brand-600 disabled:opacity-40 text-right"
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}
