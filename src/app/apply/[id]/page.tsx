import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  fetchRoomById,
  fetchRoomBySpareRoomId,
  insertStaleLinkLead,
} from '@/lib/queries'

// UUID v4 pattern
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function ApplyPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // Try UUID first
  if (UUID_RE.test(id)) {
    const room = await fetchRoomById(id)
    if (room) {
      return (
        <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Apply to Rent: {room.name}
          </h1>
          <p className="mt-2 text-gray-600">
            {room.property_name} &middot; {room.property_city}
          </p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            &pound;{Math.round(room.rent_pcm)} /month
          </p>
          <div className="mt-8 rounded-lg border border-gray-200 bg-white p-8">
            <p className="text-gray-500">
              The application form is coming soon. In the meantime, please
              contact us to express your interest.
            </p>
          </div>
          <Link
            href="/"
            className="mt-6 inline-block text-sm text-gray-500 hover:text-gray-700"
          >
            &larr; Back to all rooms
          </Link>
        </div>
      )
    }
  }

  // Try SpareRoom listing ID
  const roomByListing = await fetchRoomBySpareRoomId(id)
  if (roomByListing) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          Apply to Rent: {roomByListing.name}
        </h1>
        <p className="mt-2 text-gray-600">
          {roomByListing.property_name} &middot; {roomByListing.property_city}
        </p>
        <p className="mt-1 text-lg font-semibold text-gray-900">
          &pound;{Math.round(roomByListing.rent_pcm)} /month
        </p>
        <div className="mt-8 rounded-lg border border-gray-200 bg-white p-8">
          <p className="text-gray-500">
            The application form is coming soon. In the meantime, please
            contact us to express your interest.
          </p>
        </div>
        <Link
          href="/"
          className="mt-6 inline-block text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Back to all rooms
        </Link>
      </div>
    )
  }

  // Stale link — record lead and show message
  await insertStaleLinkLead(id)

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6 text-center">
      <h1 className="text-2xl font-bold text-gray-900">Room No Longer Available</h1>
      <p className="mt-4 text-gray-600">
        Sorry, the room you were looking at is no longer listed. Browse our
        other available rooms below.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center justify-center rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-700"
      >
        Browse Available Rooms
      </Link>
    </div>
  )
}
