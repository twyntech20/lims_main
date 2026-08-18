import { ListPageSkeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return <ListPageSkeleton rows={5} columns={7} withTabs={false} wide={false} label="Loading projects…" />
}
