import Image from 'next/image'
import Link from 'next/link'
import type { RoomWithProperty } from '@/lib/types'
import { formatAvailableFrom, isAvailableNow, roomTypeLabel } from '@/lib/format'

function getRoomTitle(room: RoomWithProperty): { title: string; subtitle: string } {
  const address = room.property_name
  const postcode = room.property_postcode
  const city = room.property_city

  // If advert_title exists and does NOT contain the property address, use it with full address below
  if (room.advert_title && !room.advert_title.includes(address)) {
    return {
      title: room.advert_title,
      subtitle: `${address}, ${postcode}`,
    }
  }

  // If advert_title is null/empty OR contains the address text, construct a clean title
  const type = roomTypeLabel(room.room_type)
  return {
    title: `${type} \u2014 ${room.property_name}`,
    subtitle: `${city}, ${postcode}`,
  }
}

export default function RoomCard({ room }: { room: RoomWithProperty }) {
  const photoUrl = room.photo_urls.length > 0 ? room.photo_urls[0] : null
  const availText = formatAvailableFrom(room.available_from)
  const availNow = isAvailableNow(room.available_from)
  const amenities = room.room_amenities.slice(0, 3)
  const { title, subtitle } = getRoomTitle(room)

  return (
    <Link
      href={`/room/${room.id}`}
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
            alt={`${room.property_name} - ${room.name}`}
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
          {room.property_city}
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-bold leading-snug" style={{ color: '#2D3038' }}>
          {title}
        </h3>
        <p className="text-sm truncate" style={{ color: '#888888' }}>
          {subtitle}
        </p>

        {/* Rent + Bills */}
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold" style={{ color: '#2D3038' }}>
            &pound;{Math.round(room.rent_pcm)}
          </span>
          <span className="text-sm" style={{ color: '#888888' }}>/month</span>
          <span
            className="ml-auto inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
            style={
              room.bills_included
                ? { backgroundColor: '#E8F5E9', color: '#2E7D32' }
                : { backgroundColor: '#FEF3C7', color: '#B45309' }
            }
          >
            {room.bills_included ? 'BILLS INC.' : 'BILLS EXTRA'}
          </span>
        </div>

        {/* Amenities */}
        {amenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {amenities.map((a) => (
              <span
                key={a}
                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{ backgroundColor: '#F0F0F0', color: '#666666' }}
              >
                {a}
              </span>
            ))}
          </div>
        )}

        {/* Available date + View Room button */}
        <div className="mt-auto flex items-center justify-between pt-2">
          <span
            className="text-sm font-medium"
            style={{ color: availNow ? '#2E7D32' : '#888888' }}
          >
            {availText}
          </span>
          <span
            className="inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium text-white"
            style={{ backgroundColor: '#1a1a2e' }}
          >
            View Room
          </span>
        </div>
      </div>
    </Link>
  )
}
