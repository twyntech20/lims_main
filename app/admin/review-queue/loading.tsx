import { ListPageSkeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return <ListPageSkeleton rows={6} columns={9} withTabs={true} wide={true} label="Loading review queue…" />
}
