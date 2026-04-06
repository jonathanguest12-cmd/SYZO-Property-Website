import Image from 'next/image'
import Link from 'next/link'
import type { RoomWithProperty } from '@/lib/types'

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  if (date <= now) return 'Available Now'
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function roomTypeLabel(roomType: string): string {
  if (roomType === 'doubleRoom') return 'Double'
  if (roomType === 'singleRoom') return 'Single'
  return 'Room'
}

export default function RoomCard({ room }: { room: RoomWithProperty }) {
  const photoUrl = room.photo_urls.length > 0 ? room.photo_urls[0] : null

  return (
    <div className="group overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Image */}
      <div className="relative aspect-[4/3] w-full bg-gray-100">
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt={`${room.property_name} - ${room.name}`}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
            No photo
          </div>
        )}
        {/* City label */}
        <span className="absolute left-2 top-2 rounded bg-white/90 px-2 py-0.5 text-xs font-medium text-gray-700">
          {room.property_city}
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-2 p-4">
        <p className="text-sm text-gray-500 truncate">{room.property_name}</p>

        <div className="flex items-baseline gap-1">
          <span className="text-xl font-bold text-gray-900">
            &pound;{Math.round(room.rent_pcm)}
          </span>
          <span className="text-sm text-gray-500">/month</span>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
            {roomTypeLabel(room.room_type)}
          </span>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              room.bills_included
                ? 'bg-green-50 text-green-700'
                : 'bg-amber-50 text-amber-700'
            }`}
          >
            {room.bills_included ? 'Bills Inc.' : 'Bills Extra'}
          </span>
        </div>

        <p className="text-sm text-gray-600">{formatDate(room.available_from)}</p>

        <Link
          href={`/apply/${room.id}`}
          className="mt-1 inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
        >
          Apply to Rent
        </Link>
      </div>
    </div>
  )
}
