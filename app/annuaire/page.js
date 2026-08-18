'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { SOCIAL_PLATFORMS } from '@/lib/socialPlatforms'

const SOCIAL_SELECT_FIELDS = SOCIAL_PLATFORMS.flatMap(({ key }) => [
  `${key}_url`,
  `${key}_followers`,
]).join(', ')

function AnnuaireContent() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const accountType = searchParams.get('type') === 'business' ? 'business' : 'influencer'

  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [cityFilter, setCityFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [reportingId, setReportingId] = useState(null)
  const [reportReason, setReportReason] = useState('')
  const [reportSending, setReportSending] = useState(false)
  const [optionsOpenId, setOptionsOpenId] = useState(null)

  useEffect(() => {
    async function fetchProfiles() {
      setLoading(true)

      const selectFields =
        accountType === 'influencer'
          ? `id, full_name, city, is_certified, influencer_profiles ( bio, categories, whatsapp_number, photo_url, price_range, ${SOCIAL_SELECT_FIELDS} )`
          : `id, full_name, city, phone, is_certified, business_profiles ( company_name, sector, description, logo_url, website_url )`

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

  async function submitReport() {
    const trimmedReason = reportReason.trim()

    if (trimmedReason.length < 20) {
      alert(
        'Merci de décrire le problème de façon un peu plus détaillée (au moins 20 caractères), pour que notre équipe puisse bien comprendre la situation.'
      )
      return
    }

    const confirmed = confirm(
      'Un signalement est une démarche sérieuse qui sera examinée par notre équipe. Confirmes-tu vouloir signaler ce profil ?'
    )
    if (!confirmed) return

    setReportSending(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      alert('Tu dois être connecté pour signaler un profil.')
      setReportSending(false)
      return
    }

    const { data: existing } = await supabase
      .from('reports')
      .select('id')
      .eq('reporter_id', user.id)
      .eq('reported_id', reportingId)
      .eq('resolved', false)
      .maybeSingle()

    if (existing) {
      alert('Tu as déjà signalé ce profil récemment. Notre équipe est en train de l’examiner.')
      setReportSending(false)
      setReportingId(null)
      setReportReason('')
      return
    }

    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      reported_id: reportingId,
      reason: trimmedReason,
    })

    setReportSending(false)

    if (error) {
      alert("Erreur lors de l'envoi du signalement : " + error.message)
      return
    }

    alert(
      'Signalement envoyé. Notre équipe va l’examiner attentivement avant de prendre une décision.'
    )
    setReportingId(null)
    setReportReason('')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-gray-900">
            {accountType === 'influencer' ? 'Trouver un influenceur' : 'Trouver une entreprise'}
          </h1>

          <div className="flex gap-2">
            <a
              href="/annuaire?type=influencer"
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
                accountType === 'influencer'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border'
              }`}
            >
              Influenceurs
            </a>
            <a
              href="/annuaire?type=business"
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
                accountType === 'business'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border'
              }`}
            >
              Entreprises
            </a>
            <Link
              href="/campagnes"
              className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-white text-gray-700 border"
            >
              Campagnes
            </Link>
          </div>
        </div>

        <div className="flex gap-4 mb-8 flex-wrap">
          <input
            type="text"
            placeholder="Filtrer par ville..."
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="border rounded-lg p-2 bg-white"
          />
          {accountType === 'influencer' && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="border rounded-lg p-2 bg-white"
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

        {loading && <p className="text-gray-600">Chargement...</p>}
        {!loading && filtered.length === 0 && <p className="text-gray-600">Aucun résultat trouvé.</p>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {accountType === 'influencer'
            ? filtered.map((inf) => (
                <div key={inf.id} className="relative bg-white border rounded-xl p-4 shadow-sm">
                  <div className="absolute top-3 right-3">
                    <button
                      type="button"
                      onClick={() =>
                        setOptionsOpenId(optionsOpenId === inf.id ? null : inf.id)
                      }
                      aria-label="Plus d'options"
                      className="text-gray-400 hover:text-gray-600 px-1 text-lg leading-none"
                    >
                      ⋯
                    </button>
                    {optionsOpenId === inf.id && (
                      <div className="absolute right-0 mt-1 bg-white border rounded-lg shadow-md py-1 z-10 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            setReportingId(inf.id)
                            setOptionsOpenId(null)
                          }}
                          className="block w-full text-left px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
                        >
                          Signaler ce profil
                        </button>
                      </div>
                    )}
                  </div>

                  <Link href={`/profil/${inf.id}`} className="flex items-center gap-3 mb-3">
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
                      <h2 className="font-semibold text-gray-900 flex items-center gap-1 hover:underline">
                        {inf.full_name}
                        {inf.is_certified && (
                          <span title="Compte certifié" className="text-yellow-500">
                            ⭐
                          </span>
                        )}
                      </h2>
                      <p className="text-sm text-gray-500">{inf.city}</p>
                    </div>
                  </Link>

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

                  {SOCIAL_PLATFORMS.some(({ key }) => inf.influencer_profiles?.[`${key}_url`]) && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {SOCIAL_PLATFORMS.map(({ key, label, Icon, color }) => {
                        const url = inf.influencer_profiles?.[`${key}_url`]
                        if (!url) return null
                        const followers = inf.influencer_profiles?.[`${key}_followers`]
                        return (
                          <a
                            key={key}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={label}
                            className="flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full hover:bg-gray-200"
                          >
                            <Icon style={{ color }} className="w-3.5 h-3.5" />
                            {followers ? followers : ''}
                          </a>
                        )
                      })}
                    </div>
                  )}

                  <Link
                    href={`/messages/${inf.id}`}
                    className="block text-center w-full py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
                  >
                    Envoyer un message
                  </Link>
                </div>
              ))
            : filtered.map((biz) => (
                <div key={biz.id} className="relative bg-white border rounded-xl p-4 shadow-sm">
                  <div className="absolute top-3 right-3">
                    <button
                      type="button"
                      onClick={() =>
                        setOptionsOpenId(optionsOpenId === biz.id ? null : biz.id)
                      }
                      aria-label="Plus d'options"
                      className="text-gray-400 hover:text-gray-600 px-1 text-lg leading-none"
                    >
                      ⋯
                    </button>
                    {optionsOpenId === biz.id && (
                      <div className="absolute right-0 mt-1 bg-white border rounded-lg shadow-md py-1 z-10 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            setReportingId(biz.id)
                            setOptionsOpenId(null)
                          }}
                          className="block w-full text-left px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
                        >
                          Signaler ce profil
                        </button>
                      </div>
                    )}
                  </div>

                  <Link href={`/profil/${biz.id}`} className="flex items-center gap-3 mb-3">
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
                      <h2 className="font-semibold text-gray-900 flex items-center gap-1 hover:underline">
                        {biz.business_profiles?.company_name || biz.full_name}
                        {biz.is_certified && (
                          <span title="Compte certifié" className="text-yellow-500">
                            ⭐
                          </span>
                        )}
                      </h2>
                      <p className="text-sm text-gray-500">{biz.city}</p>
                    </div>
                  </Link>

                  {biz.business_profiles?.sector && (
                    <p className="text-xs text-blue-700 bg-blue-100 inline-block px-2 py-1 rounded-full mb-2">
                      {biz.business_profiles.sector}
                    </p>
                  )}

                  {biz.business_profiles?.description && (
                    <p className="text-sm text-gray-700 mb-3">{biz.business_profiles.description}</p>
                  )}

                  <Link
                    href={`/messages/${biz.id}`}
                    className="block text-center w-full py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
                  >
                    Envoyer un message
                  </Link>
                </div>
              ))}
        </div>

        {reportingId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full">
              <h3 className="font-semibold mb-1">Signaler ce profil</h3>
              <p className="text-xs text-gray-500 mb-3">
                Décris précisément le problème rencontré. Les signalements sont examinés
                manuellement par notre équipe avant toute action.
              </p>
              <textarea
                placeholder="Explique en détail le problème rencontré (minimum 20 caractères)..."
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full border rounded-lg p-3 mb-1"
                rows={4}
              />
              <p className="text-xs text-gray-400 mb-4">
                {reportReason.trim().length} / 20 caractères minimum
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setReportingId(null)
                    setReportReason('')
                  }}
                  className="flex-1 py-2 rounded-lg border text-gray-700"
                >
                  Annuler
                </button>
                <button
                  onClick={submitReport}
                  disabled={reportSending}
                  className="flex-1 py-2 rounded-lg bg-red-600 text-white font-semibold disabled:opacity-50"
                >
                  {reportSending ? 'Envoi...' : 'Envoyer'}
                </button>
              </div>
            </div>
          </div>
        )}
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