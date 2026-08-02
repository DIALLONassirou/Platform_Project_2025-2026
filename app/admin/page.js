'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// IMPORTANT : cette page n'est pas encore sécurisée par un vrai contrôle d'accès admin.
// A ce stade (petite échelle), protège-la simplement en ne partageant pas l'URL.
// Pour une V2, il faudra ajouter un champ "role: admin" + policy RLS dédiée.

export default function AdminPage() {
  const supabase = createClient()
  const [pendingProfiles, setPendingProfiles] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetchPending() {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_verified', false)
      .order('created_at', { ascending: false })

    if (!error) setPendingProfiles(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchPending()
  }, [])

  async function validateProfile(id) {
    await supabase.from('profiles').update({ is_verified: true }).eq('id', id)
    fetchPending()
  }

  async function rejectProfile(id) {
    await supabase.from('profiles').update({ is_active: false }).eq('id', id)
    fetchPending()
  }

  if (loading) return <p className="p-6">Chargement...</p>

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Comptes en attente de validation</h1>

      {pendingProfiles.length === 0 && <p>Aucun compte en attente.</p>}

      <div className="space-y-4">
        {pendingProfiles.map((p) => (
          <div key={p.id} className="border rounded-lg p-4 flex justify-between items-center">
            <div>
              <p className="font-semibold">{p.full_name}</p>
              <p className="text-sm text-gray-500">
                {p.account_type === 'influencer' ? 'Influenceur' : 'Entreprise'} — {p.city} —{' '}
                {p.phone}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => validateProfile(p.id)}
                className="px-3 py-1 rounded-lg bg-green-600 text-white text-sm"
              >
                Valider
              </button>
              <button
                onClick={() => rejectProfile(p.id)}
                className="px-3 py-1 rounded-lg bg-red-600 text-white text-sm"
              >
                Rejeter
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}