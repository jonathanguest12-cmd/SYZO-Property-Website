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
  const displayName = first.property_name.replace(/^\d+[-\s]+/, '').trim()

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
      className="group flex flex-col overflow-hidden rounded-2xl bg-white card-hover"
    >
      {/* Image */}
      <div className="relative w-full overflow-hidden">
        {photoUrl ? (
          <div style={{ aspectRatio: '16/10' }}>
            <Image
              src={photoUrl}
              alt={first.property_name}
              fill
              quality={80}
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center gap-2"
            style={{
              aspectRatio: '16/10',
              background: 'linear-gradient(145deg, #E8E6E2, #DDD9D4)',
              color: '#9CA3AF',
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
              <path d="M9 21V12h6v9" />
            </svg>
            <span className="text-xs font-medium">No photo</span>
          </div>
        )}
        {/* City badge */}
        <span
          className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase"
          style={{ backgroundColor: 'rgba(255,255,255,0.92)', color: '#2D3038' }}
        >
          {first.property_city}
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="text-[15px] font-semibold leading-snug truncate" style={{ color: '#2D3038' }}>
            {displayName}
          </h3>
          <p className="mt-0.5 text-sm" style={{ color: '#9CA3AF' }}>
            {rooms.length} room{rooms.length !== 1 ? 's' : ''} available
          </p>
        </div>

        {/* Price range */}
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-bold tabular-nums" style={{ color: '#2D3038' }}>
            {minPrice === maxPrice
              ? `\u00A3${minPrice}`
              : `\u00A3${minPrice}\u2013\u00A3${maxPrice}`}
          </span>
          <span className="text-sm" style={{ color: '#9CA3AF' }}>/month</span>
        </div>

        <div
          className="mt-auto flex justify-end pt-3"
          style={{ borderTop: '1px solid #F0EFEC' }}
        >
          <span
            className="text-sm font-semibold transition-all duration-200 group-hover:translate-x-0.5"
            style={{ color: '#2D3038' }}
          >
            View Property &rarr;
          </span>
        </div>
      </div>
    </Link>
  )
}
