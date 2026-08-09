'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function MotDePasseOubliePage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const redirectUrl = `${window.location.origin}/reinitialiser-mot-de-passe`

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    })

    setLoading(false)

    if (resetError) {
      setError(resetError.message)
      return
    }

    setSent(true)
  }

  return (
    <div className="max-w-md mx-auto mt-12 p-6">
      <h1 className="text-2xl font-bold mb-2">Mot de passe oublié</h1>
      <p className="text-gray-600 text-sm mb-6">
        Entre ton adresse email, on t'enverra un lien pour choisir un nouveau mot de passe.
      </p>

      {sent ? (
        <div className="bg-green-50 border border-green-300 text-green-800 text-sm p-4 rounded-lg">
          Si un compte existe avec cet email, un lien de réinitialisation vient d'être envoyé.
          Vérifie ta boîte mail (et le dossier spam si besoin).
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Ton email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="off"
            className="w-full border rounded-lg p-3"
          />

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50"
          >
            {loading ? 'Envoi en cours...' : 'Envoyer le lien'}
          </button>
        </form>
      )}

      <p className="mt-6 text-sm text-center">
        <a href="/connexion" className="text-blue-600 underline">
          Retour à la connexion
        </a>
      </p>
    </div>
  )
}