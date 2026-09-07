import { createClient } from "@supabase/supabase-js";

// ponytail: service_role hanya di server (route cron / server action), jangan import di client component
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
