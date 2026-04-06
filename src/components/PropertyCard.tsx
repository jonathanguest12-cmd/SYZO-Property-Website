import Image from 'next/image'
import Link from 'next/link'
import type { RoomWithProperty } from '@/lib/types'

export default function PropertyCard({
  propertyRef,
  rooms,
}: {
  propertyRef: string
  rooms: RoomWithProperty[]
}) {
  if (rooms.length === 0) return null

  const first = rooms[0]

  // Skip first property photo (often an exterior drawing), use second.
  let photoUrl: string | null = null
  if (first.property_images.length > 1) {
    photoUrl = first.property_images[1].url
  } else if (rooms.some((r) => r.photo_urls.length > 0)) {
    const roomWithPhoto = rooms.find((r) => r.photo_urls.length > 0)!
    photoUrl = roomWithPhoto.photo_urls[0]
  } else if (first.property_images.length === 1) {
    photoUrl = first.property_images[0].url
  } else {
    photoUrl = first.property_photo_url
  }

  const prices = rooms.map((r) => r.rent_pcm)
  const minPrice = Math.round(Math.min(...prices))
  const maxPrice = Math.round(Math.max(...prices))

  return (
    <Link
      href={`/property/${propertyRef}`}
      className="group flex flex-col overflow-hidden rounded-2xl transition-all duration-200 hover:-translate-y-1"
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e8e4df',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.08)' }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      {/* Image */}
      <div className="relative w-full overflow-hidden rounded-t-2xl" style={{ maxHeight: '200px' }}>
        {photoUrl ? (
          <>
            <div style={{ aspectRatio: '4/3', maxHeight: '200px' }}>
              <Image
                src={photoUrl}
                alt={first.property_name}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                quality={85}
              />
            </div>
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.2), transparent)' }}
            />
          </>
        ) : (
          <div
            className="flex items-center justify-center text-sm"
            style={{
              aspectRatio: '4/3',
              maxHeight: '200px',
              background: 'linear-gradient(to bottom right, #e8e4df, #d4cfc8)',
              color: '#6b7280',
            }}
          >
            No photo available
          </div>
        )}
        {/* City badge */}
        <span
          className="absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase"
          style={{ backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)', color: '#1a1a2e' }}
        >
          {first.property_city}
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="text-base font-semibold leading-snug truncate" style={{ color: '#1a1a2e' }}>
          {first.property_name}
        </h3>
        <p className="text-sm" style={{ color: '#6b7280' }}>
          {rooms.length} room{rooms.length !== 1 ? 's' : ''} available
        </p>

        {/* Price range in Instrument Serif */}
        <div className="flex items-baseline gap-1">
          <span className="text-2xl" style={{ color: '#1a1a2e', fontFamily: 'var(--font-display)' }}>
            {minPrice === maxPrice
              ? `\u00A3${minPrice}`
              : `\u00A3${minPrice}\u2013\u00A3${maxPrice}`}
          </span>
          <span className="text-sm" style={{ color: '#6b7280' }}>/month</span>
        </div>

        <div className="mt-auto flex justify-end pt-2">
          <span
            className="text-sm font-semibold transition-colors duration-200"
            style={{ color: '#1a1a2e' }}
          >
            View Property &rarr;
          </span>
        </div>
      </div>
    </Link>
  )
}
