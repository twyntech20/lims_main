'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCw } from 'lucide-react'
import { Page, Panel, buttonClass } from '@/components/ui/primitives'

/**
 * Dashboard-scoped error boundary. The shell and navigation stay usable,
 * and the underlying message is shown rather than swallowed — a lab
 * operator reporting a fault needs something concrete to quote.
 */
export default function DashboardError({
  error, reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <Page wide>
      <Panel className="mx-auto max-w-xl p-8 text-center">
        <span className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-crit-bg">
          <AlertTriangle className="h-5 w-5 text-crit-fg" />
        </span>
        <h1 className="text-[15px] font-semibold text-ink">The dashboard could not be loaded</h1>
        <p className="mx-auto mt-1.5 max-w-md text-[13px] text-ink-3">
          No data was changed. Retry below; if it keeps failing, quote the reference to your administrator.
        </p>
        <p className="mt-3 break-words rounded-md border border-line bg-surface-sunken px-3 py-2 text-left font-mono text-[11.5px] text-ink-3">
          {error.message || 'Unknown error'}
          {error.digest && <><br />ref: {error.digest}</>}
        </p>
        <button onClick={reset} className={buttonClass('primary', 'md', 'mt-4')}>
          <RotateCw className="h-3.5 w-3.5" /> Try again
        </button>
      </Panel>
    </Page>
  )
}
