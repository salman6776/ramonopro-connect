import { supabase } from "@/integrations/supabase/client";

/** Récupère le JWT de la session courante (client). Lève si non connecté. */
export async function requireAccessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Session expirée. Reconnectez-vous.");
  return token;
}
