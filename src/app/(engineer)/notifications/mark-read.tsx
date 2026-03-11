"use client";

import { useEffect } from "react";

export function MarkNotificationsRead() {
  useEffect(() => {
    fetch("/api/notifications/read", { method: "PATCH" }).catch(() => {});
  }, []);
  return null;
}
