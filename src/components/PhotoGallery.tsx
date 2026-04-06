'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'

interface PhotoGalleryProps {
  photos: { url: string; title: string }[]
  alt: string
}

/** SVG house icon for no-photo placeholder */
function HouseIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  )
}

export default function PhotoGallery({ photos, alt }: PhotoGalleryProps) {
  // Deduplicate by URL
  const uniquePhotos = useMemo(() => {
    const seen = new Set<string>()
    return photos.filter((p) => {
      if (seen.has(p.url)) return false
      seen.add(p.url)
      return true
    })
  }, [photos])

  const [selectedIndex, setSelectedIndex] = useState(0)

  if (uniquePhotos.length === 0) {
    return (
      <div className="mx-auto" style={{ maxWidth: '100%' }}>
        <div
          className="relative w-full overflow-hidden rounded-xl flex flex-col items-center justify-center gap-3"
          style={{
            aspectRatio: '3/2',
            maxHeight: '450px',
            background: 'linear-gradient(145deg, #E8E6E2, #DDD9D4)',
            color: '#9CA3AF',
          }}
        >
          <HouseIcon />
          <span className="text-sm font-medium">No photos available</span>
        </div>
      </div>
    )
  }

  const safeIndex = Math.min(selectedIndex, uniquePhotos.length - 1)
  const mainPhoto = uniquePhotos[safeIndex]
  const hasMultiple = uniquePhotos.length > 1

  function goNext() {
    setSelectedIndex((prev) => (prev + 1) % uniquePhotos.length)
  }

  function goPrev() {
    setSelectedIndex((prev) => (prev - 1 + uniquePhotos.length) % uniquePhotos.length)
  }

  return (
    <div className="mx-auto" style={{ maxWidth: '100%' }}>
      {/* Main photo with arrows */}
      <div
        className="relative w-full overflow-hidden rounded-xl group/gallery"
        style={{ aspectRatio: '3/2', maxHeight: '450px', backgroundColor: '#E5E3DF' }}
      >
        <Image
          src={mainPhoto.url}
          alt={mainPhoto.title || alt}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 800px"
          quality={85}
          priority
        />

        {/* Arrow buttons */}
        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={goPrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full opacity-0 transition-opacity duration-200 group-hover/gallery:opacity-100"
              style={{ backgroundColor: 'rgba(255,255,255,0.9)', color: '#2D3038' }}
              aria-label="Previous photo"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={goNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full opacity-0 transition-opacity duration-200 group-hover/gallery:opacity-100"
              style={{ backgroundColor: 'rgba(255,255,255,0.9)', color: '#2D3038' }}
              aria-label="Next photo"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </>
        )}

        {/* Photo counter */}
        {hasMultiple && (
          <span
            className="absolute bottom-3 right-3 rounded-md px-2.5 py-1 text-xs font-medium"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: '#ffffff' }}
          >
            {safeIndex + 1} / {uniquePhotos.length}
          </span>
        )}
      </div>

      {/* Thumbnail strip */}
      {hasMultiple && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {uniquePhotos.map((photo, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedIndex(idx)}
              className="relative flex-shrink-0 overflow-hidden rounded-lg transition-all duration-200"
              style={{
                width: '72px',
                height: '52px',
                backgroundColor: '#E5E3DF',
                outline: idx === safeIndex ? '2px solid #2D3038' : '2px solid transparent',
                outlineOffset: '2px',
                opacity: idx === safeIndex ? 1 : 0.6,
              }}
            >
              <Image
                src={photo.url}
                alt={photo.title || `Photo ${idx + 1}`}
                fill
                className="object-cover"
                sizes="72px"
                quality={85}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
