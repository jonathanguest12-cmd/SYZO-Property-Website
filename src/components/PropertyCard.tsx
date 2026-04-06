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

  // Fix 2: Skip first property photo (often an exterior drawing), use second.
  // If only one property photo, fall back to first room photo instead.
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
  const priceLabel =
    minPrice === maxPrice
      ? `From \u00A3${minPrice} /month`
      : `\u00A3${minPrice}\u2013\u00A3${maxPrice} /month`

  return (
    <Link
      href={`/property/${propertyRef}`}
      className="group flex flex-col overflow-hidden bg-white rounded-xl transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
      style={{
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}
    >
      {/* Image */}
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: '4/3', backgroundColor: '#F0F0F0' }}>
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt={first.property_name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            quality={85}
          />
        ) : (
          <div className="flex h-full items-center justify-center" style={{ color: '#888888' }}>
            No photo
          </div>
        )}
        {/* City badge */}
        <span
          className="absolute left-3 top-3 rounded px-2.5 py-1 text-xs font-semibold text-white"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          {first.property_city}
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-bold truncate" style={{ color: '#2D3038' }}>
          {first.property_name}
        </h3>
        <p className="text-sm" style={{ color: '#888888' }}>
          {rooms.length} room{rooms.length !== 1 ? 's' : ''} available
        </p>
        <p className="text-sm font-medium" style={{ color: '#2D3038' }}>
          {priceLabel}
        </p>

        <div className="mt-auto flex justify-end pt-2">
          <span
            className="inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium text-white"
            style={{ backgroundColor: '#1a1a2e' }}
          >
            View Property
          </span>
        </div>
      </div>
    </Link>
  )
}
