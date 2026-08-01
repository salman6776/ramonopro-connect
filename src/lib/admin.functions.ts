import { createServerFn } from "@tanstack/react-start";

/**
 * Opérations d'administration : toute autorisation est vérifiée côté serveur
 * (JWT revalidé auprès de Supabase + email admin stocké en secret serveur).
 * Aucun secret n'est présent dans le bundle client.
 */

export type PendingSub = {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  proof_url: string | null;
  reference_email: string | null;
  created_at: string;
  profiles: { email: string | null; full_name: string | null; company_name: string | null } | null;
};

export const adminCheckAccess = createServerFn({ method: "POST" })
  .inputValidator((d: { access_token: string }) => d)
  .handler(async ({ data }) => {
    const { requireAdminUser } = await import("./auth.server");
    const user = await requireAdminUser(data.access_token);
    return { ok: true as const, email: user.email };
  });

export const adminListPending = createServerFn({ method: "POST" })
  .inputValidator((d: { access_token: string }) => d)
  .handler(async ({ data }) => {
    const { requireAdminUser, SUPABASE_URL, SUPABASE_ANON_KEY } = await import("./auth.server");
    await requireAdminUser(data.access_token);

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/subscriptions?status=eq.pending_verification&select=*,profiles(email,full_name,company_name)&order=created_at.desc`,
      {
        headers: {
          Authorization: `Bearer ${data.access_token}`,
          apikey: SUPABASE_ANON_KEY,
          Accept: "application/json",
        },
      },
    );
    if (!res.ok) {
      console.error("adminListPending failed", res.status, (await res.text()).slice(0, 300));
      throw new Error("Impossible de charger les virements en attente.");
    }
    return { subs: (await res.json()) as PendingSub[] };
  });

export const adminSignProof = createServerFn({ method: "POST" })
  .inputValidator((d: { access_token: string; path: string }) => {
    if (!d.path || d.path.includes("..")) throw new Error("Chemin invalide");
    return d;
  })
  .handler(async ({ data }) => {
    const { requireAdminUser, SUPABASE_URL, SUPABASE_ANON_KEY } = await import("./auth.server");
    await requireAdminUser(data.access_token);

    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/proofs/${data.path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${data.access_token}`,
        apikey: SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiresIn: 900 }),
    });
    if (!res.ok) {
      console.error("adminSignProof failed", res.status);
      throw new Error("Impossible d'ouvrir la preuve.");
    }
    const json = (await res.json()) as { signedURL?: string };
    if (!json.signedURL) throw new Error("Impossible d'ouvrir la preuve.");
    return { url: `${SUPABASE_URL}/storage/v1${json.signedURL}` };
  });

export const adminActivateSubscription = createServerFn({ method: "POST" })
  .inputValidator((d: { access_token: string; subscription_id: string }) => {
    if (!d.subscription_id) throw new Error("Abonnement inconnu");
    return d;
  })
  .handler(async ({ data }) => {
    const { requireAdminUser, SUPABASE_URL, SUPABASE_ANON_KEY } = await import("./auth.server");
    await requireAdminUser(data.access_token);

    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/subscriptions?id=eq.${encodeURIComponent(data.subscription_id)}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${data.access_token}`,
          apikey: SUPABASE_ANON_KEY,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ status: "active", current_period_end: periodEnd.toISOString() }),
      },
    );
    if (!res.ok) {
      console.error("adminActivateSubscription failed", res.status, (await res.text()).slice(0, 300));
      throw new Error("Erreur lors de la validation.");
    }
    return { ok: true as const };
  });
