'use client'

import { useRef, useState, useTransition } from 'react'
import { Download, Upload, Loader2 } from 'lucide-react'
import { importClientsCSV } from '@/app/actions/clients'
import toast, { Toaster } from 'react-hot-toast'
import { buttonClass } from '@/components/ui/primitives'

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
      <button onClick={handleExport} className={buttonClass('secondary')}>
        <Download className="h-3.5 w-3.5" /> Export
      </button>
      <button
        onClick={() => fileRef.current?.click()}
        disabled={importing}
        className={buttonClass('secondary')}
      >
        {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        Import
      </button>
      <input ref={fileRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={handleFileChange} />
    </>
  )
}
