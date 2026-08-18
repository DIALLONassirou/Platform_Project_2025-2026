'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function Navbar() {
  const supabase = createClient()
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single()
        setIsAdmin(profile?.is_admin || false)
      }

      setLoading(false)
    }

    checkUser()

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user || null)

      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', session.user.id)
          .single()
        setIsAdmin(profile?.is_admin || false)
      } else {
        setIsAdmin(false)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    setMenuOpen(false)
    router.push('/connexion')
  }

  return (
    <nav className="border-b bg-white sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Ouvrir le menu"
          className="text-gray-700 hover:text-blue-600 text-xl leading-none px-1"
        >
          ☰
        </button>

        <Link href="/" className="font-bold text-blue-600">
          Plateforme Influenceurs
        </Link>

        <div className="flex items-center gap-4 text-sm ml-auto">
          <Link href="/annuaire" className="text-gray-700 hover:text-blue-600">
            Annuaire
          </Link>
        </div>
      </div>

      <div className={`fixed inset-0 z-20 ${menuOpen ? '' : 'pointer-events-none'}`}>
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${
            menuOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setMenuOpen(false)}
        />
        <div
          className={`absolute left-0 top-0 h-full w-64 bg-white shadow-xl p-6 flex flex-col gap-4 text-sm transition-transform duration-200 ${
            menuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold text-gray-900">Menu</span>
            <button
              onClick={() => setMenuOpen(false)}
              aria-label="Fermer le menu"
              className="text-gray-500 hover:text-gray-800 text-xl leading-none"
            >
              ×
            </button>
          </div>

          <Link
            href="/campagnes"
            onClick={() => setMenuOpen(false)}
            className="text-gray-700 hover:text-blue-600"
          >
            Campagnes
          </Link>

          {!loading && user && (
            <>
              <Link
                href="/profil"
                onClick={() => setMenuOpen(false)}
                className="text-gray-700 hover:text-blue-600"
              >
                Mon profil
              </Link>
              <Link
                href="/profil/mot-de-passe"
                onClick={() => setMenuOpen(false)}
                className="text-gray-700 hover:text-blue-600"
              >
                Modifier mon mot de passe
              </Link>
              <Link
                href="/messages"
                onClick={() => setMenuOpen(false)}
                className="text-gray-700 hover:text-blue-600"
              >
                Messages
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setMenuOpen(false)}
                  className="text-purple-700 font-semibold hover:text-purple-900"
                >
                  Admin
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="text-left text-red-600 hover:underline"
              >
                Se déconnecter
              </button>
            </>
          )}

          {!loading && !user && (
            <>
              <Link
                href="/connexion"
                onClick={() => setMenuOpen(false)}
                className="text-gray-700 hover:text-blue-600"
              >
                Se connecter
              </Link>
              <Link
                href="/inscription"
                onClick={() => setMenuOpen(false)}
                className="bg-blue-600 text-white px-3 py-2 rounded-lg text-center hover:bg-blue-700"
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