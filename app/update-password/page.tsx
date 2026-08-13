'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { changePassword } from '@/app/actions/profile'
import { FlaskConical, Loader2 } from 'lucide-react'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    // The recovery link lands here with the session encoded in the URL's
    // hash fragment (Supabase's hosted /verify redirect), not a query
    // param — the server-side callback route can never see it. The
    // browser client's default detectSessionInUrl behavior consumes that
    // fragment as soon as it's constructed; we just need to wait for it
    // before letting the form submit, since changePassword() (a server
    // action) needs the resulting session cookie to already be set.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setHasSession(true)
        setCheckingSession(false)
      }
    })
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setHasSession(true)
      setCheckingSession(false)
    })
    return () => subscription.unsubscribe()
  }, [])

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
          {checkingSession ? (
            <div className="text-center py-4">
              <Loader2 className="w-6 h-6 text-slate-400 animate-spin mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Verifying your reset link…</p>
            </div>
          ) : !hasSession ? (
            <div className="text-center py-4">
              <p className="text-red-300 font-medium mb-2">This reset link is invalid or has expired.</p>
              <p className="text-slate-400 text-sm">Request a new one from the reset password page.</p>
            </div>
          ) : done ? (
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
