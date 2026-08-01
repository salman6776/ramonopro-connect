import { supabase } from "@/integrations/supabase/client";
import type { jsPDF } from "jspdf";

const SIGNED_URL_TTL = 60 * 60; // 1 h

/** Upload an image File to the private `photos` bucket. Returns the storage path. */
export async function uploadPhoto(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("photos").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "image/jpeg",
  });
  if (error) throw error;
  return path;
}

/** Upload a generated jsPDF to the private `certificates` bucket. Returns a signed URL + storage path. */
export async function uploadCertificate(
  userId: string,
  interventionId: string,
  pdf: jsPDF,
): Promise<{ url: string; path: string }> {
  const blob = pdf.output("blob");
  const path = `${userId}/${interventionId}.pdf`;
  const { error } = await supabase.storage.from("certificates").upload(path, blob, {
    cacheControl: "3600",
    upsert: true,
    contentType: "application/pdf",
  });
  if (error) throw error;
  return { url: await getSignedUrl("certificates", path), path };
}

/**
 * Génère une URL signée à durée limitée. Les buckets sont privés : seules les
 * personnes autorisées par les règles RLS de Storage peuvent obtenir ce lien.
 */
export async function getSignedUrl(
  bucket: "photos" | "certificates" | "proofs",
  path: string,
  expiresIn = SIGNED_URL_TTL,
): Promise<string> {
  const clean = path.replace(/^https?:\/\/[^/]+\/storage\/v1\/object\/public\/[^/]+\//, "");
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(clean, expiresIn);
  if (error || !data?.signedUrl) throw error ?? new Error("Lien indisponible");
  return data.signedUrl;
}

export async function getSignedUrls(
  bucket: "photos" | "certificates" | "proofs",
  paths: string[],
  expiresIn = SIGNED_URL_TTL,
): Promise<string[]> {
  if (!paths.length) return [];
  return Promise.all(paths.map((p) => getSignedUrl(bucket, p, expiresIn).catch(() => "")));
}
