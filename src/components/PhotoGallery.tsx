'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import Image from 'next/image'

interface PhotoGalleryProps {
  photos: { url: string; title: string }[]
  alt: string
}

function HouseIcon({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  )
}

function ChevronLeft() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

export default function PhotoGallery({ photos, alt }: PhotoGalleryProps) {
  // Deduplicate by original title (same photo uploaded twice gets different CDN UUIDs but same title)
  const uniquePhotos = useMemo(() => {
    const seenUrls = new Set<string>()
    const seenTitles = new Set<string>()
    return photos.filter((p) => {
      if (seenUrls.has(p.url)) return false
      seenUrls.add(p.url)
      // Deduplicate by title if it's a meaningful title (not generic like "Room")
      if (p.title && p.title !== 'Room' && p.title.length > 2) {
        if (seenTitles.has(p.title)) return false
        seenTitles.add(p.title)
      }
      return true
    })
  }, [photos])

  const [selectedIndex, setSelectedIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const safeIndex = Math.min(selectedIndex, Math.max(0, uniquePhotos.length - 1))
  const hasMultiple = uniquePhotos.length > 1

  const goNext = useCallback(() => {
    setSelectedIndex((prev) => (prev + 1) % uniquePhotos.length)
  }, [uniquePhotos.length])

  const goPrev = useCallback(() => {
    setSelectedIndex((prev) => (prev - 1 + uniquePhotos.length) % uniquePhotos.length)
  }, [uniquePhotos.length])

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!lightboxOpen) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setLightboxOpen(false)
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [lightboxOpen, goNext, goPrev])

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    if (lightboxOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [lightboxOpen])

  if (uniquePhotos.length === 0) {
    return (
      <div
        className="w-full overflow-hidden rounded-xl flex flex-col items-center justify-center gap-3"
        style={{
          aspectRatio: '4/3',
          background: 'linear-gradient(145deg, #E8E6E2, #DDD9D4)',
          color: '#9CA3AF',
        }}
      >
        <HouseIcon />
        <span className="text-sm font-medium">No photos available</span>
      </div>
    )
  }

  const mainPhoto = uniquePhotos[safeIndex]

  return (
    <>
      <div className="w-full">
        {/* Main photo with arrows */}
        <div
          className="relative w-full overflow-hidden rounded-xl group/gallery cursor-pointer"
          style={{ aspectRatio: '4/3', maxHeight: '340px', backgroundColor: '#E5E3DF' }}
          onClick={() => setLightboxOpen(true)}
        >
          <Image
            src={mainPhoto.url}
            alt={mainPhoto.title || alt}
            fill
            quality={85}
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 500px"
            priority={safeIndex === 0}
          />

          {hasMultiple && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goPrev() }}
                className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full opacity-0 transition-opacity duration-200 group-hover/gallery:opacity-100"
                style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff' }}
                aria-label="Previous photo"
              >
                <ChevronLeft />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goNext() }}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full opacity-0 transition-opacity duration-200 group-hover/gallery:opacity-100"
                style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff' }}
                aria-label="Next photo"
              >
                <ChevronRight />
              </button>
            </>
          )}

          {hasMultiple && (
            <span
              className="absolute bottom-2 right-2 rounded-md px-2 py-0.5 text-xs font-medium"
              style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: '#ffffff' }}
            >
              {safeIndex + 1} / {uniquePhotos.length}
            </span>
          )}
        </div>

        {/* Thumbnail strip */}
        {hasMultiple && (
          <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
            {uniquePhotos.map((photo, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedIndex(idx)}
                className="relative flex-shrink-0 overflow-hidden rounded-md transition-all duration-200"
                style={{
                  width: '56px',
                  height: '42px',
                  backgroundColor: '#E5E3DF',
                  outline: idx === safeIndex ? '2px solid #2D3038' : '2px solid transparent',
                  outlineOffset: '1px',
                  opacity: idx === safeIndex ? 1 : 0.5,
                }}
              >
                <Image
                  src={photo.url}
                  alt={photo.title || `Photo ${idx + 1}`}
                  fill
                  quality={70}
                  className="object-cover"
                  sizes="56px"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox overlay */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.95)' }}
          onClick={() => setLightboxOpen(false)}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full transition-opacity duration-200 hover:opacity-80"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff' }}
            aria-label="Close lightbox"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Photo counter */}
          {hasMultiple && (
            <span className="absolute top-5 left-5 text-sm font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {safeIndex + 1} / {uniquePhotos.length}
            </span>
          )}

          {/* Main lightbox image */}
          <div
            className="relative"
            style={{ width: '90vw', height: '80vh', maxWidth: '1200px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={mainPhoto.url}
              alt={mainPhoto.title || alt}
              fill
              quality={90}
              className="object-contain"
              sizes="90vw"
              priority
            />
          </div>

          {/* Lightbox arrows */}
          {hasMultiple && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goPrev() }}
                className="absolute left-4 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full transition-opacity duration-200 hover:opacity-80"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff' }}
                aria-label="Previous photo"
              >
                <ChevronLeft />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goNext() }}
                className="absolute right-4 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full transition-opacity duration-200 hover:opacity-80"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff' }}
                aria-label="Next photo"
              >
                <ChevronRight />
              </button>
            </>
          )}
        </div>
      )}
    </>
  )
}
