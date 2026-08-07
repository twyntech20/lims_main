import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import EditTestForm from '@/components/tests/EditTestForm'

interface Props { params: Promise<{ id: string }> }

export default async function EditTestPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: test, error } = await supabase
    .from('tests')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !test) notFound()

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/tests" className="text-slate-400 hover:text-slate-600 transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Edit Test</h1>
          <p className="text-slate-500 text-sm">{test.name}</p>
        </div>
      </div>

      <EditTestForm test={test} />
    </div>
  )
}
