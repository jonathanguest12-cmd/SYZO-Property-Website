'use client'

import { useState } from 'react'
import Image from 'next/image'

interface PhotoGalleryProps {
  photos: { url: string; title: string }[]
  alt: string
}

export default function PhotoGallery({ photos, alt }: PhotoGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  if (photos.length === 0) {
    return (
      <div
        className="relative w-full overflow-hidden rounded-xl"
        style={{ aspectRatio: '16/9', backgroundColor: '#F0F0F0' }}
      >
        <div className="flex h-full items-center justify-center" style={{ color: '#888888' }}>
          No photo available
        </div>
      </div>
    )
  }

  const mainPhoto = photos[selectedIndex]

  return (
    <div>
      {/* Main photo */}
      <div
        className="relative w-full overflow-hidden rounded-xl"
        style={{ aspectRatio: '16/9', backgroundColor: '#F0F0F0' }}
      >
        <Image
          src={mainPhoto.url}
          alt={mainPhoto.title || alt}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          quality={85}
          priority
        />
      </div>

      {/* Thumbnail strip */}
      {photos.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
          {photos.map((photo, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedIndex(idx)}
              className="relative flex-shrink-0 overflow-hidden rounded-lg transition-all duration-200"
              style={{
                width: '80px',
                height: '60px',
                backgroundColor: '#F0F0F0',
                outline: idx === selectedIndex ? '2px solid #1a1a2e' : '2px solid transparent',
                outlineOffset: '2px',
                opacity: idx === selectedIndex ? 1 : 0.7,
              }}
            >
              <Image
                src={photo.url}
                alt={photo.title || `Photo ${idx + 1}`}
                fill
                className="object-cover"
                sizes="80px"
                quality={85}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
