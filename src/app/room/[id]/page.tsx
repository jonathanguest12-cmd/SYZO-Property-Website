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
import ExpandableText from '@/components/ExpandableText'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Parse advert_description into structured paragraphs */
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
            <li key={i} className="text-sm leading-relaxed" style={{ color: '#6B7280' }}>{item}</li>
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
        <p key={key++} className="text-sm font-semibold" style={{ color: '#2D3038' }}>{line}</p>
      )
      continue
    }

    flushBullets()

    // Split long sentences on topic boundaries for readability
    const sentences = line.match(/[^.!?]+[.!?]+/g)
    if (sentences && sentences.length > 2) {
      // Group into paragraphs of ~2 sentences
      for (let i = 0; i < sentences.length; i += 2) {
        const chunk = sentences.slice(i, i + 2).join('').trim()
        if (chunk) {
          elements.push(
            <p key={key++} className="text-sm leading-relaxed" style={{ color: '#6B7280' }}>{chunk}</p>
          )
        }
      }
    } else {
      elements.push(
        <p key={key++} className="text-sm leading-relaxed" style={{ color: '#6B7280' }}>{line}</p>
      )
    }
  }

  flushBullets()

  return (
    <div className="max-w-prose space-y-3">
      {elements}
    </div>
  )
}

/** Extract letting details from additional_info JSONB */
function getLettingDetails(room: RoomWithProperty) {
  const info = room.additional_info ?? {}
  const prop = info.property ?? {}

  const minMonths = prop.minimumMonthsRental ?? null
  return {
    deposit: info.depositAmountRequired ?? null,
    minTenancy: minMonths != null && minMonths > 0 ? `${minMonths} months` : null,
    couplesWelcome: info.couplesWelcome ?? null,
  }
}

/** Deduplicate photos by URL and merge room + property photos */
function buildGalleryPhotos(room: RoomWithProperty): { url: string; title: string }[] {
  const roomPhotos = (room.photo_urls ?? []).map((url) => ({ url, title: 'Room' }))
  const propertyPhotos = (room.property_images ?? []).length > 1
    ? (room.property_images ?? []).slice(1) // skip first (usually exterior drawing)
    : []
  const all = [...roomPhotos, ...propertyPhotos]

  // Deduplicate by URL
  const seen = new Set<string>()
  return all.filter((p) => {
    if (seen.has(p.url)) return false
    seen.add(p.url)
    return true
  })
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

  return {
    title: `${room.property_name} - SYZO`,
    description: `Room at ${room.property_name}, ${room.property_city}. \u00A3${Math.round(room.rent_pcm)}/month. ${room.bills_included ? 'Bills included.' : 'Bills extra.'}`,
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

  const availText = formatAvailableFrom(room.available_from)
  const availNow = isAvailableNow(room.available_from)
  const letting = getLettingDetails(room)
  const galleryPhotos = buildGalleryPhotos(room)

  // Determine en-suite status from amenities
  const hasEnSuite = room.room_amenities.some(
    (a) => a.toLowerCase().includes('en-suite') || a.toLowerCase().includes('ensuite')
  )

  return (
    <>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium mb-6 transition-colors duration-200 hover:opacity-70"
          style={{ color: '#6B7280' }}
        >
          &larr; Back to all rooms
        </Link>

        {/* Photo gallery — merged room + property photos, deduplicated */}
        <PhotoGallery photos={galleryPhotos} alt={room.property_name} />

        {/* Two-column layout */}
        <div className="mt-8 grid gap-8 lg:grid-cols-12">
          {/* LEFT column */}
          <div className="flex flex-col gap-5 lg:col-span-7">
            {/* Title block */}
            <div>
              <h1
                className="text-2xl font-bold tracking-tight md:text-3xl"
                style={{ color: '#2D3038' }}
              >
                {room.property_name}
              </h1>
              <p className="mt-1.5 text-sm" style={{ color: '#9CA3AF' }}>
                {room.property_city}, {room.property_postcode}
                {room.room_type && ` \u00B7 ${roomTypeLabel(room.room_type)}`}
                {hasEnSuite && ' \u00B7 En-suite'}
              </p>
            </div>

            {/* Card 1: Letting Details */}
            <div className="rounded-xl bg-white p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <h2 className="text-sm font-semibold uppercase tracking-[0.1em] mb-4" style={{ color: '#9CA3AF' }}>
                Letting Details
              </h2>
              <div className="flex flex-col divide-y" style={{ borderColor: '#F0EFEC' }}>
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm" style={{ color: '#6B7280' }}>Rent</span>
                  <span className="text-xl font-bold tabular-nums" style={{ color: '#2D3038' }}>
                    &pound;{Math.round(room.rent_pcm)}<span className="text-sm font-normal ml-1" style={{ color: '#9CA3AF' }}>pcm</span>
                  </span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm" style={{ color: '#6B7280' }}>Bills</span>
                  <span
                    className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    style={
                      room.bills_included
                        ? { backgroundColor: '#F0FAF0', color: '#16A34A' }
                        : { backgroundColor: '#FEF9EF', color: '#B45309' }
                    }
                  >
                    {room.bills_included ? 'Included' : 'Not included'}
                  </span>
                </div>
                {letting.deposit != null && (
                  <div className="flex items-center justify-between py-3">
                    <span className="text-sm" style={{ color: '#6B7280' }}>Deposit</span>
                    <span className="text-sm font-medium" style={{ color: '#2D3038' }}>
                      &pound;{Math.round(Number(letting.deposit))}
                    </span>
                  </div>
                )}
                {room.room_type && (
                  <div className="flex items-center justify-between py-3">
                    <span className="text-sm" style={{ color: '#6B7280' }}>Room type</span>
                    <span className="text-sm font-medium" style={{ color: '#2D3038' }}>
                      {roomTypeLabel(room.room_type)}{hasEnSuite ? ' (en-suite)' : ''}
                    </span>
                  </div>
                )}
                {letting.minTenancy != null && (
                  <div className="flex items-center justify-between py-3">
                    <span className="text-sm" style={{ color: '#6B7280' }}>Min. tenancy</span>
                    <span className="text-sm font-medium" style={{ color: '#2D3038' }}>
                      {letting.minTenancy}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm" style={{ color: '#6B7280' }}>Available</span>
                  <span
                    className="text-sm font-semibold"
                    style={{ color: availNow ? '#16A34A' : '#6B7280' }}
                  >
                    {availText}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Property Description — with Show More toggle */}
            {room.advert_description && (
              <div className="rounded-xl bg-white p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <h2 className="text-sm font-semibold uppercase tracking-[0.1em] mb-4" style={{ color: '#9CA3AF' }}>
                  Property Description
                </h2>
                <ExpandableText maxHeight={200}>
                  <FormattedDescription html={room.advert_description} />
                </ExpandableText>
              </div>
            )}

            {/* Card 3: Property Features */}
            {room.property_amenities.length > 0 && (
              <div className="rounded-xl bg-white p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <h2 className="text-sm font-semibold uppercase tracking-[0.1em] mb-4" style={{ color: '#9CA3AF' }}>
                  Property Features
                </h2>
                <div className="flex flex-wrap gap-2">
                  {room.property_amenities.map((a) => (
                    <span
                      key={a}
                      className="inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium"
                      style={{ backgroundColor: '#F7F6F3', color: '#2D3038' }}
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Card 4: House Rules */}
            {(room.property_pets_allowed !== null || room.property_smoking_allowed !== null || letting.couplesWelcome !== null) && (
              <div className="rounded-xl bg-white p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <h2 className="text-sm font-semibold uppercase tracking-[0.1em] mb-4" style={{ color: '#9CA3AF' }}>
                  House Rules
                </h2>
                <div className="flex flex-wrap gap-2">
                  {room.property_pets_allowed !== null && (
                    <span
                      className="inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium"
                      style={{ backgroundColor: '#F7F6F3', color: '#2D3038' }}
                    >
                      {room.property_pets_allowed ? 'Pets allowed' : 'No pets'}
                    </span>
                  )}
                  {room.property_smoking_allowed !== null && (
                    <span
                      className="inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium"
                      style={{ backgroundColor: '#F7F6F3', color: '#2D3038' }}
                    >
                      {room.property_smoking_allowed ? 'Smoking allowed' : 'No smoking'}
                    </span>
                  )}
                  {letting.couplesWelcome !== null && (
                    <span
                      className="inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium"
                      style={{ backgroundColor: '#F7F6F3', color: '#2D3038' }}
                    >
                      {letting.couplesWelcome ? 'Couples welcome' : 'Single occupancy'}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT column: Sticky CTA */}
          <div className="lg:col-span-5">
            <div
              className="sticky top-24 flex flex-col gap-4 rounded-xl bg-white p-6"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            >
              <div>
                <p className="text-3xl font-bold tabular-nums" style={{ color: '#2D3038' }}>
                  &pound;{Math.round(room.rent_pcm)}
                  <span className="text-base font-normal ml-1" style={{ color: '#9CA3AF' }}>pcm</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  style={
                    room.bills_included
                      ? { backgroundColor: '#F0FAF0', color: '#16A34A' }
                      : { backgroundColor: '#FEF9EF', color: '#B45309' }
                  }
                >
                  {room.bills_included ? 'Bills included' : 'Bills not included'}
                </span>
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  style={
                    availNow
                      ? { backgroundColor: '#F0FAF0', color: '#16A34A' }
                      : { backgroundColor: '#F7F6F3', color: '#6B7280' }
                  }
                >
                  {availText}
                </span>
              </div>
              <Link
                href={`/apply/${room.id}`}
                className="btn-primary mt-2 w-full inline-flex items-center justify-center rounded-lg px-6 py-3.5 text-base font-semibold text-white"
              >
                Apply to Rent
              </Link>
              <p className="text-center text-sm" style={{ color: '#9CA3AF' }}>
                or email{' '}
                <a href="mailto:hello@syzo.co" className="font-medium underline underline-offset-2" style={{ color: '#2D3038' }}>
                  hello@syzo.co
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Other rooms at this property */}
        {otherRooms.length > 0 && (
          <div className="mt-14">
            <h2
              className="text-sm font-semibold uppercase tracking-[0.1em] mb-5"
              style={{ color: '#9CA3AF' }}
            >
              Other Rooms at {room.property_name}
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {otherRooms.map((otherRoom) => (
                <Link
                  key={otherRoom.id}
                  href={`/room/${otherRoom.id}`}
                  className="flex flex-shrink-0 gap-4 rounded-xl bg-white p-4 transition-shadow duration-200 hover:shadow-md"
                  style={{
                    width: '280px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  <div
                    className="relative flex-shrink-0 overflow-hidden rounded-lg"
                    style={{ width: '80px', height: '60px', backgroundColor: '#E5E3DF' }}
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
                      <div className="flex h-full items-center justify-center text-xs" style={{ color: '#9CA3AF' }}>
                        No photo
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="font-semibold text-sm" style={{ color: '#2D3038' }}>{otherRoom.name}</p>
                    <p className="text-lg font-bold tabular-nums" style={{ color: '#2D3038' }}>
                      &pound;{Math.round(otherRoom.rent_pcm)}
                      <span className="text-xs font-normal ml-1" style={{ color: '#9CA3AF' }}>/month</span>
                    </p>
                    <span
                      className="text-xs font-semibold"
                      style={{ color: otherRoom.bills_included ? '#16A34A' : '#B45309' }}
                    >
                      {otherRoom.bills_included ? 'Bills inc.' : 'Bills extra'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mobile sticky CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 bg-white p-4 lg:hidden"
        style={{ boxShadow: '0 -1px 8px rgba(0,0,0,0.06)' }}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xl font-bold tabular-nums" style={{ color: '#2D3038' }}>
              &pound;{Math.round(room.rent_pcm)}
              <span className="text-sm font-normal ml-1" style={{ color: '#9CA3AF' }}>/mo</span>
            </p>
            <p className="text-xs font-medium" style={{ color: availNow ? '#16A34A' : '#6B7280' }}>
              {availText}
            </p>
          </div>
          <Link
            href={`/apply/${room.id}`}
            className="inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold text-white"
            style={{ backgroundColor: '#2D3038' }}
          >
            Apply to Rent
          </Link>
        </div>
      </div>
    </>
  )
}
