import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useState } from "react"
import { toast } from "sonner"
import { z } from "zod"
import { getEvents } from "@/server/fns/events"
import { NEWS_CATEGORIES, CATEGORY_LABELS } from "@/lib/mbti"
import { NEWS_REGIONS } from "@/lib/region"
import { stringsFor } from "@/lib/i18n"
import { CategoryTabs } from "@/components/category-tabs"
import { EventCard } from "@/components/event-card"
import { Button } from "@/components/ui/button"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty"

const searchSchema = z.object({
  category: z.enum(NEWS_CATEGORIES).catch("ai"),
  region: z.enum(NEWS_REGIONS).catch("us"),
})

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  loaderDeps: ({ search }) => ({ category: search.category, region: search.region }),
  loader: ({ deps }) => getEvents({ data: { category: deps.category, region: deps.region } }),
  component: Home,
})

function Home() {
  const { category, region } = Route.useSearch()
  const { events, unavailable } = Route.useLoaderData()
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const t = stringsFor(region)
  const label = CATEGORY_LABELS[region][category]

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await getEvents({ data: { category, region, forceRefresh: true } })
      await router.invalidate()
      toast.success(t.refreshedToast(label))
    } catch {
      toast.error(t.refreshFailedToast)
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 pt-8 pb-14">
      <h1 className="sr-only">The Type Wire: today's headlines, filed by personality</h1>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <CategoryTabs active={category} region={region} />
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? t.refreshing : t.refresh}
        </Button>
      </div>

      <section className="mt-6" aria-labelledby="dispatches-heading">
        <h2 id="dispatches-heading" className="sr-only">
          {label} dispatches
        </h2>

        {events.length === 0 && (
          <Empty className="border">
            <EmptyHeader>
              <EmptyTitle>{unavailable ? t.unavailableTitle(label) : t.emptyTitle(label)}</EmptyTitle>
              <EmptyDescription>
                {unavailable ? t.unavailableDescription : t.emptyDescription}
              </EmptyDescription>
            </EmptyHeader>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? t.refreshing : t.refresh}
            </Button>
          </Empty>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {events.map((e, i) => (
            <EventCard
              key={e.id}
              id={e.id}
              headline={e.headline}
              sourceName={e.source_name}
              publishedAt={e.published_at}
              category={e.category}
              region={region}
              primaryMaker={e.primaryMaker}
              index={i}
            />
          ))}
        </div>
      </section>
    </main>
  )
}
