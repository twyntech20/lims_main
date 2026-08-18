import Image from 'next/image'

interface ProfileRef {
  first_name: string | null
  last_name: string | null
  email: string
}

interface SampleTestRow {
  id: string
  status: string
  result: string | null
  unit: string | null
  qualifier: string | null
  mdl: string | null
  analyst_notes: string | null
  approved_at: string | null
  tests: {
    id: string
    name: string
    code: string | null
    method: string | null
    unit: string | null
    category: string | null
    reference_range: string | null
    mdl: string | null
  } | null
  entered_by_profile: ProfileRef | null
  approved_by_profile: ProfileRef | null
}

interface SampleRow {
  id: string
  sample_id: string
  matrix_type: string | null
  collection_date: string | null
  sample_tests: SampleTestRow[]
}

export interface LabReportOrder {
  id: string
  order_number: string
  customer_name: string | null
  date_received: string | null
  date_completed: string | null
  released_at: string | null
  released_by_profile: ProfileRef | null
  profiles: { first_name: string | null; last_name: string | null; email: string } | null
  clients: { client_name: string; email: string | null; phone: string | null; address: string | null } | null
  samples: SampleRow[]
}

function profileName(p: ProfileRef | null): string {
  if (!p) return '—'
  return [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email
}

function fmtDate(v: string | null): string {
  return v ? new Date(v).toLocaleDateString() : '—'
}

const CATEGORY_LABELS: Record<string, string> = {
  chemistry: 'Chemistry Results',
  microbiology: 'Microbiology Results',
}

function ResultsTable({ rows }: { rows: SampleTestRow[] }) {
  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-slate-100">
          <th className="text-left px-6 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Test</th>
          <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Result</th>
          <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Unit</th>
          <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">MDL</th>
          <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Ref. Range</th>
          <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Method</th>
          <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Comments</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-50">
        {rows.map((st) => {
          const test = st.tests
          const displayResult = st.qualifier === 'ND' ? 'ND' : [st.qualifier, st.result].filter(Boolean).join(' ') || '—'
          return (
            <tr key={st.id} className="hover:bg-slate-50/50 transition">
              <td className="px-6 py-2.5 text-sm font-medium text-slate-900">
                {test?.name ?? '—'}
                {test?.code && <span className="text-slate-400 font-mono ml-2 text-xs">({test.code})</span>}
              </td>
              <td className="px-4 py-2.5 text-sm font-mono text-slate-700">{displayResult}</td>
              <td className="px-4 py-2.5 text-sm text-slate-500">{st.unit ?? test?.unit ?? '—'}</td>
              {/* MDL as reported, falling back to the catalog value from the
                  Master List of Analyses. */}
              <td className="px-4 py-2.5 text-sm text-slate-500">{st.mdl ?? test?.mdl ?? '—'}</td>
              <td className="px-4 py-2.5 text-sm text-slate-500">{test?.reference_range ?? '—'}</td>
              <td className="px-4 py-2.5 text-sm text-slate-500">{test?.method ?? '—'}</td>
              <td className="px-4 py-2.5 text-xs text-slate-500 italic max-w-56">{st.analyst_notes ?? '—'}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

export default function LabReportView({ order }: { order: LabReportOrder }) {
  const analystName = profileName(order.profiles)

  // Every approved sample_test that made it into the report, flattened once
  // so we can compute a single "most recent approval" for the report header.
  const allApproved = order.samples.flatMap((s) => s.sample_tests.filter((st) => st.status === 'approved'))
  const latestApproval = allApproved.reduce<SampleTestRow | null>((latest, st) => {
    if (!st.approved_at) return latest
    if (!latest || !latest.approved_at || st.approved_at > latest.approved_at) return st
    return latest
  }, null)
  const reviewerName = profileName(latestApproval?.approved_by_profile ?? null)

  return (
    <div className="print-page">
      {/* Report Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <Image
              src="https://fqlabs.com/wp-content/uploads/2020/01/weblogo.png"
              alt="FQLabs"
              width={140}
              height={52}
              style={{ objectFit: 'contain' }}
              unoptimized
            />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Certificate of Analysis</h1>
              <p className="text-slate-400 text-sm mt-0.5">FQ Labs Laboratory Information System</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-blue-600">{order.order_number}</p>
            <p className="text-xs text-slate-400 mt-0.5">Order Number</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 border-t border-slate-100 pt-6">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Client</p>
            <p className="text-sm font-medium text-slate-800">{order.clients?.client_name ?? order.customer_name ?? '—'}</p>
            {order.clients?.address && <p className="text-xs text-slate-400">{order.clients.address}</p>}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Report Date</p>
            <p className="text-sm font-medium text-slate-800">{fmtDate(new Date().toISOString())}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Date Received</p>
            <p className="text-sm font-medium text-slate-800">{fmtDate(order.date_received)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Date Completed</p>
            <p className="text-sm font-medium text-slate-800">{fmtDate(order.date_completed)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Performing Analyst</p>
            <p className="text-sm font-medium text-slate-800">{analystName}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Reviewed &amp; Approved By</p>
            <p className="text-sm font-medium text-slate-800">{reviewerName}</p>
            {latestApproval?.approved_at && (
              <p className="text-xs text-slate-400">{fmtDate(latestApproval.approved_at)}</p>
            )}
          </div>
          {/* Who authorised the release of this report, and when. Absent
              until the order is actually released — a preview says so. */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Released By</p>
            {order.released_at ? (
              <>
                <p className="text-sm font-medium text-slate-800">{profileName(order.released_by_profile)}</p>
                <p className="text-xs text-slate-400">{fmtDate(order.released_at)}</p>
              </>
            ) : (
              <p className="text-sm font-medium text-amber-600">Not yet released — preview</p>
            )}
          </div>
        </div>
      </div>

      {/* Results by Sample, grouped by category */}
      <div className="space-y-6">
        {order.samples.map((sample) => {
          const approvedTests = sample.sample_tests.filter((st) => st.status === 'approved')
          const byCategory = approvedTests.reduce<Record<string, SampleTestRow[]>>((acc, st) => {
            const cat = st.tests?.category ?? 'other'
            if (!acc[cat]) acc[cat] = []
            acc[cat].push(st)
            return acc
          }, {})

          return (
            <div key={sample.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Sample ID</p>
                    <p className="text-base font-bold text-slate-900 font-mono">{sample.sample_id}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Matrix</p>
                    <p className="text-sm text-slate-700">{sample.matrix_type ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Collection Date</p>
                    <p className="text-sm text-slate-700">{fmtDate(sample.collection_date)}</p>
                  </div>
                </div>
              </div>

              {approvedTests.length === 0 ? (
                <div className="px-6 py-4 text-sm text-slate-400">No approved results for this sample.</div>
              ) : (
                Object.entries(byCategory).map(([category, rows]) => (
                  <div key={category} className="border-b border-slate-100 last:border-b-0">
                    <p className="px-6 pt-4 pb-1 text-xs font-bold text-slate-600 uppercase tracking-wide">
                      {CATEGORY_LABELS[category] ?? `${category} Results`}
                    </p>
                    <ResultsTable rows={rows} />
                  </div>
                ))
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-slate-400">
        <p>This report was generated on {fmtDate(new Date().toISOString())}.</p>
        <p className="mt-1">FQ Labs Laboratory Information System — results reported are for the samples as received.</p>
      </div>
    </div>
  )
}
