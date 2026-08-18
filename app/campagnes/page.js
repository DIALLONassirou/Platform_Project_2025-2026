'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const CATEGORIES = ['mode', 'beauté', 'food', 'lifestyle', 'tech', 'événementiel']

export default function CampagnesPage() {
  const supabase = createClient()
  const router = useRouter()

  const [currentUserId, setCurrentUserId] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [interestsByCampaign, setInterestsByCampaign] = useState({})
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      setCurrentUserId(user?.id || null)

      const { data, error } = await supabase
        .from('campaigns')
        .select(
          `
          id, title, description, budget, category, image_url, creator_id, created_at,
          creator:creator_id ( full_name, account_type, city, is_certified )
        `
        )
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (!error) setCampaigns(data || [])
      setLoading(false)
    }

    load()
  }, [])

  const filtered = campaigns.filter((c) => !categoryFilter || c.category === categoryFilter)

  async function loadInterests(campaignId) {
    const { data } = await supabase
      .from('campaign_interests')
      .select('interested_user_id, profile:interested_user_id ( full_name )')
      .eq('campaign_id', campaignId)

    setInterestsByCampaign((prev) => ({ ...prev, [campaignId]: data || [] }))
  }

  async function toggleInterestsPanel(campaignId) {
    if (expandedId === campaignId) {
      setExpandedId(null)
      return
    }

    setExpandedId(campaignId)
    if (!interestsByCampaign[campaignId]) {
      await loadInterests(campaignId)
    }
  }

  async function handleInterested(campaign) {
    if (!currentUserId) {
      router.push('/connexion')
      return
    }

    await supabase.from('campaign_interests').insert({
      campaign_id: campaign.id,
      interested_user_id: currentUserId,
    })

    router.push(`/messages/${campaign.creator_id}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Campagnes</h1>
          <Link
            href="/campagnes/nouvelle"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700"
          >
            Publier une campagne
          </Link>
        </div>

        <div className="mb-8">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border rounded-lg p-2 bg-white"
          >
            <option value="">Toutes les catégories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {loading && <p className="text-gray-600">Chargement...</p>}
        {!loading && filtered.length === 0 && (
          <p className="text-gray-600">Aucune campagne pour l&apos;instant.</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((c) => {
            const isMine = c.creator_id === currentUserId
            const interests = interestsByCampaign[c.id] || []

            return (
              <div key={c.id} className="bg-white border rounded-xl p-4 shadow-sm">
                {c.image_url && (
                  <img
                    src={c.image_url}
                    alt={c.title}
                    className="w-full h-40 object-cover rounded-lg mb-3"
                  />
                )}

                <div className="flex items-start justify-between mb-2">
                  <h2 className="font-semibold text-gray-900">{c.title}</h2>
                  {c.category && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                      {c.category}
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-700 mb-2">{c.description}</p>

                {c.budget && (
                  <p className="text-xs text-gray-500 mb-2">Budget indicatif : {c.budget}</p>
                )}

                <p className="text-xs text-gray-500 mb-3">
                  Publié par{' '}
                  <span className="font-medium text-gray-700">
                    {c.creator?.full_name}
                    {c.creator?.is_certified && <span className="text-yellow-500"> ⭐</span>}
                  </span>
                  {c.creator?.city ? ` · ${c.creator.city}` : ''}
                </p>

                {isMine ? (
                  <div>
                    <button
                      type="button"
                      onClick={() => toggleInterestsPanel(c.id)}
                      className="w-full py-2 rounded-lg border border-blue-500 text-blue-600 text-sm font-semibold"
                    >
                      {expandedId === c.id
                        ? 'Masquer les intéressés'
                        : 'Voir les personnes intéressées'}
                    </button>

                    {expandedId === c.id && (
                      <div className="mt-2 space-y-1">
                        {interests.length === 0 && (
                          <p className="text-xs text-gray-500">
                            Personne n&apos;a encore manifesté d&apos;intérêt.
                          </p>
                        )}
                        {interests.map((i) => (
                          <div
                            key={i.interested_user_id}
                            className="flex items-center justify-between text-sm border rounded-lg px-3 py-2"
                          >
                            <span>{i.profile?.full_name || 'Utilisateur'}</span>
                            <Link
                              href={`/messages/${i.interested_user_id}`}
                              className="text-blue-600 text-xs hover:underline"
                            >
                              Envoyer un message
                            </Link>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleInterested(c)}
                    className="w-full py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
                  >
                    Je suis intéressé
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
