'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { REACTIONS } from '@/lib/reactions'

const CATEGORIES = ['mode', 'beauté', 'food', 'lifestyle', 'tech', 'événementiel']

export default function CampagnesPage() {
  const supabase = createClient()
  const router = useRouter()

  const [currentUserId, setCurrentUserId] = useState(null)
  const [viewerCity, setViewerCity] = useState(null)
  const [viewerAgeRanges, setViewerAgeRanges] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [interestsByCampaign, setInterestsByCampaign] = useState({})
  const [expandedId, setExpandedId] = useState(null)
  const [reactionsByCampaign, setReactionsByCampaign] = useState({})
  const [pickerOpenFor, setPickerOpenFor] = useState(null)

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      setCurrentUserId(user?.id || null)

      if (user) {
        const { data: viewerProfile } = await supabase
          .from('profiles')
          .select('city, account_type')
          .eq('id', user.id)
          .single()

        setViewerCity(viewerProfile?.city || null)

        if (viewerProfile?.account_type === 'influencer') {
          const { data: viewerDetail } = await supabase
            .from('influencer_profiles')
            .select('audience_age_ranges')
            .eq('id', user.id)
            .single()

          setViewerAgeRanges(viewerDetail?.audience_age_ranges || [])
        }
      }

      const { data, error } = await supabase
        .from('campaigns')
        .select(
          `
          id, title, description, budget, category, image_url, creator_id, created_at,
          target_city, target_age_ranges,
          creator:creator_id ( full_name, account_type, city, is_certified )
        `
        )
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (!error) setCampaigns(data || [])

      const campaignIds = (data || []).map((c) => c.id)
      if (campaignIds.length > 0) {
        const { data: reactionsData } = await supabase
          .from('campaign_reactions')
          .select('id, campaign_id, user_id, emoji')
          .in('campaign_id', campaignIds)

        const grouped = {}
        ;(reactionsData || []).forEach((r) => {
          if (!grouped[r.campaign_id]) grouped[r.campaign_id] = []
          grouped[r.campaign_id].push(r)
        })
        setReactionsByCampaign(grouped)
      }

      setLoading(false)
    }

    load()
  }, [])

  async function toggleReaction(campaignId, emoji) {
    if (!currentUserId) {
      router.push('/connexion')
      return
    }

    setPickerOpenFor(null)

    const existing = (reactionsByCampaign[campaignId] || []).find(
      (r) => r.user_id === currentUserId
    )

    if (existing && existing.emoji === emoji) {
      await supabase.from('campaign_reactions').delete().eq('id', existing.id)
    } else {
      await supabase
        .from('campaign_reactions')
        .upsert(
          { campaign_id: campaignId, user_id: currentUserId, emoji },
          { onConflict: 'campaign_id,user_id' }
        )
    }

    const { data } = await supabase
      .from('campaign_reactions')
      .select('id, campaign_id, user_id, emoji')
      .eq('campaign_id', campaignId)

    setReactionsByCampaign((prev) => ({ ...prev, [campaignId]: data || [] }))
  }

  function isMatch(campaign) {
    const hasTargeting = campaign.target_city || campaign.target_age_ranges?.length > 0
    if (!hasTargeting) return false

    const cityMatches =
      !campaign.target_city ||
      (viewerCity && campaign.target_city.trim().toLowerCase() === viewerCity.trim().toLowerCase())

    const ageMatches =
      !campaign.target_age_ranges?.length ||
      campaign.target_age_ranges.some((r) => viewerAgeRanges.includes(r))

    return cityMatches && ageMatches
  }

  const filtered = campaigns
    .filter((c) => !categoryFilter || c.category === categoryFilter)
    .sort((a, b) => Number(isMatch(b)) - Number(isMatch(a)))

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

        <div className="flex gap-2 mb-6">
          <Link
            href="/annuaire?type=influencer"
            className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-white text-gray-700 border"
          >
            Influenceurs
          </Link>
          <Link
            href="/annuaire?type=business"
            className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-white text-gray-700 border"
          >
            Entreprises
          </Link>
          <Link
            href="/campagnes"
            className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-blue-600 text-white"
          >
            Campagnes
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
            const matched = isMatch(c)

            return (
              <div
                key={c.id}
                className={`bg-white border rounded-xl p-4 shadow-sm ${
                  matched ? 'ring-2 ring-blue-400' : ''
                }`}
              >
                {matched && (
                  <span className="inline-block text-xs bg-blue-600 text-white px-2 py-1 rounded-full mb-2">
                    ✨ Correspond à ton profil
                  </span>
                )}

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

                {(c.target_city || c.target_age_ranges?.length > 0) && (
                  <p className="text-xs text-gray-500 mb-2">
                    Ciblage :{' '}
                    {[c.target_city, c.target_age_ranges?.join(', ')].filter(Boolean).join(' · ')}
                  </p>
                )}

                <p className="text-xs text-gray-500 mb-3">
                  Publié par{' '}
                  <span className="font-medium text-gray-700">
                    {c.creator?.full_name}
                    {c.creator?.is_certified && <span className="text-yellow-500"> ⭐</span>}
                  </span>
                  {c.creator?.city ? ` · ${c.creator.city}` : ''}
                </p>

                <div className="relative mb-3">
                  <div className="flex flex-wrap items-center gap-1">
                    {REACTIONS.map((emoji) => {
                      const count = (reactionsByCampaign[c.id] || []).filter(
                        (r) => r.emoji === emoji
                      ).length
                      if (count === 0) return null
                      const mine = (reactionsByCampaign[c.id] || []).some(
                        (r) => r.emoji === emoji && r.user_id === currentUserId
                      )
                      return (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => toggleReaction(c.id, emoji)}
                          className={`text-xs px-2 py-1 rounded-full border ${
                            mine ? 'bg-blue-50 border-blue-400' : 'bg-white border-gray-200'
                          }`}
                        >
                          {emoji} {count}
                        </button>
                      )
                    })}
                    <button
                      type="button"
                      onClick={() => setPickerOpenFor(pickerOpenFor === c.id ? null : c.id)}
                      className="text-xs px-2 py-1 rounded-full border bg-white border-gray-200 text-gray-500"
                    >
                      + Réagir
                    </button>
                  </div>

                  {pickerOpenFor === c.id && (
                    <div className="flex gap-1 mt-1 bg-white border rounded-full shadow-md px-2 py-1 w-fit">
                      {REACTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => toggleReaction(c.id, emoji)}
                          className="text-base hover:scale-125 transition-transform"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

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
