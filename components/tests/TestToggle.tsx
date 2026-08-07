'use client'

import { useTransition } from 'react'
import { toggleTestActive } from '@/app/actions/tests'
import toast from 'react-hot-toast'

export default function TestToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const [pending, startTransition] = useTransition()

  function handle() {
    startTransition(async () => {
      try {
        await toggleTestActive(id, !isActive)
        toast.success(isActive ? 'Test deactivated' : 'Test activated')
      } catch (err: any) {
        toast.error(err.message ?? 'Failed')
      }
    })
  }

  return (
    <button
      onClick={handle}
      disabled={pending}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${
        isActive ? 'bg-green-500' : 'bg-slate-200'
      }`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
        isActive ? 'translate-x-4.5' : 'translate-x-0.5'
      }`} />
    </button>
  )
}
