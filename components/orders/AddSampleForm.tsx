'use client'

import { useState, useTransition, useRef } from 'react'

import { addSampleToOrder } from '@/app/actions/orders'
import { Plus, X, Loader2, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'

interface Test { id: string; name: string; code: string | null; category: string | null }
interface Props { orderId: string; tests: Test[] }

export default function AddSampleForm({ orderId, tests }: Props) {
  const [open, setOpen] = useState(false)
  const [selectedTests, setSelectedTests] = useState<string[]>([])
  const [pending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  const categories = [...new Set(tests.map(t => t.category ?? 'Other'))].sort()

  function toggleTest(id: string) {
    setSelectedTests(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)
    data.set('order_id', orderId)
    selectedTests.forEach(id => data.append('test_ids', id))

    startTransition(async () => {
      try {
        await addSampleToOrder(data)
        toast.success('Sample added')
        formRef.current?.reset()
        setSelectedTests([])
        setOpen(false)
      } catch (err: any) {
        if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
        toast.error(err.message ?? 'Failed to add sample')
      }
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 hover:border-blue-300 text-slate-400 hover:text-blue-500 py-3 rounded-xl transition text-sm font-medium"
      >
        <Plus className="w-4 h-4" /> Add Sample
      </button>
    )
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="border border-blue-200 bg-blue-50/30 rounded-xl p-4 space-y-3 mt-3">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-medium text-slate-900 text-sm">Add Sample</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Sample ID *</label>
          <input required name="sample_id" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="S-001" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Matrix Type</label>
          <select name="matrix_type" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Select…</option>
            <option value="drinking_water">Drinking Water</option>
            <option value="wastewater">Wastewater</option>
            <option value="soil">Soil</option>
            <option value="food">Food</option>
            <option value="air">Air</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Collection Date</label>
          <input name="collection_date" type="datetime-local" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Collection Location</label>
          <input name="collection_location" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Tap 1, Site A" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
        <input name="description" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Sample description" />
      </div>

      {/* Tests selection */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-2">
          Requested Tests
          {selectedTests.length > 0 && (
            <span className="ml-2 bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">{selectedTests.length}</span>
          )}
        </label>
        <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg bg-white divide-y divide-slate-50">
          {categories.map(cat => {
            const catTests = tests.filter(t => (t.category ?? 'Other') === cat)
            return (
              <div key={cat}>
                <div className="px-3 py-1.5 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">{cat}</div>
                {catTests.map(test => (
                  <label key={test.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedTests.includes(test.id)}
                      onChange={() => toggleTest(test.id)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">{test.name}</span>
                    {test.code && <span className="text-xs text-slate-400 ml-auto">{test.code}</span>}
                  </label>
                ))}
              </div>
            )
          })}
          {tests.length === 0 && (
            <p className="text-xs text-slate-400 px-3 py-4 text-center">No tests configured yet</p>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white font-medium py-2.5 rounded-xl transition text-sm"
      >
        {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        Add Sample
      </button>
    </form>
  )
}
