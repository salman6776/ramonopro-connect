import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://esdeyidgtbfandpxtqpr.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzZGV5aWRndGJmYW5kcHh0cXByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1NjYyODEsImV4cCI6MjA5NzE0MjI4MX0.u59bnf0VaC1AM_nqiWFcy0ChxvNJipAb_RuglP3AoGA";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
});
