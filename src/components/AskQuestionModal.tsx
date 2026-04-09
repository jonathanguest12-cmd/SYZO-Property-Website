'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface AskQuestionModalProps {
  systemPrompt: string
  greeting: string
  applyHref: string
  roomId?: string
  propertyRef?: string
  roomName: string
  propertyName: string
  suggestions: string[]
  isOpen: boolean
  onClose: () => void
}

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

export default function AskQuestionModal({
  systemPrompt,
  greeting,
  applyHref,
  roomId,
  propertyRef,
  roomName,
  propertyName,
  suggestions,
  isOpen,
  onClose,
}: AskQuestionModalProps) {
  const [sessionId] = useState(generateSessionId)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: greeting },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [rateLimited, setRateLimited] = useState(false)
  const [remaining, setRemaining] = useState(20)
  const [followUps, setFollowUps] = useState<string[]>([])
  const [showFollowUps, setShowFollowUps] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const handleClose = useCallback(() => onClose(), [onClose])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    if (isOpen) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, handleClose])

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  const sendMessageWithText = async (text: string) => {
    if (!text.trim() || loading || rateLimited) return
    setShowFollowUps(false)

    const userMessage: Message = { role: 'user', content: text.trim() }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.slice(1), // exclude greeting
          systemPrompt,
          sessionId,
          roomId: roomId || null,
          propertyRef: propertyRef || null,
          roomName,
          propertyName,
        }),
      })

      const data = await res.json()

      if (res.status === 429 || data.rateLimited) {
        setRateLimited(true)
      }

      if (data.remaining !== undefined) setRemaining(data.remaining)

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.content },
      ])

      // Show follow-ups after first user message only
      const userCount = newMessages.filter(m => m.role === 'user').length
      if (userCount === 1 && data.followUps?.length) {
        setFollowUps(data.followUps)
        setShowFollowUps(true)
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            "Sorry, I'm having trouble connecting. Please try again or click Apply to Rent to speak with our team.",
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = () => sendMessageWithText(input)

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={handleClose}
    >
      <div
        className="w-full sm:max-w-lg bg-white sm:rounded-2xl flex flex-col rounded-t-2xl"
        style={{
          height: '85vh',
          maxHeight: '600px',
          boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
          style={{ borderColor: '#E5E7EB' }}
        >
          <div>
            <p className="text-sm font-semibold" style={{ color: '#2D3038' }}>
              Ask a Question
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
              {roomName} &middot;{' '}
              {propertyName.replace(/^\d+[-\s]+/, '').trim()}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
            style={{ color: '#9CA3AF' }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-0">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className="max-w-[82%] px-4 py-2.5 text-sm leading-relaxed"
                style={
                  msg.role === 'user'
                    ? {
                        background: '#2D3038',
                        color: 'white',
                        borderRadius: '18px 18px 4px 18px',
                      }
                    : {
                        background: '#F3F4F6',
                        color: '#374151',
                        borderRadius: '18px 18px 18px 4px',
                      }
                }
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Quick reply chips — show only before first user message */}
          {messages.length === 1 && !loading && (
            <div className="flex flex-wrap gap-2 mt-1 mb-2">
              {suggestions.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (suggestion === 'Something else') {
                      inputRef.current?.focus()
                    } else {
                      sendMessageWithText(suggestion)
                    }
                  }}
                  className="text-xs px-3 py-1.5 rounded-full border transition-colors hover:bg-gray-50 cursor-pointer"
                  style={{ borderColor: '#E5E7EB', color: '#374151' }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {loading && (
            <div className="flex justify-start">
              <div
                className="px-4 py-2.5 text-sm"
                style={{
                  background: '#F3F4F6',
                  color: '#9CA3AF',
                  borderRadius: '18px 18px 18px 4px',
                }}
              >
                <span className="inline-flex gap-1">
                  <span
                    className="animate-bounce"
                    style={{ animationDelay: '0ms' }}
                  >
                    &middot;
                  </span>
                  <span
                    className="animate-bounce"
                    style={{ animationDelay: '150ms' }}
                  >
                    &middot;
                  </span>
                  <span
                    className="animate-bounce"
                    style={{ animationDelay: '300ms' }}
                  >
                    &middot;
                  </span>
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Follow-up chips — after first assistant response */}
        {showFollowUps && followUps.length > 0 && (
          <div className="px-5 pb-2 flex-shrink-0">
            <p className="text-xs mb-2" style={{ color: '#9CA3AF' }}>
              You might also want to know:
            </p>
            <div className="flex flex-wrap gap-2">
              {followUps.map((followUp, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setShowFollowUps(false)
                    sendMessageWithText(followUp)
                  }}
                  className="text-xs px-3 py-1.5 rounded-full border transition-colors hover:bg-gray-50 cursor-pointer"
                  style={{ borderColor: '#E5E7EB', color: '#374151' }}
                >
                  {followUp}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Rate limit warning */}
        {remaining <= 5 && !rateLimited && (
          <div
            className="px-5 py-1.5 text-xs text-center flex-shrink-0"
            style={{ color: '#9CA3AF' }}
          >
            {remaining} message{remaining !== 1 ? 's' : ''} remaining
          </div>
        )}

        {/* Apply to Rent CTA */}
        <div
          className="px-5 py-3 border-t flex-shrink-0"
          style={{ borderColor: '#F3F4F6' }}
        >
          <Link
            href={applyHref}
            className="block w-full text-center py-2.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: '#2D3038' }}
          >
            Apply to Rent
          </Link>
        </div>

        {/* Input */}
        {!rateLimited ? (
          <div className="px-4 pb-5 pt-2 flex-shrink-0">
            <div
              className="flex gap-2 items-center border rounded-full px-4 py-2.5"
              style={{ borderColor: '#E5E7EB' }}
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') sendMessage()
                }}
                placeholder="Type your question..."
                className="flex-1 text-sm outline-none bg-transparent"
                style={{ color: '#2D3038' }}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-opacity disabled:opacity-30 cursor-pointer"
                style={{ background: '#2D3038' }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <div
            className="px-5 pb-5 pt-2 text-xs text-center flex-shrink-0"
            style={{ color: '#9CA3AF' }}
          >
            Message limit reached for this session.
          </div>
        )}
      </div>
    </div>
  )
}
