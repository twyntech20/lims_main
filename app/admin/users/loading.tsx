import { Page } from '@/components/ui/primitives'
import { HeaderSkeleton, ToolbarSkeleton, CardGridSkeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <Page>
      <HeaderSkeleton withTabs />
      <ToolbarSkeleton />
      <CardGridSkeleton cards={6} height="h-[148px]" />
      <span className="sr-only">Loading users…</span>
    </Page>
  )
}
