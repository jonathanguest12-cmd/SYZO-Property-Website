'use client'

import { useState, useRef, useEffect } from 'react'

export default function ExpandableText({
  children,
  maxHeight = 200,
}: {
  children: React.ReactNode
  maxHeight?: number
}) {
  const [expanded, setExpanded] = useState(false)
  const [needsTruncation, setNeedsTruncation] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (contentRef.current) {
      setNeedsTruncation(contentRef.current.scrollHeight > maxHeight + 40)
    }
  }, [maxHeight])

  return (
    <div>
      <div
        ref={contentRef}
        className="relative overflow-hidden transition-all duration-300"
        style={{
          maxHeight: !expanded && needsTruncation ? `${maxHeight}px` : undefined,
        }}
      >
        {children}
        {!expanded && needsTruncation && (
          <div
            className="absolute bottom-0 left-0 right-0 h-16"
            style={{ background: 'linear-gradient(transparent, white)' }}
          />
        )}
      </div>
      {needsTruncation && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-3 text-sm font-semibold transition-colors duration-200"
          style={{ color: '#2D3038' }}
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  )
}
