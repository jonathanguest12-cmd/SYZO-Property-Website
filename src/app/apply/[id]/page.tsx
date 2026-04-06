import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  fetchRoomById,
  fetchRoomBySpareRoomId,
  insertStaleLinkLead,
} from '@/lib/queries'
import type { RoomWithProperty } from '@/lib/types'

// UUID v4 pattern
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function getRoomTitle(room: RoomWithProperty): string {
  if (room.advert_title) return room.advert_title
  const type = room.room_type === 'doubleRoom' ? 'Double Room' : room.room_type === 'singleRoom' ? 'Single Room' : 'Room'
  return `${type} \u2014 ${room.property_name}`
}

async function resolveRoom(id: string): Promise<RoomWithProperty | null> {
  if (UUID_RE.test(id)) {
    const room = await fetchRoomById(id)
    if (room) return room
  }
  return fetchRoomBySpareRoomId(id)
}

function RoomSummary({ room }: { room: RoomWithProperty }) {
  const photoUrl = room.photo_urls.length > 0 ? room.photo_urls[0] : null
  const title = getRoomTitle(room)

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
      {/* Room context */}
      <div
        className="flex gap-4 rounded-xl p-4 mb-8"
        style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
      >
        {photoUrl && (
          <div className="relative flex-shrink-0 overflow-hidden" style={{ width: '80px', aspectRatio: '4/3', borderRadius: '8px', backgroundColor: '#F0F0F0' }}>
            <Image
              src={photoUrl}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              quality={85}
            />
          </div>
        )}
        <div className="flex flex-col gap-1">
          <h2 className="font-bold" style={{ color: '#2D3038' }}>{title}</h2>
          <p className="text-sm" style={{ color: '#888888' }}>
            {room.property_name} &middot; {room.property_city}
          </p>
          <p className="text-lg font-bold" style={{ color: '#2D3038' }}>
            &pound;{Math.round(room.rent_pcm)} /month
          </p>
        </div>
      </div>

      {/* Application form placeholder */}
      <div className="text-center">
        <h1 className="text-2xl font-extrabold" style={{ color: '#2D3038' }}>
          Apply to Rent
        </h1>
        <div
          className="mt-6 rounded-xl p-8"
          style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
        >
          <p style={{ color: '#888888' }}>
            The application form is coming soon. In the meantime, please
            contact us to express your interest.
          </p>
        </div>
        <Link
          href={`/room/${room.id}`}
          className="mt-6 inline-block text-sm font-medium transition-colors duration-200"
          style={{ color: '#888888' }}
        >
          &larr; Back to Room
        </Link>
      </div>
    </div>
  )
}

export default async function ApplyPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const room = await resolveRoom(id)
  if (room) {
    return <RoomSummary room={room} />
  }

  // Stale link -- record lead and show message
  await insertStaleLinkLead(id)

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6 text-center">
      <h1 className="text-2xl font-extrabold" style={{ color: '#2D3038' }}>Room No Longer Available</h1>
      <p className="mt-4" style={{ color: '#888888' }}>
        Sorry, the room you were looking at is no longer listed. Browse our
        other available rooms below.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-white transition-opacity duration-200 hover:opacity-90"
        style={{ backgroundColor: '#2D3038' }}
      >
        Browse Available Rooms
      </Link>
    </div>
  )
}
