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
  const photoUrl =
    first.property_photo_url ??
    (first.property_images.length > 0 ? first.property_images[0].url : null)

  const prices = rooms.map((r) => r.rent_pcm)
  const minPrice = Math.round(Math.min(...prices))
  const maxPrice = Math.round(Math.max(...prices))
  const priceRange =
    minPrice === maxPrice ? `\u00A3${minPrice}` : `\u00A3${minPrice} \u2013 \u00A3${maxPrice}`

  return (
    <Link
      href={`/property/${propertyRef}`}
      className="group block overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] w-full bg-gray-100">
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt={first.property_name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
            No photo
          </div>
        )}
        <span className="absolute left-2 top-2 rounded bg-white/90 px-2 py-0.5 text-xs font-medium text-gray-700">
          {first.property_city}
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-1.5 p-4">
        <p className="font-semibold text-gray-900 truncate">{first.property_name}</p>
        <p className="text-sm text-gray-500">
          {rooms.length} room{rooms.length !== 1 ? 's' : ''} available
        </p>
        <p className="text-sm font-medium text-gray-700">{priceRange} /month</p>
      </div>
    </Link>
  )
}
