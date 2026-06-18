import { supabase } from "@/integrations/supabase/client";

export type Intervention = {
  id: string;
  user_id: string;
  client_id: string | null;
  intervention_date: string;
  installation_type: string;
  conduit_state: string | null;
  cleaning_done: boolean | null;
  vacuity_test: boolean | null;
  recommendations: string | null;
  notes: string | null;
  photos: string[] | null;
  created_at: string;
  clients?: Client | null;
};

export type Client = {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  address: string | null;
  email: string | null;
  created_at: string;
};

export type Certificate = {
  id: string;
  user_id: string;
  intervention_id: string | null;
  pdf_url: string | null;
  created_at: string;
};

export type Invoice = {
  id: string;
  user_id: string;
  intervention_id: string | null;
  amount: number;
  status: string;
  invoice_number: string | null;
  created_at: string;
  interventions?: { intervention_date: string; clients?: Client | null } | null;
};

export type Reminder = {
  id: string;
  user_id: string;
  intervention_id: string | null;
  client_id: string | null;
  reminder_date: string;
  status: string;
  sent_at: string | null;
  created_at: string;
  clients?: Client | null;
};

export type Subscription = {
  id: string;
  user_id: string;
  plan: string | null;
  status: string | null;
  current_period_end: string | null;
};

export async function fetchClients(userId: string) {
  const { data, error } = await supabase
    .from("clients").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw error;
  return data as Client[];
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
  return data as Intervention[];
}

export async function fetchInvoices(userId: string) {
  const { data, error } = await supabase
    .from("invoices")
    .select("*, interventions(intervention_date, clients(*))")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Invoice[];
}

export async function fetchReminders(userId: string) {
  const { data, error } = await supabase
    .from("reminders")
    .select("*, clients(*)")
    .eq("user_id", userId)
    .order("reminder_date", { ascending: true });
  if (error) throw error;
  return data as Reminder[];
}

export async function fetchSubscription(userId: string): Promise<Subscription | null> {
  const { data } = await supabase
    .from("subscriptions").select("*").eq("user_id", userId).maybeSingle();
  return (data as Subscription) ?? null;
}

export async function fetchCertificateByIntervention(interventionId: string) {
  const { data } = await supabase
    .from("certificates").select("*").eq("intervention_id", interventionId).maybeSingle();
  return (data as Certificate) ?? null;
}
