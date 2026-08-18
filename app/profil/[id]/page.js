'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { SOCIAL_PLATFORMS } from '@/lib/socialPlatforms'

export default function PublicProfilePage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [profile, setProfile] = useState(null)
  const [detail, setDetail] = useState({})
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [reporting, setReporting] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportSending, setReportSending] = useState(false)

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user?.id === id) {
        router.replace('/profil')
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, city, account_type, is_certified, is_verified, is_active')
        .eq('id', id)
        .eq('is_verified', true)
        .eq('is_active', true)
        .single()

      if (!profileData) {
        setNotFound(true)
        setLoading(false)
        return
      }

      setProfile(profileData)

      const table =
        profileData.account_type === 'influencer' ? 'influencer_profiles' : 'business_profiles'

      const { data: detailData } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .single()

      setDetail(detailData || {})
      setLoading(false)
    }

    load()
  }, [id])

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
      .eq('reported_id', id)
      .eq('resolved', false)
      .maybeSingle()

    if (existing) {
      alert('Tu as déjà signalé ce profil récemment. Notre équipe est en train de l’examiner.')
      setReportSending(false)
      setReporting(false)
      setReportReason('')
      return
    }

    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      reported_id: id,
      reason: trimmedReason,
    })

    setReportSending(false)

    if (error) {
      alert("Erreur lors de l'envoi du signalement : " + error.message)
      return
    }

    alert('Signalement envoyé. Notre équipe va l’examiner attentivement avant de prendre une décision.')
    setReporting(false)
    setReportReason('')
  }

  if (loading) return <p className="p-6">Chargement...</p>
  if (notFound) return <p className="p-6">Ce profil est introuvable ou n&apos;est plus disponible.</p>

  const displayName =
    profile.account_type === 'influencer' ? profile.full_name : detail.company_name || profile.full_name

  return (
    <div className="max-w-md mx-auto mt-12 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          {(profile.account_type === 'influencer' ? detail.photo_url : detail.logo_url) ? (
            <img
              src={profile.account_type === 'influencer' ? detail.photo_url : detail.logo_url}
              alt={displayName}
              className="w-20 h-20 rounded-full object-cover border"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gray-200" />
          )}
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-1">
              {displayName}
              {profile.is_certified && (
                <span title="Compte certifié" className="text-yellow-500">
                  ⭐
                </span>
              )}
            </h1>
            <p className="text-sm text-gray-500">{profile.city}</p>
          </div>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setOptionsOpen((v) => !v)}
            aria-label="Plus d'options"
            className="text-gray-400 hover:text-gray-600 px-2 text-lg leading-none"
          >
            ⋯
          </button>
          {optionsOpen && (
            <div className="absolute right-0 mt-1 bg-white border rounded-lg shadow-md py-1 z-10 whitespace-nowrap">
              <button
                type="button"
                onClick={() => {
                  setReporting(true)
                  setOptionsOpen(false)
                }}
                className="block w-full text-left px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
              >
                Signaler ce profil
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3 mb-6">
        {profile.account_type === 'influencer' ? (
          <>
            {detail.bio && <p className="text-sm text-gray-700">{detail.bio}</p>}

            {detail.categories?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {detail.categories.map((cat) => (
                  <span key={cat} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                    {cat}
                  </span>
                ))}
              </div>
            )}

            {SOCIAL_PLATFORMS.some(({ key }) => detail[`${key}_url`]) && (
              <div className="flex flex-wrap gap-2">
                {SOCIAL_PLATFORMS.map(({ key, label, Icon, color }) => {
                  const url = detail[`${key}_url`]
                  if (!url) return null
                  const followers = detail[`${key}_followers`]
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

            {detail.price_range && (
              <p className="text-xs text-gray-500">Tarif indicatif : {detail.price_range}</p>
            )}
          </>
        ) : (
          <>
            {detail.sector && (
              <p className="text-xs text-blue-700 bg-blue-100 inline-block px-2 py-1 rounded-full">
                {detail.sector}
              </p>
            )}
            {detail.description && <p className="text-sm text-gray-700">{detail.description}</p>}
            {detail.website_url && (
              <a
                href={detail.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 underline"
              >
                Voir le site web
              </a>
            )}
          </>
        )}
      </div>

      <Link
        href={`/messages/${id}`}
        className="block text-center w-full py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
      >
        Envoyer un message
      </Link>

      {reporting && (
        <div className="border rounded-lg p-3 mt-3">
          <textarea
            placeholder="Explique en détail le problème rencontré (minimum 20 caractères)..."
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            className="w-full border rounded-lg p-2 text-sm mb-2"
            rows={3}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setReporting(false)
                setReportReason('')
              }}
              className="flex-1 py-2 rounded-lg border text-gray-700 text-sm"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={submitReport}
              disabled={reportSending}
              className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold disabled:opacity-50"
            >
              {reportSending ? 'Envoi...' : 'Envoyer'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
