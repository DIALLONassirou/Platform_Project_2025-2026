'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { REACTIONS } from '@/lib/reactions'

export default function ConversationPage() {
  const { userId } = useParams()
  const router = useRouter()
  const supabase = createClient()
  const bottomRef = useRef(null)
  const messagesRef = useRef([])

  const [currentUserId, setCurrentUserId] = useState(null)
  const [otherProfile, setOtherProfile] = useState(null)
  const [messages, setMessages] = useState([])
  const [reactions, setReactions] = useState({})
  const [pickerOpenFor, setPickerOpenFor] = useState(null)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  async function loadReactions(messageIds) {
    if (!messageIds.length) {
      setReactions({})
      return
    }

    const { data } = await supabase
      .from('message_reactions')
      .select('id, message_id, user_id, emoji')
      .in('message_id', messageIds)

    const grouped = {}
    ;(data || []).forEach((r) => {
      if (!grouped[r.message_id]) grouped[r.message_id] = []
      grouped[r.message_id].push(r)
    })
    setReactions(grouped)
  }

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/connexion')
        return
      }

      setCurrentUserId(user.id)

      const { data: otherData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('id', userId)
        .single()

      setOtherProfile(otherData)

      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${user.id},recipient_id.eq.${userId}),and(sender_id.eq.${userId},recipient_id.eq.${user.id})`
        )
        .order('created_at', { ascending: true })

      setMessages(msgs || [])
      await loadReactions((msgs || []).map((m) => m.id))
      setLoading(false)
    }

    init()
  }, [userId])

  useEffect(() => {
    if (!currentUserId) return

    const channel = supabase
      .channel(`messages-${currentUserId}-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const m = payload.new
          const isRelevant =
            (m.sender_id === currentUserId && m.recipient_id === userId) ||
            (m.sender_id === userId && m.recipient_id === currentUserId)
          if (isRelevant) {
            setMessages((prev) => [...prev, m])
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_reactions' },
        () => {
          loadReactions(messagesRef.current.map((m) => m.id))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUserId, userId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e) {
    e.preventDefault()
    const trimmed = content.trim()
    if (!trimmed) return

    setSending(true)

    const { error } = await supabase.from('messages').insert({
      sender_id: currentUserId,
      recipient_id: userId,
      content: trimmed,
    })

    setSending(false)

    if (error) {
      alert('Erreur : ' + error.message)
      return
    }

    setContent('')
  }

  async function toggleReaction(messageId, emoji) {
    setPickerOpenFor(null)

    const existing = (reactions[messageId] || []).find((r) => r.user_id === currentUserId)

    if (existing && existing.emoji === emoji) {
      await supabase.from('message_reactions').delete().eq('id', existing.id)
    } else {
      await supabase
        .from('message_reactions')
        .upsert(
          { message_id: messageId, user_id: currentUserId, emoji },
          { onConflict: 'message_id,user_id' }
        )
    }

    loadReactions(messagesRef.current.map((m) => m.id))
  }

  if (loading) return <p className="p-6">Chargement...</p>

  return (
    <div className="max-w-md mx-auto mt-8 p-4 flex flex-col h-[80vh]">
      <div className="flex items-center gap-3 mb-4 pb-3 border-b">
        <Link href="/messages" className="text-blue-600 text-sm">
          ← Retour
        </Link>
        <h1 className="font-semibold">{otherProfile?.full_name || 'Conversation'}</h1>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {messages.length === 0 && (
          <p className="text-sm text-gray-500 text-center mt-6">
            Aucun message pour l&apos;instant. Lance la conversation !
          </p>
        )}

        {messages.map((m) => {
          const isMine = m.sender_id === currentUserId
          const msgReactions = reactions[m.id] || []

          return (
            <div key={m.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
              <div
                className={`max-w-[75%] rounded-lg px-3 py-2 text-sm cursor-pointer ${
                  isMine ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
                }`}
                onClick={() => setPickerOpenFor(pickerOpenFor === m.id ? null : m.id)}
              >
                {m.content}
              </div>

              {pickerOpenFor === m.id && (
                <div className="flex gap-1 mt-1 bg-white border rounded-full shadow-md px-2 py-1">
                  {REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => toggleReaction(m.id, emoji)}
                      className="text-base hover:scale-125 transition-transform"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              {msgReactions.length > 0 && (
                <div className="flex gap-0.5 mt-1">
                  {msgReactions.map((r) => (
                    <span
                      key={r.id}
                      className="text-xs bg-white border rounded-full px-1.5 py-0.5"
                    >
                      {r.emoji}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-2">
        <input
          type="text"
          placeholder="Écris ton message..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="flex-1 border rounded-lg p-3"
        />
        <button
          type="submit"
          disabled={sending || !content.trim()}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50"
        >
          Envoyer
        </button>
      </form>
    </div>
  )
}
