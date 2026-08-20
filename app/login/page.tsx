'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Lock, Loader2 } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import Image from 'next/image'
import Link from 'next/link'

export default function StaffLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }
    router.refresh()
    router.push('/?portal=staff')
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <Toaster position="top-center" />

      <div className="bg-white rounded-lg shadow-md w-full max-w-sm p-8">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Image
            src="https://fqlabs.com/wp-content/uploads/2020/01/weblogo.png"
            alt="FQLabs"
            width={190}
            height={72}
            style={{ objectFit: 'contain' }}
            unoptimized
          />
        </div>

        <h2 className="text-xl font-bold text-center text-gray-800 mb-6">
          FQLabs STAFF Portal
        </h2>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="Email"
            className="w-full border border-gray-300 rounded px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            placeholder="Password"
            className="w-full border border-gray-300 rounded px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 rounded flex items-center justify-center gap-2 transition"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Lock className="w-4 h-4" />
            )}
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <Link href="/auth/reset-password" className="text-sm text-blue-600 hover:text-blue-800">
            Forgot your password?
          </Link>
        </div>

        <div className="mt-6 border-t border-gray-100 pt-5 text-center">
          <p className="text-sm text-gray-500 mb-3">Are you a client?</p>
          <Link
            href="/client-login"
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded text-center transition text-sm"
          >
            Go to Client Portal
          </Link>
        </div>
      </div>
    </div>
  )
}
