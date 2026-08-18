import { ListPageSkeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return <ListPageSkeleton rows={5} columns={8} withTabs={true} wide={true} label="Loading amendments…" />
}
