'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const CATEGORIES = ['mode', 'beauté', 'food', 'lifestyle', 'tech', 'événementiel']

export default function NouvelleCampagnePage() {
  const supabase = createClient()
  const router = useRouter()

  const [checkingAuth, setCheckingAuth] = useState(true)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [budget, setBudget] = useState('')
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

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

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error: insertError } = await supabase.from('campaigns').insert({
      creator_id: user.id,
      title: title.trim(),
      description: description.trim(),
      budget: budget.trim() || null,
      category: category || null,
    })

    setLoading(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    router.push('/campagnes')
  }

  if (checkingAuth) return <p className="p-6">Chargement...</p>

  return (
    <div className="max-w-md mx-auto mt-12 p-6">
      <h1 className="text-2xl font-bold mb-6">Publier une campagne</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Titre de la campagne"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full border rounded-lg p-3"
        />

        <textarea
          placeholder="Décris la campagne : objectifs, ce que tu recherches..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={5}
          className="w-full border rounded-lg p-3"
        />

        <input
          type="text"
          placeholder="Budget indicatif (ex: 50 000 - 200 000 GNF)"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          className="w-full border rounded-lg p-3"
        />

        <div>
          <p className="text-sm text-gray-600 mb-2">Catégorie</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                type="button"
                key={cat}
                onClick={() => setCategory(category === cat ? '' : cat)}
                className={`px-3 py-1 rounded-full text-sm border ${
                  category === cat
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50"
        >
          {loading ? 'Publication...' : 'Publier la campagne'}
        </button>
      </form>
    </div>
  )
}
