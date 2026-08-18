import { ListPageSkeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return <ListPageSkeleton rows={8} columns={8} withTabs={false} wide={true} label="Loading test catalog…" />
}
