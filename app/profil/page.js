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
  const [profile, setProfile] = useState(null)
  const [detail, setDetail] = useState({})

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

      const table =
        profileData.account_type === 'influencer' ? 'influencer_profiles' : 'business_profiles'

      const { data: detailData } = await supabase
        .from(table)
        .select('*')
        .eq('id', user.id)
        .single()

      setDetail(detailData || {})
      setLoading(false)
    }

    loadProfile()
  }, [])

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

    setSaving(false)
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

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50"
        >
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </form>

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