'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AnnuairePage() {
  const supabase = createClient()
  const [influencers, setInfluencers] = useState([])
  const [loading, setLoading] = useState(true)
  const [cityFilter, setCityFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  useEffect(() => {
    async function fetchInfluencers() {
      setLoading(true)

      let query = supabase
        .from('profiles')
        .select(
          `
          id, full_name, city,
          influencer_profiles ( bio, categories, whatsapp_number, photo_url, instagram_url, tiktok_url, price_range )
        `
        )
        .eq('account_type', 'influencer')
        .eq('is_verified', true)
        .eq('is_active', true)

      if (cityFilter) query = query.ilike('city', `%${cityFilter}%`)

      const { data, error } = await query

      if (!error) setInfluencers(data)
      setLoading(false)
    }

    fetchInfluencers()
  }, [cityFilter])

  const filtered = influencers.filter((inf) => {
    if (!categoryFilter) return true
    return inf.influencer_profiles?.categories?.includes(categoryFilter)
  })

  function contactWhatsApp(whatsappNumber, name) {
    const message = encodeURIComponent(
      `Bonjour ${name}, je vous contacte via la plateforme pour une collaboration marketing. Seriez-vous disponible pour en discuter ?`
    )
    window.open(`https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${message}`, '_blank')
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Trouver un influenceur</h1>

      <div className="flex gap-4 mb-8 flex-wrap">
        <input
          type="text"
          placeholder="Filtrer par ville..."
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className="border rounded-lg p-2"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border rounded-lg p-2"
        >
          <option value="">Toutes les catégories</option>
          <option value="mode">Mode</option>
          <option value="beauté">Beauté</option>
          <option value="food">Food</option>
          <option value="lifestyle">Lifestyle</option>
          <option value="tech">Tech</option>
          <option value="événementiel">Événementiel</option>
        </select>
      </div>

      {loading && <p>Chargement...</p>}
      {!loading && filtered.length === 0 && <p>Aucun influenceur trouvé.</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filtered.map((inf) => (
          <div key={inf.id} className="border rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              {inf.influencer_profiles?.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={inf.influencer_profiles.photo_url}
                  alt={inf.full_name}
                  className="w-14 h-14 rounded-full object-cover"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gray-200" />
              )}
              <div>
                <h2 className="font-semibold">{inf.full_name}</h2>
                <p className="text-sm text-gray-500">{inf.city}</p>
              </div>
            </div>

            {inf.influencer_profiles?.bio && (
              <p className="text-sm text-gray-700 mb-2">{inf.influencer_profiles.bio}</p>
            )}

            {inf.influencer_profiles?.categories?.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {inf.influencer_profiles.categories.map((cat) => (
                  <span key={cat} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                    {cat}
                  </span>
                ))}
              </div>
            )}

            {inf.influencer_profiles?.price_range && (
              <p className="text-xs text-gray-500 mb-3">
                Tarif indicatif : {inf.influencer_profiles.price_range}
              </p>
            )}

            <button
              onClick={() =>
                contactWhatsApp(inf.influencer_profiles.whatsapp_number, inf.full_name)
              }
              className="w-full py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700"
            >
              Contacter sur WhatsApp
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}