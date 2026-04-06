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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function getRoomTitle(room: RoomWithProperty): string {
  if (room.advert_title) return room.advert_title
  const type = roomTypeLabel(room.room_type)
  return `${type} \u2014 ${room.property_name}`
}

/** Parse advert_description into structured content */
function FormattedDescription({ html }: { html: string }) {
  const plain = stripHtml(html)
  const lines = plain.split(/\n/)

  const elements: React.ReactNode[] = []
  let currentBullets: string[] = []
  let key = 0

  function flushBullets() {
    if (currentBullets.length > 0) {
      elements.push(
        <ul key={key++} className="list-disc pl-5 space-y-1">
          {currentBullets.map((item, i) => (
            <li key={i} className="leading-relaxed" style={{ color: '#6b7280' }}>{item}</li>
          ))}
        </ul>
      )
      currentBullets = []
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) {
      flushBullets()
      continue
    }

    const bulletMatch = line.match(/^[-\u2022\u2013~]\s*(.*)/)
    if (bulletMatch) {
      currentBullets.push(bulletMatch[1])
      continue
    }

    if (line.length < 60 && (line.endsWith(':') || line.endsWith(';'))) {
      flushBullets()
      elements.push(
        <p key={key++} className="font-semibold" style={{ color: '#1a1a2e' }}>{line}</p>
      )
      continue
    }

    flushBullets()
    elements.push(
      <p key={key++} className="leading-relaxed" style={{ color: '#6b7280' }}>{line}</p>
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

  const roomPhotos = (room.photo_urls ?? []).map((url) => ({ url, title: 'Room' }))
  const propertyPhotos = room.property_images ?? []
  const sharedSpacePhotos = propertyPhotos.length > 1 ? propertyPhotos.slice(1) : []
  const allGalleryPhotos = [...roomPhotos, ...sharedSpacePhotos]

  return (
    <>
      <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm font-medium mb-6 transition-colors duration-200"
          style={{ color: '#6b7280' }}
        >
          &larr; Back to all rooms
        </Link>

        {/* Photo gallery */}
        <PhotoGallery photos={allGalleryPhotos} alt={title} />

        {/* Two-column layout */}
        <div className="mt-8 grid gap-8 lg:grid-cols-12">
          {/* LEFT column */}
          <div className="flex flex-col gap-6 lg:col-span-7">
            {/* Title */}
            <div>
              <h1
                className="text-3xl font-normal"
                style={{ color: '#1a1a2e', fontFamily: 'var(--font-display)' }}
              >
                {title}
              </h1>
              <p className="mt-1" style={{ color: '#6b7280' }}>
                {room.property_name}, {room.property_city}, {room.property_postcode}
              </p>
            </div>

            {/* Card 1: Letting Details */}
            <div
              className="rounded-xl p-6"
              style={{ backgroundColor: '#ffffff', border: '1px solid #e8e4df' }}
            >
              <h2 className="text-lg font-semibold mb-4" style={{ color: '#1a1a2e' }}>
                Letting Details
              </h2>
              <div className="flex flex-col divide-y" style={{ borderColor: '#e8e4df' }}>
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm" style={{ color: '#6b7280' }}>Rent</span>
                  <span className="text-2xl" style={{ color: '#1a1a2e', fontFamily: 'var(--font-display)' }}>
                    &pound;{Math.round(room.rent_pcm)}<span className="text-sm ml-1" style={{ color: '#6b7280', fontFamily: 'var(--font-body)' }}>/month</span>
                  </span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm" style={{ color: '#6b7280' }}>Bills</span>
                  <span
                    className="text-sm font-semibold"
                    style={{ color: room.bills_included ? '#2d6a4f' : '#b45309' }}
                  >
                    {room.bills_included ? 'Included' : 'Not included'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm" style={{ color: '#6b7280' }}>Available</span>
                  <span
                    className="text-sm font-semibold"
                    style={{ color: availNow ? '#2d6a4f' : '#6b7280' }}
                  >
                    {availText}
                  </span>
                </div>
                {room.room_type && (
                  <div className="flex items-center justify-between py-3">
                    <span className="text-sm" style={{ color: '#6b7280' }}>Room type</span>
                    <span className="text-sm font-medium" style={{ color: '#1a1a2e' }}>
                      {roomTypeLabel(room.room_type)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Card 2: About This Room */}
            {room.advert_description && (
              <div
                className="rounded-xl p-6"
                style={{ backgroundColor: '#ffffff', border: '1px solid #e8e4df' }}
              >
                <h2 className="text-lg font-semibold mb-4" style={{ color: '#1a1a2e' }}>
                  About This Room
                </h2>
                <FormattedDescription html={room.advert_description} />
              </div>
            )}

            {/* Card 3: Room Amenities */}
            {room.room_amenities.length > 0 && (
              <div
                className="rounded-xl p-6"
                style={{ backgroundColor: '#ffffff', border: '1px solid #e8e4df' }}
              >
                <h2 className="text-lg font-semibold mb-4" style={{ color: '#1a1a2e' }}>
                  Room Amenities
                </h2>
                <div className="flex flex-wrap gap-2">
                  {room.room_amenities.map((a) => (
                    <span
                      key={a}
                      className="inline-flex items-center rounded-md px-3 py-1.5 text-sm"
                      style={{ backgroundColor: '#f5f3f0', color: '#1a1a2e' }}
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Card 4: Property Features */}
            {room.property_amenities.length > 0 && (
              <div
                className="rounded-xl p-6"
                style={{ backgroundColor: '#ffffff', border: '1px solid #e8e4df' }}
              >
                <h2 className="text-lg font-semibold mb-4" style={{ color: '#1a1a2e' }}>
                  Property Features
                </h2>
                <div className="flex flex-wrap gap-2">
                  {room.property_amenities.map((a) => (
                    <span
                      key={a}
                      className="inline-flex items-center rounded-md px-3 py-1.5 text-sm"
                      style={{ backgroundColor: '#f5f3f0', color: '#1a1a2e' }}
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* House rules */}
            {(room.property_pets_allowed !== null || room.property_smoking_allowed !== null) && (
              <div
                className="rounded-xl p-6"
                style={{ backgroundColor: '#ffffff', border: '1px solid #e8e4df' }}
              >
                <h2 className="text-lg font-semibold mb-4" style={{ color: '#1a1a2e' }}>
                  House Rules
                </h2>
                <div className="flex flex-wrap gap-2">
                  {room.property_pets_allowed !== null && (
                    <span
                      className="inline-flex items-center rounded-md px-3 py-1.5 text-sm"
                      style={{ backgroundColor: '#f5f3f0', color: '#1a1a2e' }}
                    >
                      {room.property_pets_allowed ? 'Pets allowed' : 'No pets'}
                    </span>
                  )}
                  {room.property_smoking_allowed !== null && (
                    <span
                      className="inline-flex items-center rounded-md px-3 py-1.5 text-sm"
                      style={{ backgroundColor: '#f5f3f0', color: '#1a1a2e' }}
                    >
                      {room.property_smoking_allowed ? 'Smoking allowed' : 'No smoking'}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT column: Sticky CTA */}
          <div className="lg:col-span-5">
            <div
              className="sticky top-24 flex flex-col gap-4 rounded-xl p-6"
              style={{ backgroundColor: '#ffffff', border: '1px solid #e8e4df' }}
            >
              <p style={{ color: '#1a1a2e' }}>
                <span className="text-4xl" style={{ fontFamily: 'var(--font-display)' }}>
                  &pound;{Math.round(room.rent_pcm)}
                </span>
                <span className="text-base ml-1" style={{ color: '#6b7280' }}>/month</span>
              </p>
              <p
                className="text-sm font-semibold"
                style={{ color: room.bills_included ? '#2d6a4f' : '#b45309' }}
              >
                {room.bills_included ? 'Bills included' : 'Bills not included'}
              </p>
              <p
                className="text-sm font-semibold"
                style={{ color: availNow ? '#2d6a4f' : '#6b7280' }}
              >
                {availText}
              </p>
              <Link
                href={`/apply/${room.id}`}
                className="mt-2 w-full inline-flex items-center justify-center rounded-xl px-6 py-3.5 text-base font-semibold text-white transition-colors duration-200"
                style={{ backgroundColor: '#1a1a2e' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#2d2d44' }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#1a1a2e' }}
              >
                Apply to Rent
              </Link>
              <p className="text-center text-sm" style={{ color: '#6b7280' }}>
                or call{' '}
                <a href="tel:01174504898" className="font-medium underline underline-offset-2" style={{ color: '#1a1a2e' }}>
                  0117 450 4898
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Shared spaces gallery */}
        {sharedSpacePhotos.length > 0 && (
          <div className="mt-12">
            <h2
              className="text-2xl font-normal mb-4"
              style={{ color: '#1a1a2e', fontFamily: 'var(--font-display)' }}
            >
              Shared Spaces
            </h2>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
              {sharedSpacePhotos.map((img, idx) => (
                <div
                  key={idx}
                  className="relative overflow-hidden rounded-xl"
                  style={{ aspectRatio: '4/3', backgroundColor: '#e8e4df' }}
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

        {/* Other rooms */}
        {otherRooms.length > 0 && (
          <div className="mt-12">
            <h2
              className="text-2xl font-normal mb-4"
              style={{ color: '#1a1a2e', fontFamily: 'var(--font-display)' }}
            >
              Other Rooms at {room.property_name}
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {otherRooms.map((otherRoom) => (
                <Link
                  key={otherRoom.id}
                  href={`/room/${otherRoom.id}`}
                  className="flex flex-shrink-0 gap-4 rounded-xl p-4 transition-all duration-200 hover:shadow-lg"
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e8e4df',
                    width: '280px',
                  }}
                >
                  <div
                    className="relative flex-shrink-0 overflow-hidden rounded-lg"
                    style={{ width: '80px', height: '60px', backgroundColor: '#e8e4df' }}
                  >
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
                      <div className="flex h-full items-center justify-center text-xs" style={{ color: '#6b7280' }}>
                        No photo
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="font-semibold text-sm" style={{ color: '#1a1a2e' }}>{otherRoom.name}</p>
                    <p className="text-lg" style={{ color: '#1a1a2e', fontFamily: 'var(--font-display)' }}>
                      &pound;{Math.round(otherRoom.rent_pcm)}
                      <span className="text-xs ml-1" style={{ color: '#6b7280', fontFamily: 'var(--font-body)' }}>/month</span>
                    </p>
                    <p
                      className="text-xs font-semibold"
                      style={{ color: otherRoom.bills_included ? '#2d6a4f' : '#b45309' }}
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
        style={{ backgroundColor: '#ffffff', boxShadow: '0 -2px 12px rgba(0,0,0,0.1)' }}
      >
        <div className="flex items-center justify-between gap-4">
          <p style={{ color: '#1a1a2e' }}>
            <span className="text-2xl" style={{ fontFamily: 'var(--font-display)' }}>
              &pound;{Math.round(room.rent_pcm)}
            </span>
            <span className="text-sm ml-1" style={{ color: '#6b7280' }}>/mo</span>
          </p>
          <Link
            href={`/apply/${room.id}`}
            className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold text-white"
            style={{ backgroundColor: '#1a1a2e' }}
          >
            Apply to Rent
          </Link>
        </div>
      </div>
    </>
  )
}
