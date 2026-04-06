import Image from 'next/image'
import Link from 'next/link'
import type { RoomWithProperty } from '@/lib/types'
import { formatAvailableFrom, isAvailableNow, roomTypeLabel } from '@/lib/format'

function getRoomTitle(room: RoomWithProperty): { title: string; subtitle: string } {
  const address = room.property_name
  const postcode = room.property_postcode
  const city = room.property_city

  if (room.advert_title && !room.advert_title.includes(address)) {
    return {
      title: room.advert_title,
      subtitle: `${address}, ${postcode}`,
    }
  }

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
                alt={`${room.property_name} - ${room.name}`}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                quality={85}
              />
            </div>
            {/* Gradient overlay */}
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
          {room.property_city}
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="text-base font-semibold leading-snug" style={{ color: '#1a1a2e' }}>
          {title}
        </h3>
        <p className="text-sm truncate" style={{ color: '#6b7280' }}>
          {subtitle}
        </p>

        {/* Rent + Bills */}
        <div className="flex items-center gap-2">
          <span className="text-2xl" style={{ color: '#1a1a2e', fontFamily: 'var(--font-display)' }}>
            &pound;{Math.round(room.rent_pcm)}
          </span>
          <span className="text-sm" style={{ color: '#6b7280' }}>/month</span>
          <span
            className="ml-auto inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
            style={
              room.bills_included
                ? { backgroundColor: '#ecf5ee', color: '#2d6a4f' }
                : { backgroundColor: '#fef6e7', color: '#b45309' }
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
                className="inline-flex items-center rounded-md px-2 py-1 text-xs"
                style={{ backgroundColor: '#f5f3f0', color: '#6b7280' }}
              >
                {a}
              </span>
            ))}
          </div>
        )}

        {/* Available date + View Room link */}
        <div className="mt-auto flex items-center justify-between pt-2">
          <span
            className="text-sm font-medium"
            style={{ color: availNow ? '#2d6a4f' : '#6b7280' }}
          >
            {availText}
          </span>
          <span
            className="text-sm font-semibold transition-colors duration-200"
            style={{ color: '#1a1a2e' }}
          >
            View Room &rarr;
          </span>
        </div>
      </div>
    </Link>
  )
}
