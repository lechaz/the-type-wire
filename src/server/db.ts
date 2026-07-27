import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/server/db-types"

// Service-role client — server-only. Bypasses RLS, so it must never be
// imported from client components (only from createServerFn handlers).
let client: SupabaseClient<Database> | null = null

export function getDb() {
  if (client) return client

  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Check .env.local.",
    )
  }

  client = createClient<Database>(url, key, {
    auth: { persistSession: false },
  })

  return client
}
