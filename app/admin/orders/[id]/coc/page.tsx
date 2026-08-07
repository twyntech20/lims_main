import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import PrintButton from '@/components/orders/PrintButton'

interface Props { params: Promise<{ id: string }> }

function td(content: React.ReactNode, opts: { colSpan?: number; rowSpan?: number; align?: string; bold?: boolean; bg?: string; width?: string } = {}) {
  return (
    <td
      colSpan={opts.colSpan}
      rowSpan={opts.rowSpan}
      style={{
        border: '1px solid black',
        padding: '2px 3px',
        fontSize: '7pt',
        fontFamily: 'Arial, sans-serif',
        verticalAlign: 'top',
        textAlign: (opts.align as 'left' | 'center' | 'right') ?? 'left',
        fontWeight: opts.bold ? 'bold' : 'normal',
        backgroundColor: opts.bg ?? 'transparent',
        width: opts.width,
        whiteSpace: 'pre-wrap',
      }}
    >
      {content}
    </td>
  )
}

function thd(content: React.ReactNode, opts: { colSpan?: number; rowSpan?: number; align?: string; width?: string } = {}) {
  return (
    <th
      colSpan={opts.colSpan}
      rowSpan={opts.rowSpan}
      style={{
        border: '1px solid black',
        padding: '2px 3px',
        fontSize: '7pt',
        fontFamily: 'Arial, sans-serif',
        backgroundColor: '#d0d0d0',
        textAlign: (opts.align as 'left' | 'center' | 'right') ?? 'center',
        fontWeight: 'bold',
        width: opts.width,
      }}
    >
      {content}
    </th>
  )
}

export default async function CocPrintPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      *,
      clients(id, client_name, email, phone, address, city, state, zip),
      samples(
        id, sample_id, description, matrix_type, collection_date, collection_location, status, notes,
        sample_tests(id, tests(id, name, code, category))
      )
    `)
    .eq('id', id)
    .single()

  if (error || !order) notFound()

  // Parse COC metadata from notes field
  let coc: Record<string, string | boolean | null> = {}
  try { if (order.notes) coc = JSON.parse(order.notes) } catch { /* ignore */ }

  const client = (order as any).clients
  const samples: any[] = (order as any).samples ?? []

  // Collect all unique tests across samples
  const allTestsMap = new Map<string, { id: string; name: string; code: string | null }>()
  for (const s of samples) {
    for (const st of (s.sample_tests ?? [])) {
      if (st.tests) allTestsMap.set(st.tests.id, st.tests)
    }
  }
  const allTests = Array.from(allTestsMap.values()).slice(0, 12)

  // Fill to minimum 10 rows
  const MIN_ROWS = 10
  const displayRows = samples.length >= MIN_ROWS ? samples : [
    ...samples,
    ...Array(MIN_ROWS - samples.length).fill(null),
  ]

  const shippingAddr = order.shipping_address ?? ''
  const addressParts = shippingAddr.split(',').map((p: string) => p.trim())
  const street = addressParts[0] ?? ''
  const cityStateZip = addressParts.slice(1).join(', ')

  const tableStyle: React.CSSProperties = {
    borderCollapse: 'collapse',
    width: '100%',
    fontSize: '7pt',
    fontFamily: 'Arial, sans-serif',
  }

  const pageStyle: React.CSSProperties = {
    padding: '10px',
    maxWidth: '1100px',
    margin: '0 auto',
    fontFamily: 'Arial, sans-serif',
  }

  function formatDateStr(d: string | null | undefined) {
    if (!d) return ''
    const date = new Date(d)
    if (isNaN(date.getTime())) return d
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
  }

  function formatTimeStr(d: string | null | undefined) {
    if (!d) return ''
    // If it's just a time string HH:MM, return it
    if (/^\d{2}:\d{2}/.test(d)) return d
    const date = new Date(d)
    if (isNaN(date.getTime())) return d
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  }

  const tatMap: Record<string, string> = {
    normal: 'N = Normal',
    same_day: '0 = Same Day',
    priority_24h: '1 = 24 Hour',
    priority_48h: '2 = 48 Hour',
  }
  const tatLabel = tatMap[(order as any).priority] ?? 'N = Normal'

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
          @page { margin: 0.4in; size: landscape; }
        }
      `}</style>

      {/* Top bar — hidden on print */}
      <div className="no-print" style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '12px', alignItems: 'center', background: '#f8fafc' }}>
        <Link href={`/admin/orders/${id}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', textDecoration: 'none', fontSize: '14px' }}>
          <ArrowLeft style={{ width: '16px', height: '16px' }} />
          Back to Order
        </Link>
        <PrintButton />
      </div>

      <div style={pageStyle}>
        <table style={tableStyle}>
          <tbody>
            {/* ── Row 1: Logo / Header / Date-Page-Customer-Lab ── */}
            <tr>
              <td colSpan={3} style={{ border: '1px solid black', padding: '4px 6px', fontSize: '9pt', fontWeight: 'bold', width: '22%' }}>
                <div style={{ fontSize: '12pt', fontWeight: 'bold' }}>FQLabs</div>
                <div style={{ fontSize: '7pt', fontWeight: 'normal' }}>
                  123 Lab Drive, Suite 100<br />
                  Science City, CA 90001<br />
                  Tel: (555) 123-4567
                </div>
              </td>
              <td colSpan={allTests.length + 8} style={{ border: '1px solid black', padding: '4px 6px', textAlign: 'center', fontWeight: 'bold', fontSize: '11pt' }}>
                CHAIN OF CUSTODY AND ANALYSIS REQUEST
              </td>
              <td colSpan={4} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt', width: '16%' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ fontSize: '7pt', fontWeight: 'bold', paddingBottom: '1px' }}>DATE:</td>
                      <td style={{ fontSize: '7pt' }}>{formatDateStr(order.date_received)}</td>
                    </tr>
                    <tr>
                      <td style={{ fontSize: '7pt', fontWeight: 'bold', paddingBottom: '1px' }}>PAGE:</td>
                      <td style={{ fontSize: '7pt' }}>1 / 1</td>
                    </tr>
                    <tr>
                      <td style={{ fontSize: '7pt', fontWeight: 'bold', paddingBottom: '1px', whiteSpace: 'nowrap' }}>CUSTOMER NO:</td>
                      <td style={{ fontSize: '7pt' }}>{client?.id ?? ''}</td>
                    </tr>
                    <tr>
                      <td style={{ fontSize: '7pt', fontWeight: 'bold', whiteSpace: 'nowrap' }}>LAB NO:</td>
                      <td style={{ fontSize: '7pt' }}>{(order as any).order_number}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>

            {/* ── Row 2: Client Name / Email ── */}
            <tr>
              <td colSpan={3} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt', fontWeight: 'bold', backgroundColor: '#d0d0d0' }}>CLIENT NAME:</td>
              <td colSpan={Math.ceil((allTests.length + 8) / 2)} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt' }}>
                {client?.client_name ?? order.customer_name ?? ''}
              </td>
              <td colSpan={2} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt', fontWeight: 'bold', backgroundColor: '#d0d0d0' }}>EMAIL:</td>
              <td colSpan={Math.ceil((allTests.length + 6) / 2) + 2} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt' }}>
                {order.customer_email ?? client?.email ?? ''}
              </td>
            </tr>

            {/* ── Row 3: Address ── */}
            <tr>
              <td colSpan={3} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt', fontWeight: 'bold', backgroundColor: '#d0d0d0' }}>ADDRESS:</td>
              <td colSpan={allTests.length + 8 + 4} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt' }}>
                {street}{cityStateZip ? `, ${cityStateZip}` : ''}
              </td>
            </tr>

            {/* ── Row 4: Project Name / No / PO ── */}
            <tr>
              <td colSpan={3} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt', fontWeight: 'bold', backgroundColor: '#d0d0d0' }}>PROJECT NAME:</td>
              <td colSpan={Math.ceil((allTests.length + 6) / 3)} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt' }}>
                {String(coc.project_name ?? '')}
              </td>
              <td colSpan={2} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt', fontWeight: 'bold', backgroundColor: '#d0d0d0', whiteSpace: 'nowrap' }}>PROJECT NO:</td>
              <td colSpan={Math.ceil((allTests.length + 6) / 3)} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt' }}>
                {String(coc.project_number ?? '')}
              </td>
              <td colSpan={2} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt', fontWeight: 'bold', backgroundColor: '#d0d0d0', whiteSpace: 'nowrap' }}>P.O. NO:</td>
              <td colSpan={4} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt' }}>
                {String(coc.po_number ?? '')}
              </td>
            </tr>

            {/* ── Row 5: Project Manager / Phone / Fax ── */}
            <tr>
              <td colSpan={3} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt', fontWeight: 'bold', backgroundColor: '#d0d0d0', whiteSpace: 'nowrap' }}>PROJECT MANAGER:</td>
              <td colSpan={Math.ceil((allTests.length + 6) / 3)} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt' }}>
                {String(coc.project_manager ?? '')}
              </td>
              <td colSpan={2} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt', fontWeight: 'bold', backgroundColor: '#d0d0d0', whiteSpace: 'nowrap' }}>PHONE NO:</td>
              <td colSpan={Math.ceil((allTests.length + 6) / 3)} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt' }}>
                {order.customer_phone ?? ''}
              </td>
              <td colSpan={2} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt', fontWeight: 'bold', backgroundColor: '#d0d0d0', whiteSpace: 'nowrap' }}>FAX NO:</td>
              <td colSpan={4} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt' }}>
                {String(coc.fax_no ?? '')}
              </td>
            </tr>

            {/* ── Row 6: Sampler Name ── */}
            <tr>
              <td colSpan={5} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt', fontWeight: 'bold', backgroundColor: '#d0d0d0', whiteSpace: 'nowrap' }}>
                SAMPLER NAME (PRINTED):
              </td>
              <td colSpan={Math.ceil((allTests.length + 6) / 2)} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt' }}>
                {String(coc.sampler_name ?? '')}
              </td>
              <td colSpan={3} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt', fontWeight: 'bold', backgroundColor: '#d0d0d0' }}>SIGNATURE:</td>
              <td colSpan={4} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt' }}>&nbsp;</td>
            </tr>

            {/* ── Row 7: TAT Legend / Container legend ── */}
            <tr>
              <td colSpan={6} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt', backgroundColor: '#f0f0f0' }}>
                <strong>TAT:</strong>&nbsp; 0=Same Day&nbsp;&nbsp; 1=24hr&nbsp;&nbsp; 2=48hr&nbsp;&nbsp; N=Normal
                &nbsp;&nbsp;|&nbsp;&nbsp;
                <strong>Selected: {tatLabel}</strong>
              </td>
              <td colSpan={allTests.length + 6 + 4} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt', backgroundColor: '#f0f0f0' }}>
                <strong>Container Types:</strong>&nbsp; P=Plastic&nbsp; G=Glass&nbsp; A=Amber&nbsp; T=Teflon&nbsp;&nbsp;
                <strong>Sample Type:</strong>&nbsp; G=Grab&nbsp; C=Composite
              </td>
            </tr>

            {/* ── Column Headers ── */}
            <tr>
              {thd('LAB SAMPLE NO.', { width: '5%' })}
              {thd('DATE SAMPLED', { width: '5%' })}
              {thd('TIME SAMPLED', { width: '4%' })}
              {thd('SAMPLE DESCRIPTION', { width: '12%' })}
              {thd('MATRIX W|O', { width: '3%' })}
              {thd('#', { width: '2%' })}
              {thd('TYPE', { width: '3%' })}
              {thd('G/C', { width: '2%' })}
              {allTests.map((t) => thd(t.code ?? t.name.slice(0, 8), { width: '2%' }))}
              {thd('AIRBILL NO.', { width: '4%' })}
              {thd('COOLER NO.', { width: '4%' })}
              {thd('TEMP °C', { width: '3%' })}
              {thd('REMARKS', { width: '5%' })}
              {thd('SAMPLE CONDITION / COMMENTS', { width: '7%' })}
            </tr>

            {/* ── Sample Rows ── */}
            {displayRows.map((sample: any, idx: number) => {
              let extraMeta: Record<string, string> = {}
              if (sample?.collection_location) {
                try { extraMeta = JSON.parse(sample.collection_location) } catch { /* ignore */ }
              }

              const testSet = new Set<string>(
                (sample?.sample_tests ?? []).map((st: any) => st.tests?.id).filter(Boolean)
              )

              const collDate = sample?.collection_date ?? ''
              const collTime = extraMeta.time_sampled ?? ''

              return (
                <tr key={idx}>
                  {td(sample?.sample_id ?? '')}
                  {td(collDate ? formatDateStr(collDate) : '')}
                  {td(collTime)}
                  {td(sample?.description ?? '')}
                  {td(sample?.matrix_type
                    ? (sample.matrix_type === 'other' ? 'O' : 'W')
                    : '', { align: 'center' })}
                  {td(extraMeta.container_count ?? '', { align: 'center' })}
                  {td(extraMeta.container_type ?? '', { align: 'center' })}
                  {td(extraMeta.sample_type === 'grab' ? 'G' : extraMeta.sample_type === 'composite' ? 'C' : '', { align: 'center' })}
                  {allTests.map((t) => td(testSet.has(t.id) ? '✓' : '', { align: 'center' }))}
                  {/* Airbill / Cooler / Temp / Remarks only on first sample row */}
                  {idx === 0 ? (
                    <>
                      <td rowSpan={displayRows.length} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt', verticalAlign: 'top' }}>
                        {String(coc.airbill_no ?? '')}
                      </td>
                      <td rowSpan={displayRows.length} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt', verticalAlign: 'top' }}>
                        {String(coc.cooler_no ?? '')}
                      </td>
                      <td rowSpan={displayRows.length} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt', verticalAlign: 'top' }}>
                        {String(coc.sample_temp ?? '')}
                      </td>
                      <td rowSpan={displayRows.length} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt', verticalAlign: 'top', whiteSpace: 'pre-wrap' }}>
                        {String(coc.remarks ?? '')}
                      </td>
                    </>
                  ) : null}
                  {td(extraMeta.sample_condition ?? '')}
                </tr>
              )
            })}

            {/* ── Relinquished / Received Row 1 ── */}
            <tr>
              <td colSpan={3} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt', fontWeight: 'bold', backgroundColor: '#d0d0d0' }}>
                RELINQUISHED BY (Signature / Printed):
              </td>
              <td colSpan={3} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt' }}>
                {String(coc.relinquished_by_1 ?? '')}
              </td>
              <td colSpan={1} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt', fontWeight: 'bold', backgroundColor: '#d0d0d0' }}>DATE:</td>
              <td colSpan={2} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt' }}>
                {String(coc.relinquished_date_1 ?? '')}
              </td>
              <td colSpan={1} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt', fontWeight: 'bold', backgroundColor: '#d0d0d0' }}>TIME:</td>
              <td colSpan={2} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt' }}>
                {String(coc.relinquished_time_1 ?? '')}
              </td>
              <td colSpan={3} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt', fontWeight: 'bold', backgroundColor: '#d0d0d0' }}>
                RECEIVED BY (Signature / Printed):
              </td>
              <td colSpan={2} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt' }}>
                {String(coc.received_by_1 ?? '')}
              </td>
              <td colSpan={1} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt', fontWeight: 'bold', backgroundColor: '#d0d0d0' }}>DATE:</td>
              <td colSpan={2} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt' }}>
                {String(coc.received_date_1 ?? '')}
              </td>
              <td colSpan={1} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt', fontWeight: 'bold', backgroundColor: '#d0d0d0' }}>TIME:</td>
              <td colSpan={allTests.length > 0 ? allTests.length - 1 : 1} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt' }}>
                {String(coc.received_time_1 ?? '')}
              </td>
            </tr>

            {/* ── Relinquished / Received Row 2 ── */}
            <tr>
              <td colSpan={3} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt', fontWeight: 'bold', backgroundColor: '#d0d0d0' }}>
                RELINQUISHED BY (Signature / Printed):
              </td>
              <td colSpan={3} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt' }}>
                {String(coc.relinquished_by_2 ?? '')}
              </td>
              <td colSpan={1} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt', fontWeight: 'bold', backgroundColor: '#d0d0d0' }}>DATE:</td>
              <td colSpan={2} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt' }}>
                {String(coc.relinquished_date_2 ?? '')}
              </td>
              <td colSpan={1} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt', fontWeight: 'bold', backgroundColor: '#d0d0d0' }}>TIME:</td>
              <td colSpan={2} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt' }}>
                {String(coc.relinquished_time_2 ?? '')}
              </td>
              <td colSpan={3} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt', fontWeight: 'bold', backgroundColor: '#d0d0d0' }}>
                RECEIVED BY (Signature / Printed):
              </td>
              <td colSpan={2} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt' }}>
                {String(coc.received_by_2 ?? '')}
              </td>
              <td colSpan={1} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt', fontWeight: 'bold', backgroundColor: '#d0d0d0' }}>DATE:</td>
              <td colSpan={2} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt' }}>
                {String(coc.received_date_2 ?? '')}
              </td>
              <td colSpan={1} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt', fontWeight: 'bold', backgroundColor: '#d0d0d0' }}>TIME:</td>
              <td colSpan={allTests.length > 0 ? allTests.length - 1 : 1} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt' }}>
                {String(coc.received_time_2 ?? '')}
              </td>
            </tr>

            {/* ── Compliance Row ── */}
            <tr>
              <td colSpan={8} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt' }}>
                <strong>Is this a compliance drinking water sample?</strong>&nbsp;&nbsp;
                <span style={{ border: '1px solid black', padding: '1px 5px', marginRight: 4, backgroundColor: coc.is_compliance_drinking_water === true ? '#333' : 'transparent', color: coc.is_compliance_drinking_water === true ? 'white' : 'inherit' }}>YES</span>
                <span style={{ border: '1px solid black', padding: '1px 5px', backgroundColor: coc.is_compliance_drinking_water === false ? '#333' : 'transparent', color: coc.is_compliance_drinking_water === false ? 'white' : 'inherit' }}>NO</span>
              </td>
              <td colSpan={4} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt', fontWeight: 'bold', backgroundColor: '#d0d0d0' }}>SIGN &amp; PRINT NAME:</td>
              <td colSpan={Math.ceil((allTests.length + 6) / 2)} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt' }}>
                {String(coc.sign_print ?? '')}
              </td>
              <td colSpan={2} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt', fontWeight: 'bold', backgroundColor: '#d0d0d0' }}>DATE:</td>
              <td colSpan={4} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt' }}>
                {String(coc.sign_date ?? '')}
              </td>
            </tr>

            {/* ── Special Instructions ── */}
            <tr>
              <td colSpan={6} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt', fontWeight: 'bold', backgroundColor: '#d0d0d0' }}>
                SPECIAL INSTRUCTIONS:
              </td>
              <td colSpan={allTests.length + 8 + 4 - 6} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt', whiteSpace: 'pre-wrap' }}>
                {String(coc.special_instructions ?? '')}
              </td>
            </tr>

            {/* ── Sample Disposition ── */}
            <tr>
              <td colSpan={6} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt' }}>
                <strong>SAMPLE DISPOSITION:</strong>&nbsp; Samples returned to client?&nbsp;&nbsp;
                <span style={{ border: '1px solid black', padding: '1px 5px', marginRight: 4, backgroundColor: coc.samples_returned_to_client === true ? '#333' : 'transparent', color: coc.samples_returned_to_client === true ? 'white' : 'inherit' }}>YES</span>
                <span style={{ border: '1px solid black', padding: '1px 5px', backgroundColor: coc.samples_returned_to_client === false ? '#333' : 'transparent', color: coc.samples_returned_to_client === false ? 'white' : 'inherit' }}>NO</span>
              </td>
              <td colSpan={4} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt', fontWeight: 'bold', backgroundColor: '#d0d0d0' }}>
                STORAGE DAYS REQUESTED:
              </td>
              <td colSpan={allTests.length + 8 - 4} style={{ border: '1px solid black', padding: '2px 3px', fontSize: '7pt' }}>
                {String(coc.storage_days ?? '')}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  )
}
