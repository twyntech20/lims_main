import { ListPageSkeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return <ListPageSkeleton rows={10} columns={6} withTabs={false} wide={true} label="Loading audit log…" />
}
