import { createClient } from "@/lib/supabase/client";

export const COVER_MAX_MB = 10;

/**
 * Uploads a project cover photo from the browser and returns its public URL.
 * Throws an Error with a user-facing message on failure.
 */
export async function uploadCoverPhoto(file: File, projectId?: string): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file");
  if (file.size > COVER_MAX_MB * 1024 * 1024) throw new Error(`Photo must be under ${COVER_MAX_MB} MB`);

  const supabase = createClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = projectId
    ? `projects/${projectId}/cover-${crypto.randomUUID()}.${ext}`
    : `projects/covers/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from("furniche-media").upload(path, file, { contentType: file.type });
  if (error) throw new Error("Failed to upload photo");
  return supabase.storage.from("furniche-media").getPublicUrl(path).data.publicUrl;
}
