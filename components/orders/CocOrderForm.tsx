'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { createOrder } from '@/app/actions/orders'
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

interface Client {
  id: string
  client_name: string
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
}

interface Test {
  id: string
  name: string
  code: string | null
  category: string | null
}

interface SampleRow {
  sample_id: string
  date_sampled: string
  time_sampled: string
  description: string
  matrix: 'water' | 'other' | ''
  container_count: string
  container_type: string
  sample_type: 'grab' | 'composite' | ''
  sample_condition: string
  test_ids: string[]
  show_analyses: boolean
}

function defaultSample(): SampleRow {
  return {
    sample_id: '',
    date_sampled: '',
    time_sampled: '',
    description: '',
    matrix: '',
    container_count: '',
    container_type: '',
    sample_type: '',
    sample_condition: '',
    test_ids: [],
    show_analyses: false,
  }
}

const INPUT_CLS =
  'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const LABEL_CLS = 'block text-sm font-medium text-slate-700 mb-1.5'

interface Props {
  clients: Client[]
  tests: Test[]
}

export default function CocOrderForm({ clients, tests }: Props) {
  const [submitting, setSubmitting] = useState(false)

  // Order-level state
  const [clientId, setClientId] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [faxNo, setFaxNo] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zip, setZip] = useState('')
  const [projectName, setProjectName] = useState('')
  const [projectNumber, setProjectNumber] = useState('')
  const [poNumber, setPoNumber] = useState('')
  const [projectManager, setProjectManager] = useState('')
  const [samplerName, setSamplerName] = useState('')

  // TAT
  const [tat, setTat] = useState<'N' | '0' | '1' | '2'>('N')

  // Dates
  const now = new Date().toISOString().slice(0, 16)
  const [dateReceived, setDateReceived] = useState(now)
  const [dateDue, setDateDue] = useState('')

  // Shipment info
  const [airbillNo, setAirbillNo] = useState('')
  const [coolerNo, setCoolerNo] = useState('')
  const [sampleTemp, setSampleTemp] = useState('')
  const [remarks, setRemarks] = useState('')

  // Samples
  const [samples, setSamples] = useState<SampleRow[]>([defaultSample()])

  // COC chain of custody
  const [relinquishedBy1, setRelinquishedBy1] = useState('')
  const [relinquishedDate1, setRelinquishedDate1] = useState('')
  const [relinquishedTime1, setRelinquishedTime1] = useState('')
  const [receivedBy1, setReceivedBy1] = useState('')
  const [receivedDate1, setReceivedDate1] = useState('')
  const [receivedTime1, setReceivedTime1] = useState('')
  const [relinquishedBy2, setRelinquishedBy2] = useState('')
  const [relinquishedDate2, setRelinquishedDate2] = useState('')
  const [relinquishedTime2, setRelinquishedTime2] = useState('')
  const [receivedBy2, setReceivedBy2] = useState('')
  const [receivedDate2, setReceivedDate2] = useState('')
  const [receivedTime2, setReceivedTime2] = useState('')

  // Compliance & disposition
  const [isComplianceDW, setIsComplianceDW] = useState<boolean | null>(null)
  const [samplesReturned, setSamplesReturned] = useState<boolean | null>(null)
  const [storageDays, setStorageDays] = useState('')
  const [specialInstructions, setSpecialInstructions] = useState('')
  const [signPrint, setSignPrint] = useState('')
  const [signDate, setSignDate] = useState('')

  // Group tests by category
  const testsByCategory = tests.reduce<Record<string, Test[]>>((acc, t) => {
    const cat = t.category ?? 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(t)
    return acc
  }, {})

  function handleClientChange(id: string) {
    setClientId(id)
    const client = clients.find((c) => c.id === id)
    if (client) {
      setCustomerEmail(client.email ?? '')
      setCustomerPhone(client.phone ?? '')
      setAddress(client.address ?? '')
      setCity(client.city ?? '')
      setState(client.state ?? '')
      setZip(client.zip ?? '')
    }
  }

  function updateSample(index: number, patch: Partial<SampleRow>) {
    setSamples((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  function toggleTestForSample(index: number, testId: string) {
    setSamples((prev) =>
      prev.map((s, i) => {
        if (i !== index) return s
        const has = s.test_ids.includes(testId)
        return {
          ...s,
          test_ids: has ? s.test_ids.filter((t) => t !== testId) : [...s.test_ids, testId],
        }
      }),
    )
  }

  function addSampleRow() {
    if (samples.length >= 50) return
    setSamples((prev) => [...prev, defaultSample()])
  }

  function removeSampleRow(index: number) {
    setSamples((prev) => prev.filter((_, i) => i !== index))
  }

  const tatToPriority: Record<string, string> = {
    N: 'normal',
    '0': 'same_day',
    '1': 'priority_24h',
    '2': 'priority_48h',
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Validation
    if (!clientId) { toast.error('Please select a client'); return }
    if (!customerName.trim()) { toast.error('Customer name is required'); return }
    if (!customerEmail.trim()) { toast.error('Customer email is required'); return }
    const invalidSamples = samples.filter((s) => !s.sample_id.trim() || s.test_ids.length === 0)
    if (invalidSamples.length > 0) {
      toast.error('Each sample must have a Sample ID and at least one analysis selected')
      return
    }

    const formData = new FormData()
    formData.set('client_id', clientId)
    formData.set('customer_name', customerName)
    formData.set('customer_email', customerEmail)
    formData.set('customer_phone', customerPhone)
    formData.set('fax_no', faxNo)
    formData.set('shipping_address', [address, city, state, zip].filter(Boolean).join(', '))
    formData.set('project_name', projectName)
    formData.set('project_number', projectNumber)
    formData.set('po_number', poNumber)
    formData.set('project_manager', projectManager)
    formData.set('sampler_name', samplerName)
    formData.set('priority', tatToPriority[tat])
    formData.set('status', 'new')
    formData.set('date_received', dateReceived)
    formData.set('date_due', dateDue)
    formData.set('airbill_no', airbillNo)
    formData.set('cooler_no', coolerNo)
    formData.set('sample_temp', sampleTemp)
    formData.set('remarks', remarks)
    formData.set('relinquished_by_1', relinquishedBy1)
    formData.set('relinquished_date_1', relinquishedDate1)
    formData.set('relinquished_time_1', relinquishedTime1)
    formData.set('received_by_1', receivedBy1)
    formData.set('received_date_1', receivedDate1)
    formData.set('received_time_1', receivedTime1)
    formData.set('relinquished_by_2', relinquishedBy2)
    formData.set('relinquished_date_2', relinquishedDate2)
    formData.set('relinquished_time_2', relinquishedTime2)
    formData.set('received_by_2', receivedBy2)
    formData.set('received_date_2', receivedDate2)
    formData.set('received_time_2', receivedTime2)
    formData.set('is_compliance_drinking_water', isComplianceDW === null ? '' : String(isComplianceDW))
    formData.set('samples_returned_to_client', samplesReturned === null ? '' : String(samplesReturned))
    formData.set('storage_days', storageDays)
    formData.set('special_instructions', specialInstructions)
    formData.set('sign_print', signPrint)
    formData.set('sign_date', signDate)
    formData.set('sample_count', String(samples.length))

    samples.forEach((s, i) => {
      const prefix = `samples[${i}]`
      formData.set(`${prefix}[sample_id]`, s.sample_id)
      formData.set(`${prefix}[date_sampled]`, s.date_sampled)
      formData.set(`${prefix}[time_sampled]`, s.time_sampled)
      formData.set(`${prefix}[description]`, s.description)
      formData.set(`${prefix}[matrix_type]`, s.matrix === 'water' ? 'drinking_water' : s.matrix === 'other' ? 'other' : '')
      formData.set(`${prefix}[container_count]`, s.container_count)
      formData.set(`${prefix}[container_type]`, s.container_type)
      formData.set(`${prefix}[sample_type]`, s.sample_type)
      formData.set(`${prefix}[sample_condition]`, s.sample_condition)
      s.test_ids.forEach((tid) => formData.append(`${prefix}[test_ids]`, tid))
    })

    setSubmitting(true)
    try {
      await createOrder(formData)
    } catch (err: unknown) {
      const e = err as { digest?: string; message?: string }
      if (e?.digest?.startsWith('NEXT_REDIRECT')) throw err
      toast.error(e?.message ?? 'Failed to create order')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── 1. Client & Project Information ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Client &amp; Project Information</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>Client <span className="text-red-500">*</span></label>
            <select
              value={clientId}
              onChange={(e) => handleClientChange(e.target.value)}
              className={INPUT_CLS}
              required
            >
              <option value="">Select client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.client_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL_CLS}>Customer Name <span className="text-red-500">*</span></label>
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="John Smith"
              className={INPUT_CLS}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>Email <span className="text-red-500">*</span></label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="john@company.com"
              className={INPUT_CLS}
              required
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Phone No.</label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="XXX-XXX-XXXX"
              className={INPUT_CLS}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>Fax No.</label>
            <input
              value={faxNo}
              onChange={(e) => setFaxNo(e.target.value)}
              placeholder="XXX-XXX-XXXX"
              className={INPUT_CLS}
            />
          </div>
        </div>

        <div>
          <label className={LABEL_CLS}>Address</label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Street address"
            className={INPUT_CLS}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={LABEL_CLS}>City</label>
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className={INPUT_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>State</label>
            <input value={state} onChange={(e) => setState(e.target.value)} placeholder="CA" className={INPUT_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>ZIP</label>
            <input value={zip} onChange={(e) => setZip(e.target.value)} placeholder="12345" className={INPUT_CLS} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>Project Name</label>
            <input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Project name" className={INPUT_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>Project No.</label>
            <input value={projectNumber} onChange={(e) => setProjectNumber(e.target.value)} placeholder="PRJ-001" className={INPUT_CLS} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>P.O. No.</label>
            <input value={poNumber} onChange={(e) => setPoNumber(e.target.value)} placeholder="PO-001" className={INPUT_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>Project Manager</label>
            <input value={projectManager} onChange={(e) => setProjectManager(e.target.value)} placeholder="Manager name" className={INPUT_CLS} />
          </div>
        </div>

        <div>
          <label className={LABEL_CLS}>Sampler Name (Printed)</label>
          <input value={samplerName} onChange={(e) => setSamplerName(e.target.value)} placeholder="Sampler name" className={INPUT_CLS} />
        </div>
      </div>

      {/* ── 2. TAT & Dates ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Turnaround Time (TAT) &amp; Dates</h2>

        <div>
          <label className={LABEL_CLS}>TAT</label>
          <div className="flex gap-3 flex-wrap">
            {([
              { val: 'N', label: 'N = Normal' },
              { val: '0', label: '0 = Same Day' },
              { val: '1', label: '1 = 24 Hour' },
              { val: '2', label: '2 = 48 Hour' },
            ] as const).map(({ val, label }) => (
              <label key={val} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="tat"
                  value={val}
                  checked={tat === val}
                  onChange={() => setTat(val)}
                  className="accent-blue-600"
                />
                <span className="text-sm text-slate-700">{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>Date Received</label>
            <input
              type="datetime-local"
              value={dateReceived}
              onChange={(e) => setDateReceived(e.target.value)}
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Due Date</label>
            <input
              type="datetime-local"
              value={dateDue}
              onChange={(e) => setDateDue(e.target.value)}
              className={INPUT_CLS}
            />
          </div>
        </div>
      </div>

      {/* ── 3. Shipment Info ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Shipment Information</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>Airbill No.</label>
            <input value={airbillNo} onChange={(e) => setAirbillNo(e.target.value)} placeholder="Airbill number" className={INPUT_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>Cooler No.</label>
            <input value={coolerNo} onChange={(e) => setCoolerNo(e.target.value)} placeholder="Cooler number" className={INPUT_CLS} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>Sample Temp (°C)</label>
            <input value={sampleTemp} onChange={(e) => setSampleTemp(e.target.value)} placeholder="e.g. 4" className={INPUT_CLS} />
          </div>
        </div>

        <div>
          <label className={LABEL_CLS}>Remarks</label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={2}
            placeholder="Any remarks…"
            className={INPUT_CLS + ' resize-none'}
          />
        </div>
      </div>

      {/* ── 4. Samples ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">
            Samples
            <span className="ml-2 text-xs font-normal text-slate-400">({samples.length} / 50)</span>
          </h2>
          <button
            type="button"
            onClick={addSampleRow}
            disabled={samples.length >= 50}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-40"
          >
            <Plus className="w-4 h-4" /> Add Sample
          </button>
        </div>

        <div className="space-y-4">
          {samples.map((sample, idx) => (
            <div key={idx} className="border border-slate-200 rounded-xl p-4 space-y-4">
              {/* Sample header */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">Sample {idx + 1}</span>
                {samples.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSampleRow(idx)}
                    className="text-slate-400 hover:text-red-500 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={LABEL_CLS}>Sample ID <span className="text-red-500">*</span></label>
                  <input
                    value={sample.sample_id}
                    onChange={(e) => updateSample(idx, { sample_id: e.target.value })}
                    placeholder="e.g. S-001"
                    className={INPUT_CLS}
                    required
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Date Sampled</label>
                  <input
                    type="date"
                    value={sample.date_sampled}
                    onChange={(e) => updateSample(idx, { date_sampled: e.target.value })}
                    className={INPUT_CLS}
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Time Sampled</label>
                  <input
                    type="time"
                    value={sample.time_sampled}
                    onChange={(e) => updateSample(idx, { time_sampled: e.target.value })}
                    className={INPUT_CLS}
                  />
                </div>
              </div>

              <div>
                <label className={LABEL_CLS}>Sample Description</label>
                <input
                  value={sample.description}
                  onChange={(e) => updateSample(idx, { description: e.target.value })}
                  placeholder="e.g. Tap water from kitchen"
                  className={INPUT_CLS}
                />
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className={LABEL_CLS}>Matrix</label>
                  <div className="flex gap-2">
                    {(['water', 'other'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => updateSample(idx, { matrix: sample.matrix === m ? '' : m })}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium border transition ${
                          sample.matrix === m
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        {m === 'water' ? 'W' : 'O'}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{sample.matrix === 'water' ? 'Water' : sample.matrix === 'other' ? 'Other' : '—'}</p>
                </div>
                <div>
                  <label className={LABEL_CLS}>Container #</label>
                  <input
                    value={sample.container_count}
                    onChange={(e) => updateSample(idx, { container_count: e.target.value })}
                    placeholder="1"
                    className={INPUT_CLS}
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Container Type</label>
                  <input
                    value={sample.container_type}
                    onChange={(e) => updateSample(idx, { container_type: e.target.value })}
                    placeholder="e.g. 1L Poly"
                    className={INPUT_CLS}
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Grab / Comp</label>
                  <div className="flex gap-1">
                    {(['grab', 'composite'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => updateSample(idx, { sample_type: sample.sample_type === t ? '' : t })}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium border transition ${
                          sample.sample_type === t
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        {t === 'grab' ? 'G' : 'C'}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{sample.sample_type === 'grab' ? 'Grab' : sample.sample_type === 'composite' ? 'Composite' : '—'}</p>
                </div>
              </div>

              <div>
                <label className={LABEL_CLS}>Sample Condition / Comments</label>
                <input
                  value={sample.sample_condition}
                  onChange={(e) => updateSample(idx, { sample_condition: e.target.value })}
                  placeholder="e.g. Intact, sealed"
                  className={INPUT_CLS}
                />
              </div>

              {/* Analyses panel */}
              <div>
                <button
                  type="button"
                  onClick={() => updateSample(idx, { show_analyses: !sample.show_analyses })}
                  className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  {sample.show_analyses ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  Analyses
                  {sample.test_ids.length > 0 && (
                    <span className="ml-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full font-semibold">
                      {sample.test_ids.length} selected
                    </span>
                  )}
                  {sample.test_ids.length === 0 && (
                    <span className="ml-1 text-xs text-red-500">* required</span>
                  )}
                </button>

                {sample.show_analyses && (
                  <div className="mt-3 space-y-4 border border-slate-100 rounded-xl p-4 bg-slate-50">
                    {Object.entries(testsByCategory).map(([category, catTests]) => (
                      <div key={category}>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{category}</p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {catTests.map((test) => {
                            const checked = sample.test_ids.includes(test.id)
                            return (
                              <label key={test.id} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleTestForSample(idx, test.id)}
                                  className="accent-blue-600 rounded"
                                />
                                <span className="text-xs text-slate-700">
                                  {test.name}
                                  {test.code && <span className="text-slate-400 ml-1">({test.code})</span>}
                                </span>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {samples.length < 50 && (
          <button
            type="button"
            onClick={addSampleRow}
            className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-500 hover:border-blue-300 hover:text-blue-600 transition flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Sample Row
          </button>
        )}
      </div>

      {/* ── 5. Chain of Custody ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <h2 className="font-semibold text-slate-900">Chain of Custody</h2>

        {[1, 2].map((n) => {
          const relBy = n === 1 ? relinquishedBy1 : relinquishedBy2
          const relDate = n === 1 ? relinquishedDate1 : relinquishedDate2
          const relTime = n === 1 ? relinquishedTime1 : relinquishedTime2
          const recBy = n === 1 ? receivedBy1 : receivedBy2
          const recDate = n === 1 ? receivedDate1 : receivedDate2
          const recTime = n === 1 ? receivedTime1 : receivedTime2
          const setRelBy = n === 1 ? setRelinquishedBy1 : setRelinquishedBy2
          const setRelDate = n === 1 ? setRelinquishedDate1 : setRelinquishedDate2
          const setRelTime = n === 1 ? setRelinquishedTime1 : setRelinquishedTime2
          const setRecBy = n === 1 ? setReceivedBy1 : setReceivedBy2
          const setRecDate = n === 1 ? setReceivedDate1 : setReceivedDate2
          const setRecTime = n === 1 ? setReceivedTime1 : setReceivedTime2

          return (
            <div key={n} className="border border-slate-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Transfer {n}</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <p className="text-xs font-medium text-slate-600">Relinquished By</p>
                  <input value={relBy} onChange={(e) => setRelBy(e.target.value)} placeholder="Name" className={INPUT_CLS} />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" value={relDate} onChange={(e) => setRelDate(e.target.value)} className={INPUT_CLS} />
                    <input type="time" value={relTime} onChange={(e) => setRelTime(e.target.value)} className={INPUT_CLS} />
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-xs font-medium text-slate-600">Received By</p>
                  <input value={recBy} onChange={(e) => setRecBy(e.target.value)} placeholder="Name" className={INPUT_CLS} />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" value={recDate} onChange={(e) => setRecDate(e.target.value)} className={INPUT_CLS} />
                    <input type="time" value={recTime} onChange={(e) => setRecTime(e.target.value)} className={INPUT_CLS} />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── 6. Compliance & Disposition ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Compliance &amp; Disposition</h2>

        <div>
          <label className={LABEL_CLS}>Is this a compliance drinking water sample?</label>
          <div className="flex gap-3">
            {([true, false] as const).map((val) => (
              <button
                key={String(val)}
                type="button"
                onClick={() => setIsComplianceDW(isComplianceDW === val ? null : val)}
                className={`px-5 py-2 rounded-xl text-sm font-medium border transition ${
                  isComplianceDW === val
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300'
                }`}
              >
                {val ? 'Yes' : 'No'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={LABEL_CLS}>Samples returned to client?</label>
          <div className="flex gap-3">
            {([true, false] as const).map((val) => (
              <button
                key={String(val)}
                type="button"
                onClick={() => setSamplesReturned(samplesReturned === val ? null : val)}
                className={`px-5 py-2 rounded-xl text-sm font-medium border transition ${
                  samplesReturned === val
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300'
                }`}
              >
                {val ? 'YES' : 'NO'}
              </button>
            ))}
          </div>
        </div>

        {samplesReturned === false && (
          <div>
            <label className={LABEL_CLS}>Storage Days Requested</label>
            <input
              type="number"
              value={storageDays}
              onChange={(e) => setStorageDays(e.target.value)}
              placeholder="e.g. 30"
              min="1"
              className={INPUT_CLS}
            />
          </div>
        )}

        <div>
          <label className={LABEL_CLS}>Special Instructions</label>
          <textarea
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            rows={3}
            placeholder="Any special instructions…"
            className={INPUT_CLS + ' resize-none'}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>Sign &amp; Print Name</label>
            <input value={signPrint} onChange={(e) => setSignPrint(e.target.value)} placeholder="Name" className={INPUT_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>Sign Date</label>
            <input type="date" value={signDate} onChange={(e) => setSignDate(e.target.value)} className={INPUT_CLS} />
          </div>
        </div>
      </div>

      {/* ── Submit ── */}
      <div className="flex gap-3 justify-end pb-8">
        <a href="/admin/orders" className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition">
          Cancel
        </a>
        <button
          type="submit"
          disabled={submitting}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-xl transition shadow-sm text-sm"
        >
          {submitting ? 'Creating…' : 'Create Chain of Custody'}
        </button>
      </div>
    </form>
  )
}
