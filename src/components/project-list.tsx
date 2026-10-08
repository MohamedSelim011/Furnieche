"use client";

import { useState } from "react";
import { ChevronDown, FolderOpen } from "lucide-react";
import { ProjectCard, STATUS_OPTIONS, type ProjectCardData } from "@/components/project-card";

export function ProjectList({ projects }: { projects: ProjectCardData[] }) {
  const [filter, setFilter] = useState("ALL");
  const visible = filter === "ALL" ? projects : projects.filter((p) => p.status === filter);

  return (
    <div className="px-4 pt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-gray-900">Recent Projects</h2>
        <div className="relative">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Filter projects by status"
            className="appearance-none bg-white border border-gray-200 rounded-xl pl-3.5 pr-9 py-2 text-sm font-medium text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
          >
            <option value="ALL">All projects</option>
            {STATUS_OPTIONS.filter((o) => o.value !== "ARCHIVED").map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        </div>
      </div>

      <div className="space-y-3">
        {projects.length === 0 ? (
          <EmptyState />
        ) : visible.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">No projects with this status</p>
        ) : (
          visible.map((project) => <ProjectCard key={project.id} project={project} />)
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <FolderOpen size={36} className="text-gray-300" />
      </div>
      <h3 className="font-bold text-gray-900 mb-2">No projects yet</h3>
      <p className="text-sm text-gray-500 max-w-[220px]">
        You haven&apos;t documented any projects yet. Start now to reduce client disputes and keep progress on track.
      </p>
    </div>
  );
}
