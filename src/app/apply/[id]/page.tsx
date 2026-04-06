import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  fetchRoomById,
  fetchRoomBySpareRoomId,
  insertStaleLinkLead,
} from '@/lib/queries'
import type { RoomWithProperty } from '@/lib/types'

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
      {/* Room context card */}
      <div
        className="flex gap-4 rounded-xl p-4 mb-8"
        style={{ backgroundColor: '#ffffff', border: '1px solid #e8e4df' }}
      >
        {photoUrl && (
          <div
            className="relative flex-shrink-0 overflow-hidden rounded-lg"
            style={{ width: '80px', aspectRatio: '4/3', backgroundColor: '#e8e4df' }}
          >
            <Image
              src={photoUrl}
              alt={title}
              fill
              className="object-cover"
              sizes="80px"
              quality={85}
            />
          </div>
        )}
        <div className="flex flex-col gap-1">
          <h2 className="font-semibold" style={{ color: '#1a1a2e' }}>{title}</h2>
          <p className="text-sm" style={{ color: '#6b7280' }}>
            {room.property_name} &middot; {room.property_city}
          </p>
          <p style={{ color: '#1a1a2e' }}>
            <span className="text-xl" style={{ fontFamily: 'var(--font-display)' }}>
              &pound;{Math.round(room.rent_pcm)}
            </span>
            <span className="text-sm ml-1" style={{ color: '#6b7280' }}>/month</span>
          </p>
        </div>
      </div>

      {/* Application form placeholder */}
      <div className="text-center">
        <h1
          className="text-3xl font-normal"
          style={{ color: '#1a1a2e', fontFamily: 'var(--font-display)' }}
        >
          Apply to Rent
        </h1>
        <div
          className="mt-6 rounded-xl p-8"
          style={{ backgroundColor: '#ffffff', border: '1px solid #e8e4df' }}
        >
          <p style={{ color: '#6b7280' }}>
            The application form is coming soon. In the meantime, please
            contact us to express your interest.
          </p>
          <p className="mt-4 text-sm" style={{ color: '#6b7280' }}>
            Call{' '}
            <a href="tel:01174504898" className="font-medium underline underline-offset-2" style={{ color: '#1a1a2e' }}>
              0117 450 4898
            </a>
            {' '}or email{' '}
            <a href="mailto:hello@syzo.co" className="font-medium underline underline-offset-2" style={{ color: '#1a1a2e' }}>
              hello@syzo.co
            </a>
          </p>
        </div>
        <Link
          href={`/room/${room.id}`}
          className="mt-6 inline-block text-sm font-medium transition-colors duration-200"
          style={{ color: '#6b7280' }}
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
      <h1
        className="text-3xl font-normal"
        style={{ color: '#1a1a2e', fontFamily: 'var(--font-display)' }}
      >
        Room No Longer Available
      </h1>
      <p className="mt-4" style={{ color: '#6b7280' }}>
        Sorry, the room you were looking at is no longer listed. Browse our
        other available rooms below.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center justify-center rounded-xl px-6 py-3.5 text-sm font-semibold text-white transition-colors duration-200"
        style={{ backgroundColor: '#1a1a2e' }}
      >
        Browse Available Rooms
      </Link>
    </div>
  )
}
