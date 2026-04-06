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

// UUID v4 pattern
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function roomTypeLabel(roomType: string): string {
  if (roomType === 'doubleRoom') return 'Double Room'
  if (roomType === 'singleRoom') return 'Single Room'
  return 'Room'
}

function getRoomTitle(room: RoomWithProperty): string {
  if (room.advert_title) return room.advert_title
  const type = roomTypeLabel(room.room_type)
  return `${type} \u2014 ${room.property_name}`
}

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

function stripInlineStyles(html: string): string {
  return html.replace(/\s*style="[^"]*"/gi, '')
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
  const availability = formatDate(room.available_from)

  // Combine room photos + property images
  const roomPhotos = room.photo_urls ?? []
  const propertyPhotos = room.property_images ?? []
  const allPhotos = [
    ...roomPhotos.map((url) => ({ url, title: 'Room' })),
  ]
  const mainPhoto = allPhotos.length > 0 ? allPhotos[0].url : room.property_photo_url

  return (
    <>
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm font-medium mb-6 transition-colors duration-200"
          style={{ color: '#888888' }}
        >
          &larr; Back to all rooms
        </Link>

        {/* Photo gallery */}
        <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
          {/* Main image */}
          <div className="relative aspect-[4/3] w-full overflow-hidden" style={{ borderRadius: '12px', backgroundColor: '#F0F0F0' }}>
            {mainPhoto ? (
              <Image
                src={mainPhoto}
                alt={title}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 66vw"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center" style={{ color: '#888888' }}>
                No photo available
              </div>
            )}
          </div>

          {/* Thumbnail strip */}
          {allPhotos.length > 1 && (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-1 lg:grid-rows-2">
              {allPhotos.slice(1, 3).map((photo, idx) => (
                <div
                  key={idx}
                  className="relative aspect-[4/3] w-full overflow-hidden"
                  style={{ borderRadius: '12px', backgroundColor: '#F0F0F0' }}
                >
                  <Image
                    src={photo.url}
                    alt={photo.title || `Photo ${idx + 2}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 50vw, 33vw"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Room info */}
        <div className="mt-8 grid gap-8 lg:grid-cols-[2fr_1fr]">
          {/* Left column: details */}
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-2xl font-extrabold sm:text-3xl" style={{ color: '#2D3038' }}>
                {title}
              </h1>
              <p className="mt-1 text-base" style={{ color: '#888888' }}>
                {room.property_name}, {room.property_city}, {room.property_postcode}
              </p>
            </div>

            {/* Key details grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl p-4" style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <p className="text-xs font-medium uppercase tracking-wide" style={{ color: '#888888' }}>Rent</p>
                <p className="mt-1 text-lg font-bold" style={{ color: '#2D3038' }}>
                  &pound;{Math.round(room.rent_pcm)}<span className="text-sm font-normal" style={{ color: '#888888' }}>/mo</span>
                </p>
              </div>
              <div className="rounded-xl p-4" style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <p className="text-xs font-medium uppercase tracking-wide" style={{ color: '#888888' }}>Bills</p>
                <p className="mt-1 text-sm font-semibold" style={{ color: room.bills_included ? '#2E7D32' : '#B45309' }}>
                  {room.bills_included ? 'Included' : 'Extra'}
                </p>
              </div>
              <div className="rounded-xl p-4" style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <p className="text-xs font-medium uppercase tracking-wide" style={{ color: '#888888' }}>Available</p>
                <p className="mt-1 text-sm font-semibold" style={{ color: availability.isNow ? '#2E7D32' : '#2D3038' }}>
                  {availability.text}
                </p>
              </div>
              <div className="rounded-xl p-4" style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <p className="text-xs font-medium uppercase tracking-wide" style={{ color: '#888888' }}>Room Type</p>
                <p className="mt-1 text-sm font-semibold" style={{ color: '#2D3038' }}>
                  {roomTypeLabel(room.room_type)}
                </p>
              </div>
            </div>

            {/* Description */}
            {room.advert_description && (
              <div>
                <h2 className="text-lg font-bold mb-3" style={{ color: '#2D3038' }}>About this room</h2>
                <div
                  className="prose prose-sm max-w-none leading-relaxed"
                  style={{ color: '#2D3038' }}
                  dangerouslySetInnerHTML={{ __html: stripInlineStyles(room.advert_description) }}
                />
              </div>
            )}

            {/* Room amenities */}
            {room.room_amenities.length > 0 && (
              <div>
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

            {/* Property amenities */}
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

            {/* House rules */}
            {(room.property_pets_allowed !== null || room.property_smoking_allowed !== null) && (
              <div>
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
            {propertyPhotos.length > 0 && (
              <div>
                <h2 className="text-lg font-bold mb-3" style={{ color: '#2D3038' }}>Shared Spaces</h2>
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
                  {propertyPhotos.map((img, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-[4/3] overflow-hidden"
                      style={{ borderRadius: '12px', backgroundColor: '#F0F0F0' }}
                    >
                      <Image
                        src={img.url}
                        alt={img.title || `Shared space ${idx + 1}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column: CTA sidebar (desktop) */}
          <div className="hidden lg:block">
            <div
              className="sticky top-24 flex flex-col gap-4 rounded-xl p-6"
              style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
            >
              <p className="text-2xl font-bold" style={{ color: '#2D3038' }}>
                &pound;{Math.round(room.rent_pcm)}<span className="text-base font-normal" style={{ color: '#888888' }}> /month</span>
              </p>
              <p
                className="text-sm font-medium"
                style={{ color: room.bills_included ? '#2E7D32' : '#B45309' }}
              >
                {room.bills_included ? 'Bills included' : 'Bills not included'}
              </p>
              <p className="text-sm font-medium" style={{ color: availability.isNow ? '#2E7D32' : '#888888' }}>
                {availability.text}
              </p>
              <Link
                href={`/apply/${room.id}`}
                className="mt-2 inline-flex items-center justify-center rounded-full px-6 py-3 text-base font-semibold text-white transition-opacity duration-200 hover:opacity-90"
                style={{ backgroundColor: '#2D3038' }}
              >
                Apply to Rent
              </Link>
            </div>
          </div>
        </div>

        {/* Other rooms at this property */}
        {otherRooms.length > 0 && (
          <div className="mt-12">
            <h2 className="text-lg font-bold mb-4" style={{ color: '#2D3038' }}>
              Other Rooms at {room.property_name}
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {otherRooms.map((otherRoom) => (
                <Link
                  key={otherRoom.id}
                  href={`/room/${otherRoom.id}`}
                  className="flex gap-4 rounded-xl p-4 transition-all duration-200"
                  style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
                >
                  <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden" style={{ borderRadius: '8px', backgroundColor: '#F0F0F0' }}>
                    {otherRoom.photo_urls[0] ? (
                      <Image
                        src={otherRoom.photo_urls[0]}
                        alt={otherRoom.name}
                        fill
                        className="object-cover"
                        sizes="80px"
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
          className="flex w-full items-center justify-center rounded-full px-6 py-3 text-base font-semibold text-white transition-opacity duration-200 hover:opacity-90"
          style={{ backgroundColor: '#2D3038' }}
        >
          Apply to Rent &mdash; &pound;{Math.round(room.rent_pcm)}/mo
        </Link>
      </div>
    </>
  )
}
