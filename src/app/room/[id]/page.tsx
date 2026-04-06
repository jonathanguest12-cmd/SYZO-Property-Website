import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import {
  fetchRoomById,
  fetchRoomBySpareRoomId,
  fetchRoomsForProperty,
} from '@/lib/queries'
import type { RoomWithProperty } from '@/lib/types'
import { formatAvailableFrom, isAvailableNow, roomTypeLabel, stripHtml } from '@/lib/format'
import PhotoGallery from '@/components/PhotoGallery'

// UUID v4 pattern
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function getRoomTitle(room: RoomWithProperty): string {
  if (room.advert_title) return room.advert_title
  const type = roomTypeLabel(room.room_type)
  return `${type} \u2014 ${room.property_name}`
}

/** Parse advert_description into structured content */
function FormattedDescription({ html }: { html: string }) {
  // Strip ALL HTML tags first
  const plain = stripHtml(html)
  // Split on newlines
  const lines = plain.split(/\n/)

  const elements: React.ReactNode[] = []
  let currentBullets: string[] = []
  let key = 0

  function flushBullets() {
    if (currentBullets.length > 0) {
      elements.push(
        <ul key={key++} className="list-disc pl-5 space-y-1">
          {currentBullets.map((item, i) => (
            <li key={i} className="text-gray-600 leading-relaxed">{item}</li>
          ))}
        </ul>
      )
      currentBullets = []
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) {
      // Empty line = paragraph break, flush any bullets
      flushBullets()
      continue
    }

    // Check if bullet: starts with -, bullet, dash, or tilde
    const bulletMatch = line.match(/^[-\u2022\u2013~]\s*(.*)/)
    if (bulletMatch) {
      currentBullets.push(bulletMatch[1])
      continue
    }

    // Check if subheading: short line ending with : or ;
    if (line.length < 60 && (line.endsWith(':') || line.endsWith(';'))) {
      flushBullets()
      elements.push(
        <p key={key++} className="font-semibold text-gray-800">{line}</p>
      )
      continue
    }

    // Normal paragraph
    flushBullets()
    elements.push(
      <p key={key++} className="text-gray-600 leading-relaxed">{line}</p>
    )
  }

  flushBullets()

  return (
    <div className="max-w-prose space-y-4">
      {elements}
    </div>
  )
}

async function resolveRoom(id: string): Promise<RoomWithProperty | null> {
  if (UUID_RE.test(id)) {
    const room = await fetchRoomById(id)
    if (room) return room
  }
  return fetchRoomBySpareRoomId(id)
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const room = await resolveRoom(id)
  if (!room) return { title: 'Room Not Found - SYZO' }

  const title = getRoomTitle(room)
  return {
    title: `${title} - SYZO`,
    description: `${title} in ${room.property_city}. \u00A3${Math.round(room.rent_pcm)}/month. ${room.bills_included ? 'Bills included.' : 'Bills extra.'}`,
  }
}

export default async function RoomDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const room = await resolveRoom(id)
  if (!room) notFound()

  const otherRooms = (await fetchRoomsForProperty(room.property_ref)).filter(
    (r) => r.id !== room.id
  )

  const title = getRoomTitle(room)
  const availText = formatAvailableFrom(room.available_from)
  const availNow = isAvailableNow(room.available_from)

  // Build photo list: room photos first, then property photos (skip first property photo — often a drawing)
  const roomPhotos = (room.photo_urls ?? []).map((url) => ({ url, title: 'Room' }))
  const propertyPhotos = room.property_images ?? []
  // For shared spaces gallery: skip first property photo (exterior drawing). If only 1, don't show section.
  const sharedSpacePhotos = propertyPhotos.length > 1 ? propertyPhotos.slice(1) : []

  // For the main gallery: room photos + property photos (skipping first)
  const allGalleryPhotos = [
    ...roomPhotos,
    ...sharedSpacePhotos,
  ]

  return (
    <>
      <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm font-medium mb-6 transition-colors duration-200"
          style={{ color: '#888888' }}
        >
          &larr; Back to all rooms
        </Link>

        {/* 1. Photo gallery */}
        <PhotoGallery photos={allGalleryPhotos} alt={title} />

        {/* 2. Two-column layout */}
        <div className="mt-8 grid gap-8 lg:grid-cols-12">
          {/* LEFT column: Room details */}
          <div className="flex flex-col gap-6 lg:col-span-7">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#2D3038' }}>
                {title}
              </h1>
              <p className="mt-1 text-gray-500">
                {room.property_name}, {room.property_city}, {room.property_postcode}
              </p>
            </div>

            {/* Description */}
            {room.advert_description && (
              <div>
                <h2 className="text-lg font-bold mb-3" style={{ color: '#2D3038' }}>About this room</h2>
                <FormattedDescription html={room.advert_description} />
              </div>
            )}
          </div>

          {/* RIGHT column: Sticky CTA card */}
          <div className="lg:col-span-5">
            <div
              className="sticky top-24 flex flex-col gap-4 rounded-xl bg-white p-6"
              style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
            >
              <p className="text-3xl font-bold" style={{ color: '#2D3038' }}>
                &pound;{Math.round(room.rent_pcm)}<span className="text-base font-normal text-gray-500"> /month</span>
              </p>
              <p
                className="text-sm font-medium"
                style={{ color: room.bills_included ? '#2E7D32' : '#B45309' }}
              >
                {room.bills_included ? 'Bills included' : 'Bills not included'}
              </p>
              <p className="text-sm font-medium" style={{ color: availNow ? '#2E7D32' : '#888888' }}>
                {availText}
              </p>
              {room.room_type && (
                <p className="text-sm text-gray-500">
                  {roomTypeLabel(room.room_type)}
                </p>
              )}
              <Link
                href={`/apply/${room.id}`}
                className="mt-2 w-full inline-flex items-center justify-center rounded-lg px-6 py-3 text-base font-semibold text-white transition-opacity duration-200 hover:opacity-90"
                style={{ backgroundColor: '#1a1a2e' }}
              >
                Apply to Rent
              </Link>
            </div>
          </div>
        </div>

        {/* 3. Property features — amenity grid */}
        {(room.room_amenities.length > 0 || room.property_amenities.length > 0) && (
          <div className="mt-10">
            {room.room_amenities.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-bold mb-3" style={{ color: '#2D3038' }}>Room Features</h2>
                <div className="flex flex-wrap gap-2">
                  {room.room_amenities.map((a) => (
                    <span
                      key={a}
                      className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium"
                      style={{ backgroundColor: '#F0F0F0', color: '#2D3038' }}
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {room.property_amenities.length > 0 && (
              <div>
                <h2 className="text-lg font-bold mb-3" style={{ color: '#2D3038' }}>Property Features</h2>
                <div className="flex flex-wrap gap-2">
                  {room.property_amenities.map((a) => (
                    <span
                      key={a}
                      className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium"
                      style={{ backgroundColor: '#F0F0F0', color: '#2D3038' }}
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. House rules */}
        {(room.property_pets_allowed !== null || room.property_smoking_allowed !== null) && (
          <div className="mt-10">
            <h2 className="text-lg font-bold mb-3" style={{ color: '#2D3038' }}>House Rules</h2>
            <div className="flex flex-wrap gap-3">
              {room.property_pets_allowed !== null && (
                <span
                  className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium"
                  style={{ backgroundColor: '#F0F0F0', color: '#2D3038' }}
                >
                  {room.property_pets_allowed ? 'Pets allowed' : 'No pets'}
                </span>
              )}
              {room.property_smoking_allowed !== null && (
                <span
                  className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium"
                  style={{ backgroundColor: '#F0F0F0', color: '#2D3038' }}
                >
                  {room.property_smoking_allowed ? 'Smoking allowed' : 'No smoking'}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Shared spaces gallery */}
        {sharedSpacePhotos.length > 0 && (
          <div className="mt-10">
            <h2 className="text-lg font-bold mb-3" style={{ color: '#2D3038' }}>Shared Spaces</h2>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
              {sharedSpacePhotos.map((img, idx) => (
                <div
                  key={idx}
                  className="relative overflow-hidden rounded-xl"
                  style={{ aspectRatio: '4/3', backgroundColor: '#F0F0F0' }}
                >
                  <Image
                    src={img.url}
                    alt={img.title || `Shared space ${idx + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    quality={85}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. Other rooms */}
        {otherRooms.length > 0 && (
          <div className="mt-12">
            <h2 className="text-lg font-bold mb-4" style={{ color: '#2D3038' }}>
              Other Rooms at {room.property_name}
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {otherRooms.map((otherRoom) => (
                <Link
                  key={otherRoom.id}
                  href={`/room/${otherRoom.id}`}
                  className="flex flex-shrink-0 gap-4 rounded-xl p-4 transition-all duration-200 hover:shadow-lg"
                  style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', width: '280px' }}
                >
                  <div className="relative flex-shrink-0 overflow-hidden rounded-lg" style={{ width: '80px', height: '60px', backgroundColor: '#F0F0F0' }}>
                    {otherRoom.photo_urls[0] ? (
                      <Image
                        src={otherRoom.photo_urls[0]}
                        alt={otherRoom.name}
                        fill
                        className="object-cover"
                        sizes="80px"
                        quality={85}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs" style={{ color: '#888888' }}>
                        No photo
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="font-semibold text-sm" style={{ color: '#2D3038' }}>{otherRoom.name}</p>
                    <p className="text-sm font-bold" style={{ color: '#2D3038' }}>
                      &pound;{Math.round(otherRoom.rent_pcm)} /month
                    </p>
                    <p
                      className="text-xs font-medium"
                      style={{ color: otherRoom.bills_included ? '#2E7D32' : '#B45309' }}
                    >
                      {otherRoom.bills_included ? 'Bills inc.' : 'Bills extra'}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mobile sticky CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 p-4 lg:hidden"
        style={{ backgroundColor: '#FFFFFF', boxShadow: '0 -2px 12px rgba(0,0,0,0.1)' }}
      >
        <Link
          href={`/apply/${room.id}`}
          className="flex w-full items-center justify-center rounded-lg px-6 py-3 text-base font-semibold text-white transition-opacity duration-200 hover:opacity-90"
          style={{ backgroundColor: '#1a1a2e' }}
        >
          Apply to Rent &mdash; &pound;{Math.round(room.rent_pcm)}/mo
        </Link>
      </div>
    </>
  )
}
