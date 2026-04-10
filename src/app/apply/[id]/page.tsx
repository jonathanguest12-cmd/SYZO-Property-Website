import Link from 'next/link'
import { fetchRoomById, fetchRoomBySpareRoomId, insertStaleLinkLead } from '@/lib/queries'
import type { RoomWithProperty } from '@/lib/types'
import ApplyClient from './ApplyClient'

export const revalidate = 3600

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function generateStaticParams() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mtrrxtwisgftkqujfqlr.supabase.co'
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'sb_publishable_eh8vOh14012eMEE1KgLDXA_5XmDjiHU'

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/rooms?select=id&available_from=not.is.null&limit=300`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        cache: 'no-store',
      }
    )
    if (!res.ok) return []
    const rooms = await res.json()
    return rooms.map((r: { id: string }) => ({ id: r.id }))
  } catch {
    return []
  }
}

async function resolveRoom(id: string): Promise<RoomWithProperty | null> {
  if (UUID_RE.test(id)) {
    const room = await fetchRoomById(id)
    if (room) return room
  }
  return fetchRoomBySpareRoomId(id)
}

function formatAvailableLabel(availableFrom: string | null): string {
  if (!availableFrom) return 'Availability TBC'
  const date = new Date(availableFrom)
  if (Number.isNaN(date.getTime())) return 'Availability TBC'
  if (date <= new Date()) return 'Available now'
  return `Available from ${date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
  })}`
}

function getRoomTitle(room: RoomWithProperty): string {
  if (room.advert_title) return room.advert_title
  const type =
    room.room_type === 'doubleRoom'
      ? 'Double Room'
      : room.room_type === 'singleRoom'
      ? 'Single Room'
      : 'Room'
  return `${type} \u2014 ${room.property_name}`
}

export default async function ApplyPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const room = await resolveRoom(id)

  if (!room) {
    // Stale link — record lead and show fallback
    await insertStaleLinkLead(id)
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6 text-center">
        <h1
          className="text-2xl font-bold tracking-tight md:text-3xl"
          style={{ color: '#2D3038' }}
        >
          Room No Longer Available
        </h1>
        <p className="mt-4" style={{ color: '#6B7280' }}>
          Sorry, the room you were looking at is no longer listed. Browse our
          other available rooms below.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-lg px-6 py-3.5 text-sm font-semibold text-white transition-colors duration-200"
          style={{ backgroundColor: '#2D3038' }}
        >
          Browse Available Rooms
        </Link>
      </div>
    )
  }

  return (
    <ApplyClient
      roomId={room.id}
      roomName={getRoomTitle(room)}
      propertyName={room.property_name}
      propertyRef={room.property_ref}
      rentPcm={Math.round(room.rent_pcm)}
      availableLabel={formatAvailableLabel(room.available_from)}
    />
  )
}
