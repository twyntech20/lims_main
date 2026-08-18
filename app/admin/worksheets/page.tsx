import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Layers, FlaskConical, Microscope, ArrowRight } from 'lucide-react'
import { Page, PageHeader, ButtonLink } from '@/components/ui/primitives'

const SHEETS = [
  {
    key: 'chemistry',
    label: 'Chemistry',
    description: 'Chemical analysis tests',
    icon: FlaskConical,
    href: '/admin/worksheets/chemistry',
  },
  {
    key: 'microbiology',
    label: 'Microbiology',
    description: 'Microbiological analysis tests',
    icon: Microscope,
    href: '/admin/worksheets/microbiology',
  },
] as const

export default async function WorksheetsPage() {
  const supabase = await createClient()

  // Count pending sample_tests by test category
  const { data: chemPending } = await supabase
    .from('sample_tests')
    .select('id, tests!inner(category)', { count: 'exact' })
    .eq('status', 'pending')
    .eq('tests.category', 'chemistry')

  const { data: microPending } = await supabase
    .from('sample_tests')
    .select('id, tests!inner(category)', { count: 'exact' })
    .eq('status', 'pending')
    .eq('tests.category', 'microbiology')

  const counts: Record<string, number> = {
    chemistry: chemPending?.length ?? 0,
    microbiology: microPending?.length ?? 0,
  }
  const total = counts.chemistry + counts.microbiology

  return (
    <Page narrow>
      <PageHeader
        icon={Layers}
        title="Worksheets"
        description="Batch result entry, grouped by test category"
        meta={<>{total} test{total === 1 ? '' : 's'} pending entry</>}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {SHEETS.map(({ key, label, description, icon: Icon, href }) => {
          const count = counts[key]
          return (
            <Link
              key={key}
              href={href}
              className="flex flex-col rounded-lg border border-line bg-surface shadow-xs transition-all hover:-translate-y-px hover:border-line-strong hover:shadow-sm"
            >
              <div className="flex items-center gap-3 border-b border-line px-4 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50">
                  <Icon className="h-4.5 w-4.5 text-brand-600" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-[14px] font-semibold text-ink">{label}</h2>
                  <p className="text-[12px] text-ink-3">{description}</p>
                </div>
              </div>

              <div className="flex items-baseline gap-2 px-4 py-4">
                <span className={`tabular text-[30px] font-semibold leading-none tracking-[-0.025em] ${count === 0 ? 'text-ink-4' : 'text-ink'}`}>
                  {count}
                </span>
                <span className="text-[12.5px] text-ink-3">
                  test{count === 1 ? '' : 's'} pending result entry
                </span>
              </div>

              <div className="mt-auto flex items-center justify-between border-t border-line px-4 py-2.5">
                <span className="text-[12px] text-ink-3">
                  {count === 0 ? 'Nothing waiting — open to review' : 'Ready for batch entry'}
                </span>
                <span className="inline-flex items-center gap-1 text-[12px] font-medium text-brand-600">
                  Open worksheet <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          )
        })}
      </div>

      <div className="mt-3 rounded-lg border border-line bg-surface-muted px-4 py-3">
        <p className="text-[12.5px] text-ink-3">
          Worksheets enter results in bulk for one category. To act on a single result — including
          review, return and release — use the{' '}
          <ButtonLink href="/admin/work-queue" variant="ghost" size="sm" className="px-1">work queue</ButtonLink>.
        </p>
      </div>
    </Page>
  )
}
