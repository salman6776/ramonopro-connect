import { supabase } from "@/integrations/supabase/client";

export type Client = {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  address: string | null;
  email: string | null;
  created_at: string;
};

export type Intervention = {
  id: string;
  user_id: string;
  client_id: string | null;
  intervention_date: string;
  installation_type: string;
  conduit_state: string | null;
  cleaning_done: boolean | null;
  vacuity_test: boolean | null;
  notes: string | null;
  photos_urls: string[] | null;
  status: string | null;
  created_at: string;
  clients?: Client | null;
};

export type Certificate = {
  id: string;
  intervention_id: string | null;
  pdf_url: string | null;
  generated_at: string;
  interventions?: {
    intervention_date: string;
    installation_type: string;
    clients?: Client | null;
  } | null;
};

export type Invoice = {
  id: string;
  intervention_id: string | null;
  amount: number;
  status: string;
  pdf_url: string | null;
  issued_at: string;
  due_date: string | null;
  interventions?: { intervention_date: string; clients?: Client | null } | null;
};

export type Reminder = {
  id: string;
  intervention_id: string | null;
  client_id: string | null;
  scheduled_date: string;
  status: string;
  sent_at: string | null;
  clients?: Client | null;
};

export type Subscription = {
  id: string;
  user_id: string;
  plan: string | null;
  status: string | null;
  current_period_end: string | null;
  proof_url: string | null;
  reference_email: string | null;
};

export async function fetchClients(userId: string) {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Client[];
}

export async function fetchInterventions(userId: string, limit?: number) {
  let q = supabase
    .from("interventions")
    .select("*, clients(*)")
    .eq("user_id", userId)
    .order("intervention_date", { ascending: false });
  if (limit) q = q.limit(limit);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Intervention[];
}

export async function fetchInvoices(userId: string) {
  const { data, error } = await supabase
    .from("invoices")
    .select("*, interventions!inner(user_id, intervention_date, clients(*))")
    .eq("interventions.user_id", userId)
    .order("issued_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Invoice[];
}

export async function fetchReminders(userId: string) {
  const { data, error } = await supabase
    .from("reminders")
    .select("*, interventions!inner(user_id), clients(*)")
    .eq("interventions.user_id", userId)
    .order("scheduled_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Reminder[];
}

export async function fetchCertificates(userId: string) {
  const { data, error } = await supabase
    .from("certificates")
    .select("*, interventions!inner(user_id, intervention_date, installation_type, clients(*))")
    .eq("interventions.user_id", userId)
    .order("generated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Certificate[];
}

export async function fetchSubscription(userId: string): Promise<Subscription | null> {
  const { data } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as Subscription) ?? null;
}

export async function fetchCertificateByIntervention(interventionId: string) {
  const { data } = await supabase
    .from("certificates")
    .select("*")
    .eq("intervention_id", interventionId)
    .maybeSingle();
  return (data as Certificate) ?? null;
}

export function buildCertNumber(year: number, index: number) {
  return `CERT-${year}-${String(index).padStart(4, "0")}`;
}
