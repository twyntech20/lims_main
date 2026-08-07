'use client'

import { useTransition, useState } from 'react'
import { forceChangePassword } from '@/app/actions/profile'
import { Loader2 } from 'lucide-react'

const INPUT_CLS =
  'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const LABEL_CLS = 'block text-sm font-medium text-slate-700 mb-1.5'

export default function ForcePasswordChangePage() {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await forceChangePassword(formData)
      } catch (err: any) {
        if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
        setError(err.message ?? 'Failed to change password')
      }
    })
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 w-full max-w-md space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Password Change Required</h1>
          <p className="text-slate-500 text-sm mt-1">
            You must set a new password before continuing. It must be different from your temporary password.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={LABEL_CLS}>New Password</label>
            <input
              type="password"
              name="password"
              autoComplete="new-password"
              minLength={8}
              required
              className={INPUT_CLS}
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <label className={LABEL_CLS}>Confirm New Password</label>
            <input
              type="password"
              name="confirm_password"
              autoComplete="new-password"
              minLength={8}
              required
              className={INPUT_CLS}
              placeholder="Repeat password"
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white font-semibold px-5 py-2.5 rounded-xl transition shadow-sm text-sm"
          >
            {pending && <Loader2 className="w-4 h-4 animate-spin" />}
            {pending ? 'Saving…' : 'Set New Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
