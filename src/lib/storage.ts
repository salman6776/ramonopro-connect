import { supabase } from "@/integrations/supabase/client";
import type { jsPDF } from "jspdf";

/** Upload an image File to the `photos` bucket. Returns the public URL. */
export async function uploadPhoto(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("photos").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "image/jpeg",
  });
  if (error) throw error;
  return supabase.storage.from("photos").getPublicUrl(path).data.publicUrl;
}

/** Upload a generated jsPDF to the `certificates` bucket. Returns public URL + storage path. */
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
  return { url: supabase.storage.from("certificates").getPublicUrl(path).data.publicUrl, path };
}
