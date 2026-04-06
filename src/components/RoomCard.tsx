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
      className="group flex flex-col overflow-hidden rounded-xl bg-white card-hover"
    >
      {/* Image */}
      <div className="relative w-full overflow-hidden" style={{ maxHeight: '200px' }}>
        {photoUrl ? (
          <div style={{ aspectRatio: '16/10', maxHeight: '200px' }}>
            <Image
              src={photoUrl}
              alt={`${room.property_name} - ${room.name}`}
              fill
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              quality={85}
            />
          </div>
        ) : (
          <div
            className="flex items-center justify-center text-sm"
            style={{
              aspectRatio: '16/10',
              maxHeight: '200px',
              background: 'linear-gradient(135deg, #E5E3DF, #D8D5D0)',
              color: '#6B7280',
            }}
          >
            No photo available
          </div>
        )}
        {/* City badge */}
        <span
          className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase"
          style={{ backgroundColor: 'rgba(255,255,255,0.92)', color: '#2D3038' }}
        >
          {room.property_city}
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-3 p-5">
        {/* Title */}
        <div>
          <h3 className="text-[15px] font-semibold leading-snug" style={{ color: '#2D3038' }}>
            {title}
          </h3>
          <p className="mt-0.5 text-sm truncate" style={{ color: '#9CA3AF' }}>
            {subtitle}
          </p>
        </div>

        {/* Rent + Bills */}
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold tabular-nums" style={{ color: '#2D3038' }}>
            &pound;{Math.round(room.rent_pcm)}
          </span>
          <span className="text-sm" style={{ color: '#9CA3AF' }}>/month</span>
          <span
            className="ml-auto inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={
              room.bills_included
                ? { backgroundColor: '#F0FAF0', color: '#16A34A' }
                : { backgroundColor: '#FEF9EF', color: '#B45309' }
            }
          >
            {room.bills_included ? 'Bills inc.' : 'Bills extra'}
          </span>
        </div>

        {/* Amenities */}
        {amenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {amenities.map((a) => (
              <span
                key={a}
                className="inline-flex items-center rounded-md px-2 py-0.5 text-xs"
                style={{ backgroundColor: '#F7F6F3', color: '#6B7280' }}
              >
                {a}
              </span>
            ))}
          </div>
        )}

        {/* Available + CTA */}
        <div
          className="mt-auto flex items-center justify-between pt-3"
          style={{ borderTop: '1px solid #F0EFEC' }}
        >
          <span
            className="text-sm font-medium"
            style={{ color: availNow ? '#16A34A' : '#6B7280' }}
          >
            {availText}
          </span>
          <span
            className="text-sm font-semibold transition-all duration-200 group-hover:translate-x-0.5"
            style={{ color: '#2D3038' }}
          >
            View Room &rarr;
          </span>
        </div>
      </div>
    </Link>
  )
}
