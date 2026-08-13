'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { changePassword } from '@/app/actions/profile'
import { FlaskConical, Loader2 } from 'lucide-react'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await changePassword(formData)
        setDone(true)
        // Root page redirects by role once a session exists.
        setTimeout(() => router.push('/'), 1200)
      } catch (err: any) {
        setError(err.message ?? 'Failed to update password')
      }
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-600 rounded-2xl p-4 mb-4">
            <FlaskConical className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Set New Password</h1>
        </div>
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
          {done ? (
            <div className="text-center">
              <div className="text-green-400 text-5xl mb-4">✓</div>
              <p className="text-white font-medium">Password updated — redirecting…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">New Password</label>
                <input
                  type="password"
                  name="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  placeholder="At least 8 characters"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Confirm New Password</label>
                <input
                  type="password"
                  name="confirm_password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  placeholder="Repeat password"
                />
              </div>
              <button
                type="submit"
                disabled={pending}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
              >
                {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {pending ? 'Saving…' : 'Set Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
