import { ListPageSkeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return <ListPageSkeleton rows={7} columns={9} withTabs={true} wide={true} label="Loading work queue…" />
}
