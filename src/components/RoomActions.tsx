'use client'

import { useState } from 'react'
import Link from 'next/link'
import AskQuestionModal from './AskQuestionModal'

interface RoomActionsProps {
  roomId: string
  applyHref: string
  systemPrompt: string
  greeting: string
  roomName: string
  propertyName: string
  propertyRef?: string
  suggestions?: string[]
}

const defaultSuggestions = [
  "What's the rent?",
  'Are bills included?',
  'When is it available?',
  'Tell me about the deposit',
  "What's included in the room?",
  'Tell me about the property',
  'Something else',
]

export default function RoomActions({
  roomId,
  applyHref,
  systemPrompt,
  greeting,
  roomName,
  propertyName,
  propertyRef,
  suggestions = defaultSuggestions,
}: RoomActionsProps) {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      <div className="flex gap-3">
        <Link
          href={applyHref}
          className="flex-1 flex items-center justify-center py-3.5 rounded-full font-semibold text-sm text-white transition-opacity hover:opacity-90"
          style={{ background: '#2D3038' }}
        >
          Apply to Rent
        </Link>
        <button
          onClick={() => setModalOpen(true)}
          className="flex-1 flex items-center justify-center py-3.5 rounded-full font-semibold text-sm border-2 transition-colors hover:bg-gray-50 cursor-pointer"
          style={{ borderColor: '#2D3038', color: '#2D3038' }}
        >
          Ask a Question
        </button>
      </div>

      <AskQuestionModal
        systemPrompt={systemPrompt}
        greeting={greeting}
        applyHref={applyHref}
        roomId={roomId}
        propertyRef={propertyRef}
        roomName={roomName}
        propertyName={propertyName}
        suggestions={suggestions}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  )
}
