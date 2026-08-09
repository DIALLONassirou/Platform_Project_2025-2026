'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AdminPage() {
  const supabase = createClient()
  const router = useRouter()
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  const [pendingProfiles, setPendingProfiles] = useState([])
  const [loadingProfiles, setLoadingProfiles] = useState(true)

  const [reports, setReports] = useState([])
  const [loadingReports, setLoadingReports] = useState(true)

  const [tab, setTab] = useState('validations') // 'validations' ou 'signalements'

  useEffect(() => {
    async function checkAccess() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/connexion')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      if (!profile?.is_admin) {
        router.push('/')
        return
      }

      setIsAdmin(true)
      setCheckingAccess(false)
    }

    checkAccess()
  }, [])

  async function fetchPending() {
    setLoadingProfiles(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_verified', false)
      .order('created_at', { ascending: false })

    if (!error) setPendingProfiles(data)
    setLoadingProfiles(false)
  }

  async function fetchReports() {
    setLoadingReports(true)
    const { data, error } = await supabase
      .from('reports')
      .select(
        `
        id, reason, resolved, created_at,
        reporter:reporter_id ( full_name ),
        reported:reported_id ( full_name, account_type )
      `
      )
      .order('created_at', { ascending: false })

    if (!error) setReports(data)
    setLoadingReports(false)
  }

  useEffect(() => {
    if (isAdmin) {
      fetchPending()
      fetchReports()
    }
  }, [isAdmin])

  async function validateProfile(id) {
    await supabase.from('profiles').update({ is_verified: true }).eq('id', id)
    fetchPending()
  }

  async function rejectProfile(id) {
    await supabase.from('profiles').update({ is_active: false }).eq('id', id)
    fetchPending()
  }

  async function resolveReport(id) {
    await supabase.from('reports').update({ resolved: true }).eq('id', id)
    fetchReports()
  }

  async function deactivateReportedProfile(reportedId) {
    if (!confirm('Désactiver ce profil suite au signalement ?')) return
    await supabase.from('profiles').update({ is_active: false }).eq('id', reportedId)
    alert('Profil désactivé.')
    fetchPending()
  }

  if (checkingAccess) return <p className="p-6">Vérification des accès...</p>
  if (!isAdmin) return null

  const pendingReportsCount = reports.filter((r) => !r.resolved).length

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Espace administration</h1>

      {/* Onglets */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('validations')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold ${
            tab === 'validations' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          Comptes en attente ({pendingProfiles.length})
        </button>
        <button
          onClick={() => setTab('signalements')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold ${
            tab === 'signalements' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          Signalements ({pendingReportsCount})
        </button>
      </div>

      {/* Onglet Validations */}
      {tab === 'validations' && (
        <div>
          {loadingProfiles && <p>Chargement...</p>}
          {!loadingProfiles && pendingProfiles.length === 0 && <p>Aucun compte en attente.</p>}

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
      )}

      {/* Onglet Signalements */}
      {tab === 'signalements' && (
        <div>
          {loadingReports && <p>Chargement...</p>}
          {!loadingReports && reports.length === 0 && <p>Aucun signalement.</p>}

          <div className="space-y-4">
            {reports.map((r) => (
              <div
                key={r.id}
                className={`border rounded-lg p-4 ${r.resolved ? 'opacity-50' : ''}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold">
                      Profil signalé : {r.reported?.full_name || 'Utilisateur supprimé'}
                    </p>
                    <p className="text-xs text-gray-500">
                      Signalé par : {r.reporter?.full_name || 'Utilisateur supprimé'} —{' '}
                      {new Date(r.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  {r.resolved && (
                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                      Traité
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-700 mb-3">{r.reason}</p>

                {!r.resolved && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => resolveReport(r.id)}
                      className="px-3 py-1 rounded-lg bg-gray-600 text-white text-sm"
                    >
                      Marquer comme traité
                    </button>
                    <button
                      onClick={() => deactivateReportedProfile(r.reported_id)}
                      className="px-3 py-1 rounded-lg bg-red-600 text-white text-sm"
                    >
                      Désactiver ce profil
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}