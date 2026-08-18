import { ListPageSkeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return <ListPageSkeleton rows={6} columns={8} withTabs={true} wide={false} label="Loading orders…" />
}
