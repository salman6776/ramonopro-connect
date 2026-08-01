/**
 * Vérification server-side des sessions Supabase.
 * Aucun appelant n'est digne de confiance : le JWT est toujours revalidé
 * auprès de Supabase Auth avant toute opération.
 */

const SB_URL = "https://esdeyidgtbfandpxtqpr.supabase.co";
// Clé publishable (anon) — publique par nature, RLS appliquée via le JWT user.
const SB_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzZGV5aWRndGJmYW5kcHh0cXByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1NjYyODEsImV4cCI6MjA5NzE0MjI4MX0.u59bnf0VaC1AM_nqiWFcy0ChxvNJipAb_RuglP3AoGA";

export const SUPABASE_URL = SB_URL;
export const SUPABASE_ANON_KEY = SB_ANON;

export interface AuthedUser {
  id: string;
  email: string | null;
}

export class UnauthorizedError extends Error {
  code = "UNAUTHORIZED" as const;
  constructor(message = "Authentification requise.") {
    super(message);
  }
}

/** Valide le JWT auprès de Supabase Auth. Lève UnauthorizedError si invalide. */
export async function verifyAccessToken(token: unknown): Promise<AuthedUser> {
  if (typeof token !== "string" || token.length < 20) throw new UnauthorizedError();
  const res = await fetch(`${SB_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: SB_ANON },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new UnauthorizedError("Session invalide ou expirée. Reconnectez-vous.");
  const user = (await res.json()) as { id?: string; email?: string | null };
  if (!user?.id) throw new UnauthorizedError("Session invalide ou expirée. Reconnectez-vous.");
  return { id: user.id, email: user.email ?? null };
}

/** Valide le JWT puis vérifie que l'utilisateur est l'administrateur (email en secret serveur). */
export async function requireAdminUser(token: unknown): Promise<AuthedUser> {
  const user = await verifyAccessToken(token);
  const adminEmail = (process.env["ADMIN_EMAIL"] ?? "").trim().toLowerCase();
  if (!adminEmail) throw new UnauthorizedError("Administration non configurée.");
  if ((user.email ?? "").trim().toLowerCase() !== adminEmail) {
    throw new UnauthorizedError("Accès refusé.");
  }
  return user;
}
