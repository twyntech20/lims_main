'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FlaskConical, Loader2, ArrowLeft } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
    })
    setLoading(false)
    if (error) { toast.error(error.message); return }
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <Toaster position="top-center" />
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-600 rounded-2xl p-4 mb-4">
            <FlaskConical className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Reset Password</h1>
        </div>
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
          {sent ? (
            <div className="text-center">
              <div className="text-green-400 text-5xl mb-4">✓</div>
              <p className="text-white font-medium mb-2">Check your email</p>
              <p className="text-slate-400 text-sm">We sent a password reset link to {email}</p>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-5">
              <p className="text-slate-400 text-sm">Enter your email and we'll send you a reset link.</p>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  placeholder="you@company.com"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Send reset link
              </button>
            </form>
          )}
          <Link href="/login" className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mt-6 transition">
            <ArrowLeft className="w-4 h-4" /> Back to login
          </Link>
        </div>
      </div>
    </div>
  )
}
