'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SOCIAL_PLATFORMS } from '@/lib/socialPlatforms'

export default function ProfilPage() {
  const supabase = createClient()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [profile, setProfile] = useState(null)
  const [detail, setDetail] = useState({})
  const [initialProfile, setInitialProfile] = useState(null)
  const [initialDetail, setInitialDetail] = useState({})
  const [certRequest, setCertRequest] = useState(null)
  const [requestingCert, setRequestingCert] = useState(false)
  const [certMessage, setCertMessage] = useState('')
  const [sendingCert, setSendingCert] = useState(false)

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/connexion')
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setProfile(profileData)
      setInitialProfile(profileData)

      const table =
        profileData.account_type === 'influencer' ? 'influencer_profiles' : 'business_profiles'

      const { data: detailData } = await supabase
        .from(table)
        .select('*')
        .eq('id', user.id)
        .single()

      setDetail(detailData || {})
      setInitialDetail(detailData || {})

      const { data: certData } = await supabase
        .from('certification_requests')
        .select('id, status')
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      setCertRequest(certData || null)
      setLoading(false)
    }

    loadProfile()
  }, [])

  async function handleSendCertRequest() {
    const trimmed = certMessage.trim()
    if (trimmed.length < 10) {
      alert('Merci de décrire en quelques mots pourquoi tu demandes la certification (au moins 10 caractères).')
      return
    }

    setSendingCert(true)

    const { error } = await supabase.from('certification_requests').insert({
      profile_id: profile.id,
      message: trimmed,
    })

    setSendingCert(false)

    if (error) {
      alert("Erreur lors de l'envoi de la demande : " + error.message)
      return
    }

    setCertRequest({ status: 'pending' })
    setRequestingCert(false)
    setCertMessage('')
    alert('Demande de certification envoyée. Notre équipe va l’examiner.')
  }

  function handleCancel() {
    setProfile(initialProfile)
    setDetail(initialDetail)
    setEditing(false)
  }

  async function handleImageUpload(e) {
    const file = e.target.files[0]
    if (!file) return

    setUploading(true)

    const fileExt = file.name.split('.').pop()
    const filePath = `${profile.id}/photo.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('Avatars')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      alert("Erreur lors de l'envoi de l'image : " + uploadError.message)
      setUploading(false)
      return
    }

    const { data: publicUrlData } = supabase.storage.from('Avatars').getPublicUrl(filePath)
    const publicUrl = publicUrlData.publicUrl + '?t=' + Date.now()

    const imageField = profile.account_type === 'influencer' ? 'photo_url' : 'logo_url'
    setDetail({ ...detail, [imageField]: publicUrl })

    setUploading(false)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)

    const table = profile.account_type === 'influencer' ? 'influencer_profiles' : 'business_profiles'

    const payload = { ...detail }
    if (profile.account_type === 'influencer') {
      SOCIAL_PLATFORMS.forEach(({ key }) => {
        const followersKey = `${key}_followers`
        payload[followersKey] =
          payload[followersKey] === '' || payload[followersKey] == null
            ? null
            : parseInt(payload[followersKey], 10)
      })
    }

    await supabase.from(table).update(payload).eq('id', profile.id)

    await supabase
      .from('profiles')
      .update({
        full_name: profile.full_name,
        city: profile.city,
        phone: profile.phone,
      })
      .eq('id', profile.id)

    setInitialProfile(profile)
    setInitialDetail(payload)
    setSaving(false)
    setEditing(false)
    alert('Profil mis à jour !')
  }

  async function handlePasswordChange(e) {
    e.preventDefault()
    const newPassword = e.target.newPassword.value

    if (newPassword.length < 6) {
      alert('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      alert('Erreur : ' + error.message)
      return
    }

    alert('Mot de passe mis à jour avec succès ! Note-le bien quelque part.')
    e.target.reset()
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/connexion')
  }

  if (loading) return <p className="p-6">Chargement...</p>

  return (
    <div className="max-w-md mx-auto mt-12 p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Mon profil</h1>
        <button onClick={handleLogout} className="text-sm text-red-600 underline">
          Se déconnecter
        </button>
      </div>

      {!profile.is_verified && (
        <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 text-sm p-3 rounded-lg mb-4">
          Ton compte est en attente de validation manuelle. Il sera visible dans l'annuaire une fois vérifié.
        </div>
      )}

      {!editing && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            {(profile.account_type === 'influencer' ? detail.photo_url : detail.logo_url) ? (
              <img
                src={profile.account_type === 'influencer' ? detail.photo_url : detail.logo_url}
                alt="Aperçu"
                className="w-16 h-16 rounded-full object-cover border"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-200" />
            )}
            <div>
              <p className="font-semibold text-gray-900 flex items-center gap-1">
                {profile.full_name || '—'}
                {profile.is_certified && (
                  <span title="Compte certifié" className="text-yellow-500">
                    ⭐
                  </span>
                )}
              </p>
              <p className="text-sm text-gray-500">{profile.city || '—'}</p>
            </div>
          </div>

          <p className="text-sm text-gray-700">
            <span className="text-gray-500">Téléphone / WhatsApp : </span>
            {profile.phone || '—'}
          </p>

          <div className="border rounded-lg p-3">
            {profile.is_certified ? (
              <p className="text-sm text-green-700">⭐ Ton compte est certifié.</p>
            ) : certRequest?.status === 'pending' ? (
              <p className="text-sm text-gray-600">
                Ta demande de certification est en attente d'examen par notre équipe.
              </p>
            ) : requestingCert ? (
              <div className="space-y-2">
                <textarea
                  placeholder="Explique en quelques mots pourquoi tu demandes la certification..."
                  value={certMessage}
                  onChange={(e) => setCertMessage(e.target.value)}
                  className="w-full border rounded-lg p-2 text-sm"
                  rows={3}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRequestingCert(false)
                      setCertMessage('')
                    }}
                    className="flex-1 py-2 rounded-lg border text-gray-700 text-sm"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleSendCertRequest}
                    disabled={sendingCert}
                    className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-50"
                  >
                    {sendingCert ? 'Envoi...' : 'Envoyer la demande'}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {certRequest?.status === 'rejected' && (
                  <p className="text-xs text-red-600 mb-2">
                    Ta précédente demande a été rejetée. Tu peux en soumettre une nouvelle.
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => setRequestingCert(true)}
                  className="w-full py-2 rounded-lg border border-blue-500 text-blue-600 text-sm font-semibold"
                >
                  Demander la certification ⭐
                </button>
              </div>
            )}
          </div>

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
                <div className="flex flex-wrap gap-1">
                  {SOCIAL_PLATFORMS.map(({ key, label }) => {
                    const url = detail[`${key}_url`]
                    if (!url) return null
                    const followers = detail[`${key}_followers`]
                    return (
                      <a
                        key={key}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full hover:bg-gray-200"
                      >
                        {label}
                        {followers ? ` · ${followers}` : ''}
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
            </>
          )}

          <button
            type="button"
            onClick={() => setEditing(true)}
            className="w-full py-3 rounded-lg bg-blue-600 text-white font-semibold"
          >
            Modifier mon profil
          </button>
        </div>
      )}

      {editing && (
      <form onSubmit={handleSave} className="space-y-4">
        <div className="flex items-center gap-4 mb-2">
          {(profile.account_type === 'influencer' ? detail.photo_url : detail.logo_url) ? (
            <img
              src={profile.account_type === 'influencer' ? detail.photo_url : detail.logo_url}
              alt="Aperçu"
              className="w-16 h-16 rounded-full object-cover border"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-200" />
          )}
          <div>
            <label className="text-sm text-blue-600 underline cursor-pointer">
              {uploading
                ? 'Envoi en cours...'
                : profile.account_type === 'influencer'
                ? 'Changer la photo'
                : 'Changer le logo'}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <input
          type="text"
          placeholder={profile.account_type === 'influencer' ? 'Nom complet' : "Nom de l'entreprise"}
          value={profile.full_name || ''}
          onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
          className="w-full border rounded-lg p-3"
        />

        <input
          type="tel"
          placeholder="Numéro de téléphone (WhatsApp)"
          value={profile.phone || ''}
          onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
          className="w-full border rounded-lg p-3"
        />

        <input
          type="text"
          placeholder="Ville (ex: Conakry)"
          value={profile.city || ''}
          onChange={(e) => setProfile({ ...profile, city: e.target.value })}
          className="w-full border rounded-lg p-3"
        />

        {profile.account_type === 'influencer' ? (
          <>
            <textarea
              placeholder="Bio courte"
              value={detail.bio || ''}
              onChange={(e) => setDetail({ ...detail, bio: e.target.value })}
              className="w-full border rounded-lg p-3"
              rows={3}
            />

            <div>
              <p className="text-sm text-gray-600 mb-2">Catégories (choisis-en une ou plusieurs)</p>
              <div className="flex flex-wrap gap-2">
                {['mode', 'beauté', 'food', 'lifestyle', 'tech', 'événementiel'].map((cat) => {
                  const selected = (detail.categories || []).includes(cat)
                  return (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => {
                        const current = detail.categories || []
                        const updated = selected
                          ? current.filter((c) => c !== cat)
                          : [...current, cat]
                        setDetail({ ...detail, categories: updated })
                      }}
                      className={`px-3 py-1 rounded-full text-sm border ${
                        selected
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300'
                      }`}
                    >
                      {cat}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-2">Réseaux sociaux</p>
              <div className="space-y-2">
                {SOCIAL_PLATFORMS.map(({ key, label }) => (
                  <div key={key} className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder={`Lien ${label}`}
                      value={detail[`${key}_url`] || ''}
                      onChange={(e) =>
                        setDetail({ ...detail, [`${key}_url`]: e.target.value })
                      }
                      className="w-full border rounded-lg p-2 text-sm"
                    />
                    <input
                      type="number"
                      min="0"
                      placeholder="Nb followers"
                      value={detail[`${key}_followers`] || ''}
                      onChange={(e) =>
                        setDetail({ ...detail, [`${key}_followers`]: e.target.value })
                      }
                      className="w-full border rounded-lg p-2 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
            <input
              type="text"
              placeholder="Tarif indicatif (ex: 50 000 - 200 000 GNF)"
              value={detail.price_range || ''}
              onChange={(e) => setDetail({ ...detail, price_range: e.target.value })}
              className="w-full border rounded-lg p-3"
            />
          </>
        ) : (
          <>
            <input
              type="text"
              placeholder="Secteur d'activité"
              value={detail.sector || ''}
              onChange={(e) => setDetail({ ...detail, sector: e.target.value })}
              className="w-full border rounded-lg p-3"
            />
            <textarea
              placeholder="Description de l'entreprise"
              value={detail.description || ''}
              onChange={(e) => setDetail({ ...detail, description: e.target.value })}
              className="w-full border rounded-lg p-3"
              rows={3}
            />
          </>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 py-3 rounded-lg border text-gray-700 font-semibold"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-3 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>
      )}

      <div className="mt-8 pt-6 border-t">
        <h2 className="font-semibold mb-3">Changer le mot de passe</h2>
        <form onSubmit={handlePasswordChange} className="flex gap-2">
          <input
            type="password"
            name="newPassword"
            placeholder="Nouveau mot de passe"
            required
            minLength={6}
            className="flex-1 border rounded-lg p-3"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-gray-700 text-white text-sm font-semibold"
          >
            Modifier
          </button>
        </form>
      </div>
    </div>
  )
}