'use server'

import { createClient } from '@/lib/supabase/server'

export async function logReportGenerated(orderId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'pdf_generated',
    table_name: 'orders',
    record_id: orderId,
  })
}
