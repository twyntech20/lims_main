'use client'

import { useEffect, useState } from 'react'
import { Braces, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Mono, buttonClass } from '@/components/ui/primitives'

/**
 * Audit detail drawer. The table shows a one-line preview; the full
 * payload opens here, pretty-printed, so nobody has to read raw JSON
 * inside a table cell. Nothing is truncated in the drawer itself —
 * auditability requires the complete record.
 */
export default function LogDetails({
  values, action, table, recordId, at, actor, ip,
}: {
  values: unknown
  action: string
  table: string | null
  recordId: string | null
  at: string
  actor: string
  ip: string | null
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  if (values === null || values === undefined) {
    return <span className="text-[12px] text-ink-4">—</span>
  }

  const pretty = JSON.stringify(values, null, 2)
  const preview = JSON.stringify(values)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group inline-flex max-w-[220px] items-center gap-1.5 text-left"
        title="View full payload"
      >
        <Braces className="h-3 w-3 shrink-0 text-ink-4 group-hover:text-brand-600" />
        <span className="truncate font-mono text-[11.5px] text-ink-3 group-hover:text-ink">
          {preview.length > 60 ? `${preview.slice(0, 60)}…` : preview}
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Audit event detail">
          <button
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/25 backdrop-blur-[1px]"
          />
          <aside className="relative flex h-full w-full max-w-lg flex-col border-l border-line bg-surface shadow-pop">
            <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
              <div className="min-w-0">
                <h2 className="text-[14px] font-semibold text-ink">Audit event</h2>
                <p className="mt-0.5 text-[12px] text-ink-3">
                  {new Date(at).toLocaleString('en-AU')} · {actor}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ink-4 transition-colors hover:bg-surface-sunken hover:text-ink"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 border-b border-line px-4 py-3 text-[12.5px]">
              <Field label="Action"><Mono>{action}</Mono></Field>
              <Field label="Entity type">{table ?? '—'}</Field>
              <Field label="Entity ID" wide>
                {recordId ? <Mono className="break-all">{recordId}</Mono> : '—'}
              </Field>
              <Field label="IP address">{ip ? <Mono>{ip}</Mono> : '—'}</Field>
            </dl>

            <div className="min-h-0 flex-1 overflow-auto p-4">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">Payload</p>
              <pre className={cn(
                'overflow-x-auto rounded-md border border-line bg-surface-sunken p-3',
                'font-mono text-[11.5px] leading-relaxed text-ink-2',
              )}>
                {pretty}
              </pre>
            </div>

            <footer className="border-t border-line px-4 py-2.5 text-right">
              <button onClick={() => setOpen(false)} className={buttonClass('secondary', 'sm')}>Close</button>
            </footer>
          </aside>
        </div>
      )}
    </>
  )
}

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={cn('min-w-0', wide && 'col-span-2')}>
      <dt className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ink-3">{label}</dt>
      <dd className="mt-0.5 min-w-0 text-ink-2">{children}</dd>
    </div>
  )
}
