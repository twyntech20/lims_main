import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  const { data: clients, error } = await supabase
    .from('clients')
    .select('client_id, client_name, email, phone, address, city, state, zip, tags, created_at')
    .order('client_name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const headers = ['client_id', 'client_name', 'email', 'phone', 'address', 'city', 'state', 'zip', 'tags']
  const rows = (clients ?? []).map(c =>
    headers.map(h => {
      const val = (c as any)[h] ?? ''
      return `"${String(val).replace(/"/g, '""')}"`
    }).join(',')
  )

  const csv = [headers.join(','), ...rows].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="clients-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
