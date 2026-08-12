'use client'

import { Printer } from 'lucide-react'
import { logReportGenerated } from '@/app/actions/reports'

export default function PrintButton({ orderId }: { orderId: string }) {
  function handlePrint() {
    // Fire-and-forget audit log — printing/saving as PDF is a client-side
    // browser action we can't await, but the intent to generate the report
    // still needs to land in the audit trail (Step 11).
    logReportGenerated(orderId).catch(() => {})
    window.print()
  }

  return (
    <button
      onClick={handlePrint}
      className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 rounded-xl transition shadow-sm text-sm print:hidden"
    >
      <Printer className="w-4 h-4" />
      Print / Save as PDF
    </button>
  )
}
