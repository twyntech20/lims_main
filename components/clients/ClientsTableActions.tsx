'use client'

import { useRef, useState, useTransition } from 'react'
import { Download, Upload, Loader2 } from 'lucide-react'
import { importClientsCSV } from '@/app/actions/clients'
import toast, { Toaster } from 'react-hot-toast'

export default function ClientsTableActions() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [importing, startImport] = useTransition()

  function handleExport() {
    window.location.href = '/api/admin/clients/export'
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.set('file', file)
    startImport(async () => {
      try {
        await importClientsCSV(fd)
        toast.success('Clients imported successfully')
      } catch (err: any) {
        toast.error(err.message ?? 'Import failed')
      } finally {
        if (fileRef.current) fileRef.current.value = ''
      }
    })
  }

  return (
    <>
      <Toaster position="top-center" />
      <button
        onClick={handleExport}
        className="flex items-center gap-1.5 border border-slate-200 text-slate-600 hover:text-slate-900 font-medium px-3 py-2 rounded-xl text-sm transition"
      >
        <Download className="w-4 h-4" /> Export
      </button>
      <button
        onClick={() => fileRef.current?.click()}
        disabled={importing}
        className="flex items-center gap-1.5 border border-slate-200 text-slate-600 hover:text-slate-900 font-medium px-3 py-2 rounded-xl text-sm transition disabled:opacity-50"
      >
        {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        Import
      </button>
      <input ref={fileRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={handleFileChange} />
    </>
  )
}
