'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function MessagesPage() {
  const supabase = createClient()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [conversations, setConversations] = useState([])

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/connexion')
        return
      }

      const { data } = await supabase
        .from('messages')
        .select(
          `
          id, content, created_at, sender_id, recipient_id,
          sender:sender_id ( id, full_name ),
          recipient:recipient_id ( id, full_name )
        `
        )
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      const seen = new Set()
      const list = []

      ;(data || []).forEach((m) => {
        const isSender = m.sender_id === user.id
        const other = isSender ? m.recipient : m.sender
        if (!other || seen.has(other.id)) return
        seen.add(other.id)
        list.push({
          otherId: other.id,
          otherName: other.full_name,
          lastMessage: m.content,
          lastAt: m.created_at,
        })
      })

      setConversations(list)
      setLoading(false)
    }

    load()
  }, [])

  if (loading) return <p className="p-6">Chargement...</p>

  return (
    <div className="max-w-md mx-auto mt-12 p-6">
      <h1 className="text-2xl font-bold mb-6">Messages</h1>

      {conversations.length === 0 && (
        <p className="text-gray-600 text-sm">
          Aucune conversation pour l&apos;instant. Contacte un profil depuis l&apos;annuaire pour
          démarrer une discussion.
        </p>
      )}

      <div className="space-y-2">
        {conversations.map((c) => (
          <Link
            key={c.otherId}
            href={`/messages/${c.otherId}`}
            className="block border rounded-lg p-4 hover:bg-gray-50"
          >
            <p className="font-semibold text-gray-900">{c.otherName || 'Utilisateur'}</p>
            <p className="text-sm text-gray-600 truncate">{c.lastMessage}</p>
            <p className="text-xs text-gray-400 mt-1">
              {new Date(c.lastAt).toLocaleString('fr-FR')}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
