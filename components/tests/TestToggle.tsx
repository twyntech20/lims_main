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
      role="switch"
      aria-checked={isActive}
      aria-label={isActive ? 'Deactivate test' : 'Activate test'}
      title={isActive ? 'Active — click to deactivate' : 'Inactive — click to activate'}
      className={`relative inline-flex h-4.5 w-8 items-center rounded-full transition-colors disabled:opacity-50 ${
        isActive ? 'bg-ok-fg' : 'bg-line-strong'
      }`}
    >
      <span className={`inline-block h-3 w-3 transform rounded-full bg-white shadow-xs transition-transform ${
        isActive ? 'translate-x-4' : 'translate-x-1'
      }`} />
    </button>
  )
}
