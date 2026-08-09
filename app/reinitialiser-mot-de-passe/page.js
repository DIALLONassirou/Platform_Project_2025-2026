'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ReinitialiserMotDePassePage() {
  const supabase = createClient()
  const router = useRouter()

  const [checkingSession, setCheckingSession] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      setHasSession(!!session)
      setCheckingSession(false)
    }

    checkSession()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }

    if (password !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)

    const { error: updateError } = await supabase.auth.updateUser({ password })

    setLoading(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setSuccess(true)
    setTimeout(() => router.push('/profil'), 2000)
  }

  if (checkingSession) return <p className="p-6 text-center">Vérification du lien...</p>

  if (!hasSession) {
    return (
      <div className="max-w-md mx-auto mt-12 p-6 text-center">
        <p className="text-red-600 mb-4">
          Ce lien de réinitialisation est invalide ou a expiré.
        </p>
        <a href="/mot-de-passe-oublie" className="text-blue-600 underline">
          Demander un nouveau lien
        </a>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto mt-12 p-6">
      <h1 className="text-2xl font-bold mb-6">Choisir un nouveau mot de passe</h1>

      {success ? (
        <div className="bg-green-50 border border-green-300 text-green-800 text-sm p-4 rounded-lg">
          Mot de passe mis à jour ! Redirection vers ton profil...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="Nouveau mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            className="w-full border rounded-lg p-3"
          />
          <input
            type="password"
            placeholder="Confirme le mot de passe"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            className="w-full border rounded-lg p-3"
          />

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50"
          >
            {loading ? 'Enregistrement...' : 'Enregistrer le mot de passe'}
          </button>
        </form>
      )}
    </div>
  )
}