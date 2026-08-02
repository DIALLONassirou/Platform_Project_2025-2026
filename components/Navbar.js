'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function Navbar() {
  const supabase = createClient()
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    checkUser()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/connexion')
  }

  return (
    <nav className="border-b bg-white sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-bold text-blue-600">
          Plateforme Influenceurs
        </Link>

        <div className="flex items-center gap-4 text-sm">
          <Link href="/annuaire" className="text-gray-700 hover:text-blue-600">
            Annuaire
          </Link>

          {!loading && user && (
            <>
              <Link href="/profil" className="text-gray-700 hover:text-blue-600">
                Mon profil
              </Link>
              <button onClick={handleLogout} className="text-red-600 hover:underline">
                Se déconnecter
              </button>
            </>
          )}

          {!loading && !user && (
            <>
              <Link href="/connexion" className="text-gray-700 hover:text-blue-600">
                Se connecter
              </Link>
              <Link
                href="/inscription"
                className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
              >
                Créer un compte
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}