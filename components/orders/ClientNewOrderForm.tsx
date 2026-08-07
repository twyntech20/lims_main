'use client'

import { useState, useTransition } from 'react'

import { clientSubmitOrder } from '@/app/actions/orders'
import { Plus, Trash2, Loader2, FlaskConical, CheckCircle } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import Link from 'next/link'

interface Test { id: string; name: string; code: string | null; category: string | null }
interface Project { id: string; name: string }

interface Sample {
  sample_id: string
  description: string
  matrix_type: string
  collection_date: string
  collection_location: string
  test_ids: string[]
}

const EMPTY_SAMPLE: Sample = {
  sample_id: '', description: '', matrix_type: '', collection_date: '', collection_location: '', test_ids: [],
}

const MATRIX_TYPES = [
  'Drinking Water', 'Wastewater', 'Groundwater', 'Surface Water',
  'Soil', 'Sediment', 'Food', 'Air', 'Other',
]

interface Props { projects: Project[]; tests: Test[] }

export default function ClientNewOrderForm({ projects, tests }: Props) {
  const [samples, setSamples] = useState<Sample[]>([{ ...EMPTY_SAMPLE }])
  const [pending, startTransition] = useTransition()
  const [submitted, setSubmitted] = useState(false)

  const categories = [...new Set(tests.map(t => t.category ?? 'Other'))].sort()

  function addSample() {
    setSamples(prev => [...prev, { ...EMPTY_SAMPLE }])
  }

  function removeSample(i: number) {
    setSamples(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateSample(i: number, key: keyof Sample, value: string | string[]) {
    setSamples(prev => prev.map((s, idx) => idx === i ? { ...s, [key]: value } : s))
  }

  function toggleTest(sampleIdx: number, testId: string) {
    setSamples(prev => prev.map((s, idx) => {
      if (idx !== sampleIdx) return s
      const ids = s.test_ids.includes(testId)
        ? s.test_ids.filter(t => t !== testId)
        : [...s.test_ids, testId]
      return { ...s, test_ids: ids }
    }))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (samples.some(s => !s.sample_id.trim())) {
      toast.error('Each sample needs a Sample ID')
      return
    }
    if (samples.some(s => s.test_ids.length === 0)) {
      toast.error('Each sample needs at least one test selected')
      return
    }

    const formData = new FormData(e.currentTarget)
    formData.set('sample_count', String(samples.length))
    samples.forEach((s, i) => {
      formData.set(`samples[${i}][sample_id]`, s.sample_id)
      formData.set(`samples[${i}][description]`, s.description)
      formData.set(`samples[${i}][matrix_type]`, s.matrix_type)
      formData.set(`samples[${i}][collection_date]`, s.collection_date)
      formData.set(`samples[${i}][collection_location]`, s.collection_location)
      s.test_ids.forEach(id => formData.append(`samples[${i}][test_ids]`, id))
    })

    startTransition(async () => {
      try {
        await clientSubmitOrder(formData)
        setSubmitted(true)
      } catch (err: any) {
        if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
        toast.error(err.message ?? 'Failed to submit order')
      }
    })
  }

  if (submitted) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
        <div className="inline-flex bg-green-100 p-4 rounded-full mb-4">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Order Submitted!</h2>
        <p className="text-slate-500 mb-6">
          Our team has been notified and will begin processing your samples shortly.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/client/orders" className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-5 py-2.5 rounded-xl transition">
            View My Orders
          </Link>
          <button onClick={() => { setSubmitted(false); setSamples([{ ...EMPTY_SAMPLE }]) }} className="border border-slate-200 text-slate-600 hover:text-slate-900 font-medium px-5 py-2.5 rounded-xl transition">
            Submit Another
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Toaster position="top-center" />

      {/* Order info */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Order Details</h2>
        <div className="grid grid-cols-2 gap-4">
          {projects.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Project (optional)</label>
              <select name="project_id" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">No project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Priority</label>
            <select name="priority" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="normal">Standard (5 business days)</option>
              <option value="priority_48h">Priority — 48 Hours</option>
              <option value="priority_24h">Priority — 24 Hours</option>
              <option value="same_day">Urgent — Same Day</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Special Instructions</label>
          <textarea name="notes" rows={2} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Any special requirements or notes for this order…" />
        </div>
      </div>

      {/* Samples */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">
            Samples
            <span className="ml-2 text-sm font-normal text-slate-500">({samples.length})</span>
          </h2>
          <button type="button" onClick={addSample} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium">
            <Plus className="w-4 h-4" /> Add Sample
          </button>
        </div>

        {samples.map((sample, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">{i + 1}</div>
                <span className="font-medium text-slate-900">Sample {i + 1}</span>
              </div>
              {samples.length > 1 && (
                <button type="button" onClick={() => removeSample(i)} className="text-slate-300 hover:text-red-500 transition">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Sample ID *</label>
                <input
                  value={sample.sample_id}
                  onChange={e => updateSample(i, 'sample_id', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. TAP-01"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Matrix Type</label>
                <select
                  value={sample.matrix_type}
                  onChange={e => updateSample(i, 'matrix_type', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select…</option>
                  {MATRIX_TYPES.map(m => <option key={m} value={m.toLowerCase().replace(' ', '_')}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Collection Date & Time</label>
                <input
                  type="datetime-local"
                  value={sample.collection_date}
                  onChange={e => updateSample(i, 'collection_date', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Collection Location</label>
                <input
                  value={sample.collection_location}
                  onChange={e => updateSample(i, 'collection_location', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Site A, Tap 1"
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
              <input
                value={sample.description}
                onChange={e => updateSample(i, 'description', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Additional description"
              />
            </div>

            {/* Test selection */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-2">
                Select Tests *
                {sample.test_ids.length > 0 && (
                  <span className="ml-2 bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">{sample.test_ids.length} selected</span>
                )}
              </label>
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                {categories.map(cat => {
                  const catTests = tests.filter(t => (t.category ?? 'Other') === cat)
                  return (
                    <div key={cat}>
                      <div className="bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100">{cat}</div>
                      {catTests.map(test => (
                        <label key={test.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-50">
                          <input
                            type="checkbox"
                            checked={sample.test_ids.includes(test.id)}
                            onChange={() => toggleTest(i, test.id)}
                            className="rounded text-blue-600"
                          />
                          <span className="text-sm text-slate-700 flex-1">{test.name}</span>
                          {test.code && <span className="text-xs text-slate-400">{test.code}</span>}
                        </label>
                      ))}
                    </div>
                  )
                })}
                {tests.length === 0 && (
                  <p className="text-xs text-slate-400 px-3 py-6 text-center">No tests available yet. Contact your lab.</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Submit */}
      <div className="flex gap-3 justify-end pb-6">
        <Link href="/client/dashboard" className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition">
          Cancel
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white font-semibold px-8 py-2.5 rounded-xl transition shadow-sm text-sm"
        >
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
          {pending ? 'Submitting…' : 'Submit Order'}
        </button>
      </div>
    </form>
  )
}
