import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const MEDIA_BUCKET = "furniche-media";

function publicPrefix() {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${MEDIA_BUCKET}/`;
}

/** True only for public URLs inside our own media bucket. */
export function isStorageUrl(url: unknown): url is string {
  return typeof url === "string" && url.startsWith(publicPrefix());
}

/**
 * Server-side upload (no user session — e.g. AI edits requested from the
 * client portal). Needs SUPABASE_SERVICE_ROLE_KEY; never expose it to the browser.
 */
export async function uploadToMediaBucket(path: string, data: Buffer, contentType: string): Promise<string> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");

  const admin = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { persistSession: false },
  });
  const { error } = await admin.storage.from(MEDIA_BUCKET).upload(path, data, { contentType });
  if (error) throw error;
  return admin.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}
