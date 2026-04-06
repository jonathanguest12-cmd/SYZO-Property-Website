import Image from 'next/image'
import Link from 'next/link'
import type { RoomWithProperty } from '@/lib/types'

function formatDate(dateStr: string): { text: string; isNow: boolean } {
  const date = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  if (date <= now) return { text: 'Available Now', isNow: true }
  return {
    text: date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    isNow: false,
  }
}

function roomTypeLabel(roomType: string): string {
  if (roomType === 'doubleRoom') return 'Double Room'
  if (roomType === 'singleRoom') return 'Single Room'
  return 'Room'
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trimEnd() + '...'
}

function getRoomTitle(room: RoomWithProperty): string {
  if (room.advert_title) return room.advert_title
  const type = roomTypeLabel(room.room_type)
  return `${type} \u2014 ${room.property_name}`
}

export default function RoomCard({ room }: { room: RoomWithProperty }) {
  const photoUrl = room.photo_urls.length > 0 ? room.photo_urls[0] : null
  const availability = formatDate(room.available_from)
  const description = room.room_description ? truncate(stripHtml(room.room_description), 80) : null
  const amenities = room.room_amenities.slice(0, 3)
  const title = getRoomTitle(room)

  return (
    <Link
      href={`/room/${room.id}`}
      className="group flex flex-col overflow-hidden bg-white transition-all duration-200"
      style={{
        borderRadius: '12px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'
      }}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden" style={{ backgroundColor: '#F0F0F0' }}>
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt={`${room.property_name} - ${room.name}`}
            fill
            className="object-cover transition-transform duration-200 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
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
          {room.property_name}, {room.property_postcode}
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

        {/* Description */}
        {description && (
          <p className="text-sm leading-relaxed" style={{ color: '#888888' }}>
            {description}
          </p>
        )}

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
            style={{ color: availability.isNow ? '#2E7D32' : '#888888' }}
          >
            {availability.text}
          </span>
          <span
            className="inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium text-white"
            style={{ backgroundColor: '#2D3038' }}
          >
            View Room
          </span>
        </div>
      </div>
    </Link>
  )
}
