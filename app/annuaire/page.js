'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function AnnuaireContent() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const accountType = searchParams.get('type') === 'business' ? 'business' : 'influencer'

  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [cityFilter, setCityFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  useEffect(() => {
    async function fetchProfiles() {
      setLoading(true)

      const selectFields =
        accountType === 'influencer'
          ? `id, full_name, city, influencer_profiles ( bio, categories, whatsapp_number, photo_url, instagram_url, tiktok_url, price_range )`
          : `id, full_name, city, phone, business_profiles ( company_name, sector, description, logo_url, website_url )`

      let query = supabase
        .from('profiles')
        .select(selectFields)
        .eq('account_type', accountType)
        .eq('is_verified', true)
        .eq('is_active', true)

      if (cityFilter) query = query.ilike('city', `%${cityFilter}%`)

      const { data, error } = await query

      if (!error) setProfiles(data)
      setLoading(false)
    }

    fetchProfiles()
  }, [cityFilter, accountType])

  const filtered = profiles.filter((p) => {
    if (accountType !== 'influencer' || !categoryFilter) return true
    return p.influencer_profiles?.categories?.includes(categoryFilter)
  })

  function contactWhatsApp(whatsappNumber, name) {
    const message = encodeURIComponent(
      `Bonjour ${name}, je vous contacte via la plateforme pour une collaboration marketing. Seriez-vous disponible pour en discuter ?`
    )
    window.open(`https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${message}`, '_blank')
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">
          {accountType === 'influencer' ? 'Trouver un influenceur' : 'Trouver une entreprise'}
        </h1>

        <div className="flex gap-2">
          <Link
            href="/annuaire?type=influencer"
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
              accountType === 'influencer'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            Influenceurs
          </Link>

          <Link
            href="/annuaire?type=business"
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
              accountType === 'business'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            Entreprises
          </Link>
        </div>
      </div>

      <div className="flex gap-4 mb-8 flex-wrap">
        <input
          type="text"
          placeholder="Filtrer par ville..."
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className="border rounded-lg p-2"
        />
        {accountType === 'influencer' && (
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
        )}
      </div>

      {loading && <p>Chargement...</p>}
      {!loading && filtered.length === 0 && <p>Aucun résultat trouvé.</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {accountType === 'influencer'
          ? filtered.map((inf) => (
              <div key={inf.id} className="border rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  {inf.influencer_profiles?.photo_url ? (
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
            ))
          : filtered.map((biz) => (
              <div key={biz.id} className="border rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  {biz.business_profiles?.logo_url ? (
                    <img
                      src={biz.business_profiles.logo_url}
                      alt={biz.full_name}
                      className="w-14 h-14 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gray-200" />
                  )}
                  <div>
                    <h2 className="font-semibold">
                      {biz.business_profiles?.company_name || biz.full_name}
                    </h2>
                    <p className="text-sm text-gray-500">{biz.city}</p>
                  </div>
                </div>

                {biz.business_profiles?.sector && (
                  <p className="text-xs text-blue-700 bg-blue-100 inline-block px-2 py-1 rounded-full mb-2">
                    {biz.business_profiles.sector}
                  </p>
                )}

                {biz.business_profiles?.description && (
                  <p className="text-sm text-gray-700 mb-3">{biz.business_profiles.description}</p>
                )}

                <button
                  onClick={() => contactWhatsApp(biz.phone, biz.full_name)}
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

export default function AnnuairePage() {
  return (
    <Suspense fallback={<p className="p-6">Chargement...</p>}>
      <AnnuaireContent />
    </Suspense>
  )
}