'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SOCIAL_PLATFORMS } from '@/lib/socialPlatforms'

export default function InscriptionPage() {
  const router = useRouter()
  const supabase = createClient()

  const [accountType, setAccountType] = useState(null) // 'influencer' ou 'business'
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [city, setCity] = useState('')
  const [socials, setSocials] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [awaitingCode, setAwaitingCode] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendMessage, setResendMessage] = useState(null)

  function updateSocial(key, field, value) {
    setSocials({ ...socials, [`${key}_${field}`]: value })
  }

  async function createProfileRows(userId) {
    // 1. Créer la ligne dans la table "profiles" (commune)
    const { error: profileError } = await supabase.from('profiles').insert({
      id: userId,
      account_type: accountType,
      full_name: fullName,
      phone,
      city,
    })

    if (profileError) {
      setError(profileError.message)
      return false
    }

    // 2. Créer la ligne spécifique (influenceur ou entreprise) avec des valeurs par défaut
    if (accountType === 'influencer') {
      const socialFields = {}
      SOCIAL_PLATFORMS.forEach(({ key }) => {
        const url = socials[`${key}_url`]
        const followers = socials[`${key}_followers`]
        if (url) socialFields[`${key}_url`] = url
        if (followers) socialFields[`${key}_followers`] = parseInt(followers, 10)
      })

      await supabase.from('influencer_profiles').insert({
        id: userId,
        whatsapp_number: phone,
        ...socialFields,
      })
    } else {
      await supabase.from('business_profiles').insert({
        id: userId,
        company_name: fullName,
      })
    }

    return true
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!accountType) {
      setError('Merci de choisir un type de compte.')
      return
    }

    setLoading(true)

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    })

    setLoading(false)

    if (signUpError) {
      setError(signUpError.message)
      return
    }

    setAwaitingCode(true)
  }

  async function handleVerifyCode(e) {
    e.preventDefault()
    setError(null)
    setVerifying(true)

    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: verificationCode,
      type: 'signup',
    })

    if (verifyError) {
      setError(verifyError.message)
      setVerifying(false)
      return
    }

    const userId = data.user?.id
    if (!userId) {
      setError("Une erreur est survenue lors de la vérification. Réessaie.")
      setVerifying(false)
      return
    }

    const ok = await createProfileRows(userId)
    setVerifying(false)

    if (ok) {
      router.push('/profil')
    }
  }

  async function handleResendCode() {
    setResending(true)
    setError(null)
    setResendMessage(null)

    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email,
    })

    setResending(false)

    if (resendError) {
      setError(resendError.message)
      return
    }

    setResendMessage('Un nouveau code vient d’être envoyé.')
  }

  return (
    <div className="max-w-md mx-auto mt-12 p-6">
      <h1 className="text-2xl font-bold mb-6">Créer un compte</h1>

      {/* Étape 1 : choix du type de compte */}
      {!accountType && (
        <div className="space-y-4">
          <p className="text-gray-600">Tu es...</p>
          <button
            onClick={() => setAccountType('influencer')}
            className="w-full py-4 rounded-lg border-2 border-blue-500 text-blue-600 font-semibold hover:bg-blue-50"
          >
            Influenceur / Créateur de contenu
          </button>
          <button
            onClick={() => setAccountType('business')}
            className="w-full py-4 rounded-lg border-2 border-green-500 text-green-600 font-semibold hover:bg-green-50"
          >
            Entreprise / Artiste
          </button>
        </div>
      )}

      {/* Étape 3 : vérification du code reçu par email */}
      {accountType && awaitingCode && (
        <form onSubmit={handleVerifyCode} className="space-y-4">
          <p className="text-gray-600 text-sm">
            Un code de vérification à 6 chiffres a été envoyé à <strong>{email}</strong>.
            Saisis-le ci-dessous pour finaliser la création de ton compte.
          </p>

          <input
            type="text"
            inputMode="numeric"
            placeholder="Code de vérification"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            required
            maxLength={6}
            className="w-full border rounded-lg p-3 text-center text-lg tracking-widest"
          />

          {error && <p className="text-red-600 text-sm">{error}</p>}
          {resendMessage && <p className="text-green-600 text-sm">{resendMessage}</p>}

          <button
            type="submit"
            disabled={verifying}
            className="w-full py-3 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50"
          >
            {verifying ? 'Vérification...' : 'Vérifier le code'}
          </button>

          <button
            type="button"
            onClick={handleResendCode}
            disabled={resending}
            className="w-full text-sm text-blue-600 underline disabled:opacity-50"
          >
            {resending ? 'Envoi en cours...' : 'Renvoyer le code'}
          </button>
        </form>
      )}

      {/* Étape 2 : formulaire */}
      {accountType && !awaitingCode && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-gray-500">
            Compte : <strong>{accountType === 'influencer' ? 'Influenceur' : 'Entreprise'}</strong>{' '}
            <button type="button" onClick={() => setAccountType(null)} className="underline">
              (changer)
            </button>
          </p>

          <input
            type="text"
            placeholder={accountType === 'influencer' ? 'Nom complet' : 'Nom de l’entreprise'}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="w-full border rounded-lg p-3"
          />

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border rounded-lg p-3"
          />

          <input
            type="tel"
            placeholder="Numéro de téléphone (WhatsApp)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            className="w-full border rounded-lg p-3"
          />

          <input
            type="text"
            placeholder="Ville (ex: Conakry)"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full border rounded-lg p-3"
          />

          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full border rounded-lg p-3"
          />

          {accountType === 'influencer' && (
            <div className="pt-2">
              <p className="text-sm font-semibold text-gray-700 mb-1">Tes réseaux sociaux</p>
              <p className="text-xs text-gray-500 mb-3">
                Renseigne uniquement les réseaux que tu utilises (facultatif).
              </p>
              <div className="space-y-3">
                {SOCIAL_PLATFORMS.map(({ key, label }) => (
                  <div key={key} className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder={`Lien ${label}`}
                      value={socials[`${key}_url`] || ''}
                      onChange={(e) => updateSocial(key, 'url', e.target.value)}
                      className="w-full border rounded-lg p-2 text-sm"
                    />
                    <input
                      type="number"
                      min="0"
                      placeholder="Nb followers"
                      value={socials[`${key}_followers`] || ''}
                      onChange={(e) => updateSocial(key, 'followers', e.target.value)}
                      className="w-full border rounded-lg p-2 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50"
          >
            {loading ? 'Création en cours...' : 'Créer mon compte'}
          </button>
        </form>
      )}
    </div>
  )
}