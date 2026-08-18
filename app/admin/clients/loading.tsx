import { ListPageSkeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return <ListPageSkeleton rows={5} columns={6} withTabs={false} wide={false} label="Loading clients…" />
}
