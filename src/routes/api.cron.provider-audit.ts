import { createFileRoute } from "@tanstack/react-router"
import { timingSafeEqual } from "node:crypto"
import { getDb } from "@/server/db"
import { auditProviders } from "@/server/news/audit"

// Vercel Cron sends this automatically when CRON_SECRET is set in the
// project's env vars (see vercel.json for the schedule). Crons only fire
// against production, but this route is still publicly routable on preview
// deployments, so the auth gate is load-bearing there too.
//
// timingSafeEqual throws on unequal-length buffers rather than returning
// false, so the length check has to come first.
function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false

  const header = request.headers.get("authorization") ?? ""
  const expected = `Bearer ${secret}`
  const a = Buffer.from(header)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

// The options object below must be exactly `{ server: ... }` — a single
// inline key, nothing hoisted or spread. TanStack Start's client-bundle
// pruning only drops a route from the browser bundle when it detects that
// exact literal shape; anything else (a `component`, a variable in place
// of the object) ships this route's server-only imports — including the
// Supabase service-role client — into the client JS.
export const Route = createFileRoute("/api/cron/provider-audit")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!process.env.CRON_SECRET) {
          return Response.json(
            { error: "CRON_SECRET is not configured" },
            { status: 503 }
          )
        }
        if (!isAuthorized(request)) {
          return Response.json({ error: "Unauthorized" }, { status: 401 })
        }

        try {
          const results = await auditProviders(getDb())
          return Response.json({ ok: true, results })
        } catch (err) {
          console.error("[provider-audit] run failed:", err)
          return Response.json(
            {
              ok: false,
              error: err instanceof Error ? err.message : String(err),
            },
            { status: 500 }
          )
        }
      },
    },
  },
})
