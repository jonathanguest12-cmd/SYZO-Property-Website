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
      <div className="mx-auto max-w-4xl">
        <div
          className="relative w-full overflow-hidden rounded-xl flex items-center justify-center"
          style={{
            aspectRatio: '3/2',
            maxHeight: '500px',
            background: 'linear-gradient(135deg, #E5E3DF, #D8D5D0)',
            color: '#9CA3AF',
          }}
        >
          No photos available
        </div>
      </div>
    )
  }

  const mainPhoto = photos[selectedIndex]

  return (
    <div className="mx-auto max-w-4xl">
      {/* Main photo */}
      <div
        className="relative w-full overflow-hidden rounded-xl"
        style={{ aspectRatio: '3/2', maxHeight: '500px', backgroundColor: '#E5E3DF' }}
      >
        <Image
          src={mainPhoto.url}
          alt={mainPhoto.title || alt}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 896px"
          quality={85}
          priority
        />
        {/* Photo counter */}
        {photos.length > 1 && (
          <span
            className="absolute bottom-3 right-3 rounded-md px-2.5 py-1 text-xs font-medium"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: '#ffffff' }}
          >
            {selectedIndex + 1} / {photos.length}
          </span>
        )}
      </div>

      {/* Thumbnail strip */}
      {photos.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {photos.map((photo, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedIndex(idx)}
              className="relative flex-shrink-0 overflow-hidden rounded-lg transition-all duration-200"
              style={{
                width: '72px',
                height: '52px',
                backgroundColor: '#E5E3DF',
                outline: idx === selectedIndex ? '2px solid #2D3038' : '2px solid transparent',
                outlineOffset: '2px',
                opacity: idx === selectedIndex ? 1 : 0.6,
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
