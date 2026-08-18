'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ChangerMotDePassePage() {
  const supabase = createClient()
  const router = useRouter()
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/connexion')
        return
      }

      setCheckingAuth(false)
    }

    checkAuth()
  }, [])

  async function handlePasswordChange(e) {
    e.preventDefault()
    const newPassword = e.target.newPassword.value

    if (newPassword.length < 6) {
      alert('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      alert('Erreur : ' + error.message)
      return
    }

    alert('Mot de passe mis à jour avec succès ! Note-le bien quelque part.')
    e.target.reset()
  }

  if (checkingAuth) return <p className="p-6">Chargement...</p>

  return (
    <div className="max-w-md mx-auto mt-12 p-6">
      <h1 className="text-2xl font-bold mb-6">Modifier mon mot de passe</h1>

      <form onSubmit={handlePasswordChange} className="flex gap-2">
        <input
          type="password"
          name="newPassword"
          placeholder="Nouveau mot de passe"
          required
          minLength={6}
          className="flex-1 border rounded-lg p-3"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-gray-700 text-white text-sm font-semibold"
        >
          Modifier
        </button>
      </form>
    </div>
  )
}
