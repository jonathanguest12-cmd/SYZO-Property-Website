import Image from 'next/image'
import Link from 'next/link'
import type { RoomWithProperty } from '@/lib/types'
import { formatAvailableFrom, isAvailableNow, roomTypeLabel, isIllustrationPhoto } from '@/lib/format'

/** SVG house icon for no-photo placeholder */
function HouseIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  )
}

function formatRoomAddress(propertyName: string, roomName: string): string {
  const stripped = propertyName.replace(/^\d+[-\s]+/, '').trim()
  return `${roomName}, ${stripped}`
}

/** Build consistent feature pills: room type + en-suite if applicable */
function getFeaturePills(room: RoomWithProperty): string[] {
  const pills: string[] = []

  // Room type
  const type = roomTypeLabel(room.room_type)
  if (type !== 'Room') pills.push(type.replace(' Room', ''))

  // En-suite detection from room amenities
  const hasEnSuite = room.room_amenities.some(
    (a) => a.toLowerCase().includes('en-suite') || a.toLowerCase().includes('ensuite')
  )
  if (hasEnSuite) pills.push('En-suite')

  return pills
}

export default function RoomCard({ room }: { room: RoomWithProperty }) {
  const photoUrl = room.photo_urls.length > 0 ? room.photo_urls[0] : null
  const availText = formatAvailableFrom(room.available_from)
  const availNow = isAvailableNow(room.available_from)
  const featurePills = getFeaturePills(room)

  // Count total gallery photos (room + property, deduped) to match detail page
  const totalPhotos = (() => {
    const roomUrls = room.photo_urls ?? []
    const propImages = (room.property_images ?? []).filter((img) => !isIllustrationPhoto(img.title || ''))
    const seen = new Set<string>()
    let count = 0
    for (const url of roomUrls) {
      const filename = url.split('/').pop() || url
      if (!seen.has(url) && !seen.has(filename) && !/thumb|small|150x|100x/i.test(url)) {
        seen.add(url)
        seen.add(filename)
        count++
      }
    }
    for (const img of propImages) {
      const filename = img.url.split('/').pop() || img.url
      if (!seen.has(img.url) && !seen.has(filename) && !/thumb|small|150x|100x/i.test(img.url)) {
        seen.add(img.url)
        seen.add(filename)
        count++
      }
    }
    return count
  })()

  return (
    <Link
      href={`/room/${room.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white card-hover"
    >
      {/* Image */}
      <div className="relative w-full overflow-hidden">
        {photoUrl ? (
          <div style={{ aspectRatio: '16/10' }}>
            <Image
              src={photoUrl}
              alt={`${room.property_name} - ${room.name}`}
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
            <HouseIcon />
            <span className="text-xs font-medium">No photo</span>
          </div>
        )}
        {/* City badge */}
        <span
          className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase"
          style={{ backgroundColor: 'rgba(255,255,255,0.92)', color: '#2D3038' }}
        >
          {room.property_city}
        </span>
        {/* Photo count badge */}
        {totalPhotos > 1 && (
          <span
            className="absolute bottom-2 right-2 rounded-md px-1.5 py-0.5 text-[11px] font-medium flex items-center gap-1"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: '#ffffff' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            {totalPhotos}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-3 p-5">
        {/* Title: always street address */}
        <div>
          <h3 className="text-[15px] font-semibold leading-snug" style={{ color: '#2D3038' }}>
            {formatRoomAddress(room.property_name, room.name)}
          </h3>
          <p className="mt-0.5 text-sm truncate" style={{ color: '#9CA3AF' }}>
            {room.property_city}, {room.property_postcode}
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

        {/* Feature pills: Double, En-suite, etc. */}
        {featurePills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {featurePills.map((pill) => (
              <span
                key={pill}
                className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
                style={{ backgroundColor: '#F7F6F3', color: '#2D3038' }}
              >
                {pill}
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
