'use client'

import { useTransition, useState } from 'react'
import { assignAnalyst } from '@/app/actions/orders'
import { Loader2, UserCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { isQualifiedForOrder, orderLabCategories, labCategoryLabel } from '@/lib/workflow'

interface Analyst {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  role?: string | null
  specialty_chemistry?: boolean | null
  specialty_microbiology?: boolean | null
}

interface Props {
  orderId: string
  currentAnalystId: string | null
  analysts: Analyst[]
  /** tests.category for every test on the order, in any order, duplicates fine. */
  orderCategories: (string | null | undefined)[]
}

/** "Chemistry", or "Chemistry and Microbiology" for a mixed order. */
function describeSpecialty(a: Analyst): string {
  const held = [
    a.specialty_chemistry === true && 'Chemistry',
    a.specialty_microbiology === true && 'Microbiology',
  ].filter(Boolean) as string[]
  return held.length ? held.join(' + ') : 'no specialty set'
}

export default function AssignAnalystForm({
  orderId, currentAnalystId, analysts, orderCategories,
}: Props) {
  const [pending, startTransition] = useTransition()
  const [selected, setSelected] = useState(currentAnalystId ?? '')

  const required = orderLabCategories(orderCategories)
  // Same rule the server action enforces, so the picker and the backend can
  // never disagree about who is eligible.
  const eligibility = new Map(analysts.map(a => [a.id, isQualifiedForOrder(a, orderCategories)]))
  const eligibleCount = [...eligibility.values()].filter(Boolean).length

  // Whoever already holds the order stays selectable even if they no longer
  // qualify, so the assignment can still be cleared or handed over.
  const selectedIneligible = Boolean(selected) && eligibility.get(selected) === false

  function handleAssign() {
    startTransition(async () => {
      try {
        await assignAnalyst(orderId, selected)
        toast.success(selected ? 'Analyst assigned' : 'Analyst removed')
      } catch (e: any) {
        toast.error(e.message)
      }
    })
  }

  return (
    <div className="space-y-3">
      {required.length > 0 && (
        <p className="text-xs text-slate-500">
          This order covers{' '}
          <span className="font-medium text-slate-700">
            {required.map(labCategoryLabel).join(' and ')}
          </span>
          . Only analysts qualified in {required.length > 1 ? 'both departments' : 'that department'} can be assigned.
        </p>
      )}

      <select
        value={selected}
        onChange={e => setSelected(e.target.value)}
        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Unassigned</option>
        {analysts.map(a => {
          const ok = eligibility.get(a.id) ?? false
          const name = [a.first_name, a.last_name].filter(Boolean).join(' ') || a.email
          return (
            // Ineligible analysts stay visible but unselectable: seeing why
            // someone cannot take the order is more useful than a short list
            // with no explanation.
            <option key={a.id} value={a.id} disabled={ok ? undefined : true}>
              {ok ? name : `${name} — not qualified (${describeSpecialty(a)})`}
            </option>
          )
        })}
      </select>

      {required.length > 0 && eligibleCount === 0 && (
        <p className="text-xs text-amber-700">
          No analyst currently holds every specialty this order needs. An administrator
          can add the missing department on the analyst&rsquo;s profile.
        </p>
      )}

      <button
        onClick={handleAssign}
        disabled={pending || selected === (currentAnalystId ?? '') || selectedIneligible}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400 text-white font-medium py-2.5 rounded-xl transition text-sm"
      >
        {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
        {selected ? 'Assign Analyst' : 'Remove Assignment'}
      </button>
    </div>
  )
}
