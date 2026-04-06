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
import {
  formatAvailableFrom,
  isAvailableNow,
  roomTypeLabel,
  parseAdvertDescription,
  isIllustrationPhoto,
} from '@/lib/format'
import PhotoGallery from '@/components/PhotoGallery'
import ExpandableText from '@/components/ExpandableText'

// Import processed descriptions cache (build-time generated)
let descriptionCache: Record<string, any> = {}
try {
  descriptionCache = require('@/data/processed-descriptions.json')
} catch {
  // Cache doesn't exist yet — will fall back to raw parsing
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Render plain text with paragraph breaks, bullets, and short headings */
function TextBlock({ text }: { text: string }) {
  const lines = text.split(/\n/)
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
    if (!line) { flushBullets(); continue }

    const bulletMatch = line.match(/^[-\u2022\u2013~]\s*(.*)/)
    if (bulletMatch) { currentBullets.push(bulletMatch[1]); continue }

    if (line.length < 60 && (line.endsWith(':') || line.endsWith(';'))) {
      flushBullets()
      elements.push(<p key={key++} className="text-sm font-semibold" style={{ color: '#2D3038' }}>{line}</p>)
      continue
    }

    flushBullets()
    elements.push(<p key={key++} className="text-sm leading-relaxed" style={{ color: '#6B7280' }}>{line}</p>)
  }

  flushBullets()
  return <div className="space-y-2.5">{elements}</div>
}

/** Green checkmark list item */
function CheckItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2.5 text-sm" style={{ color: '#6B7280' }}>
      <svg className="mt-0.5 flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      {text}
    </li>
  )
}

/** Card wrapper */
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <h2 className="text-sm font-semibold uppercase tracking-[0.1em] mb-4" style={{ color: '#9CA3AF' }}>
        {title}
      </h2>
      {children}
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

/** Deduplicate photos by URL, merge room + property, skip illustrations */
function buildGalleryPhotos(room: RoomWithProperty): { url: string; title: string }[] {
  const roomPhotos = (room.photo_urls ?? []).map((url) => ({ url, title: 'Room' }))
  const propImages = room.property_images ?? []
  const propertyPhotos = propImages.filter((img) => !isIllustrationPhoto(img.title || ''))

  const all = [...roomPhotos, ...propertyPhotos]
  const seen = new Set<string>()
  return all.filter((p) => {
    // Deduplicate by full URL and by filename
    const filename = p.url.split('/').pop() || p.url
    if (seen.has(p.url) || seen.has(filename)) return false
    seen.add(p.url)
    seen.add(filename)
    // Skip thumbnails
    if (/thumb|small|150x/i.test(p.url)) return false
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

  // Try Claude-processed cache first, fall back to raw parsing
  const cached = descriptionCache[room.id] ?? null
  const parsed = !cached && room.advert_description ? parseAdvertDescription(room.advert_description) : null

  const hasEnSuite = room.room_amenities.some(
    (a) => a.toLowerCase().includes('en-suite') || a.toLowerCase().includes('ensuite')
  )

  // Build description content from either source
  const overview = cached?.property_overview ?? parsed?.description ?? null
  const roomDesc = cached?.room_description ?? null
  const whatsIncluded: string[] = cached?.whats_included ?? parsed?.whatsIncluded ?? []
  const localArea = cached?.local_area ?? null
  const localSections = parsed?.sections ?? []
  const depositInfo = cached?.deposit_info ?? parsed?.depositInfo ?? null

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

        {/* Two-column layout: LEFT = photos + CTA + other rooms (sticky), RIGHT = content cards */}
        <div className="grid gap-8 lg:grid-cols-12">

          {/* LEFT column: Photos + Apply + Other Rooms + Location (sticky on desktop) */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-20 flex flex-col gap-5">
              <PhotoGallery photos={galleryPhotos} alt={room.property_name} />

              {/* Apply to Rent — desktop only */}
              <div className="hidden lg:block">
                <Link
                  href={`/apply/${room.id}`}
                  className="btn-primary w-full inline-flex items-center justify-center rounded-lg px-6 py-3.5 text-base font-semibold text-white"
                >
                  Apply to Rent
                </Link>
              </div>

              {/* Other rooms at this property */}
              {otherRooms.length > 0 && (
                <div className="hidden lg:block">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.1em] mb-3" style={{ color: '#9CA3AF' }}>
                    Other Rooms at {room.property_name}
                  </h3>
                  <div className="flex flex-col gap-2">
                    {otherRooms.map((otherRoom) => (
                      <Link
                        key={otherRoom.id}
                        href={`/room/${otherRoom.id}`}
                        className="flex gap-3 rounded-lg bg-white p-3 transition-shadow duration-200 hover:shadow-md"
                        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                      >
                        <div
                          className="relative flex-shrink-0 overflow-hidden rounded-md"
                          style={{ width: '56px', height: '42px', backgroundColor: '#E5E3DF' }}
                        >
                          {otherRoom.photo_urls[0] ? (
                            <Image
                              src={otherRoom.photo_urls[0]}
                              alt={otherRoom.name}
                              fill
                              className="object-cover"
                              sizes="56px"
                              quality={85}
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[10px]" style={{ color: '#9CA3AF' }}>
                              No photo
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <p className="font-medium text-xs truncate" style={{ color: '#2D3038' }}>{otherRoom.name}</p>
                          <p className="text-sm font-bold tabular-nums" style={{ color: '#2D3038' }}>
                            &pound;{Math.round(otherRoom.rent_pcm)}
                            <span className="text-[10px] font-normal ml-0.5" style={{ color: '#9CA3AF' }}>/mo</span>
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Location map */}
              {room.property_postcode && (
                <div className="hidden lg:block">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.1em] mb-3" style={{ color: '#9CA3AF' }}>
                    Location
                  </h3>
                  <div className="overflow-hidden rounded-lg" style={{ aspectRatio: '4/3' }}>
                    <iframe
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(room.property_postcode)}&output=embed`}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title={`Map of ${room.property_postcode}`}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT column: Content cards */}
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
            <Card title="Letting Details">
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
                    style={room.bills_included ? { backgroundColor: '#F0FAF0', color: '#16A34A' } : { backgroundColor: '#FEF9EF', color: '#B45309' }}
                  >
                    {room.bills_included ? 'Included' : 'Not included'}
                  </span>
                </div>
                {letting.deposit != null && (
                  <div className="flex items-center justify-between py-3">
                    <span className="text-sm" style={{ color: '#6B7280' }}>Deposit</span>
                    <span className="text-sm font-medium" style={{ color: '#2D3038' }}>&pound;{Math.round(Number(letting.deposit))}</span>
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
                    <span className="text-sm font-medium" style={{ color: '#2D3038' }}>{letting.minTenancy}</span>
                  </div>
                )}
                {letting.couplesWelcome !== null && (
                  <div className="flex items-center justify-between py-3">
                    <span className="text-sm" style={{ color: '#6B7280' }}>Couples</span>
                    <span className="text-sm font-medium" style={{ color: '#2D3038' }}>
                      {letting.couplesWelcome ? 'Welcome' : 'Single occupancy only'}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm" style={{ color: '#6B7280' }}>Available</span>
                  <span className="text-sm font-semibold" style={{ color: availNow ? '#16A34A' : '#6B7280' }}>
                    {availText}
                  </span>
                </div>
              </div>
            </Card>

            {/* Card 2: Property Features (moved up) */}
            {room.property_amenities.length > 0 && (
              <Card title="Property Features">
                <div className="flex flex-wrap gap-2">
                  {room.property_amenities.map((a) => (
                    <span
                      key={a}
                      className="inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium"
                      style={{ backgroundColor: '#ECFDF5', color: '#047857' }}
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </Card>
            )}

            {/* Card 3: Property Overview */}
            {overview && (
              <Card title="Property Overview">
                <ExpandableText maxHeight={200}>
                  <TextBlock text={overview} />
                </ExpandableText>
              </Card>
            )}

            {/* Card 4: Room Description (Claude-processed only) */}
            {roomDesc && (
              <Card title="Room Description">
                <p className="text-sm leading-relaxed" style={{ color: '#6B7280' }}>{roomDesc}</p>
              </Card>
            )}

            {/* Card 5: What's Included */}
            {whatsIncluded.length > 0 && (
              <Card title="What&apos;s Included">
                <ul className="space-y-2">
                  {whatsIncluded.map((item, i) => (
                    <CheckItem key={i} text={item} />
                  ))}
                </ul>
              </Card>
            )}

            {/* Card 6: Local Area */}
            {(localArea || localSections.length > 0) && (
              <Card title="Local Area">
                {localArea ? (
                  <div className="space-y-4">
                    {localArea.shops && (
                      <div>
                        <p className="text-sm font-semibold mb-1" style={{ color: '#2D3038' }}>Shops &amp; Leisure</p>
                        <p className="text-sm leading-relaxed" style={{ color: '#6B7280' }}>{localArea.shops}</p>
                      </div>
                    )}
                    {localArea.transport && (
                      <div>
                        <p className="text-sm font-semibold mb-1" style={{ color: '#2D3038' }}>Transport</p>
                        <p className="text-sm leading-relaxed" style={{ color: '#6B7280' }}>{localArea.transport}</p>
                      </div>
                    )}
                    {localArea.healthcare && (
                      <div>
                        <p className="text-sm font-semibold mb-1" style={{ color: '#2D3038' }}>Healthcare</p>
                        <p className="text-sm leading-relaxed" style={{ color: '#6B7280' }}>{localArea.healthcare}</p>
                      </div>
                    )}
                    {localArea.leisure && (
                      <div>
                        <p className="text-sm font-semibold mb-1" style={{ color: '#2D3038' }}>Leisure</p>
                        <p className="text-sm leading-relaxed" style={{ color: '#6B7280' }}>{localArea.leisure}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {localSections.map((section, idx) => (
                      <div key={idx}>
                        <p className="text-sm font-semibold mb-1" style={{ color: '#2D3038' }}>{section.title}</p>
                        <TextBlock text={section.content} />
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* Card 7: Deposit Information */}
            {depositInfo && (
              <Card title="Deposit Information">
                <TextBlock text={depositInfo} />
              </Card>
            )}

            {/* Card 8: House Rules */}
            {(room.property_pets_allowed !== null || room.property_smoking_allowed !== null) && (
              <Card title="House Rules">
                <div className="flex flex-wrap gap-2">
                  {room.property_pets_allowed !== null && (
                    <span className="inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium" style={{ backgroundColor: '#F7F6F3', color: '#2D3038' }}>
                      {room.property_pets_allowed ? 'Pets allowed' : 'No pets'}
                    </span>
                  )}
                  {room.property_smoking_allowed !== null && (
                    <span className="inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium" style={{ backgroundColor: '#F7F6F3', color: '#2D3038' }}>
                      {room.property_smoking_allowed ? 'Smoking allowed' : 'No smoking'}
                    </span>
                  )}
                </div>
              </Card>
            )}

            {/* Mobile-only: Other rooms + location */}
            {otherRooms.length > 0 && (
              <div className="lg:hidden">
                <Card title={`Other Rooms at ${room.property_name}`}>
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {otherRooms.map((otherRoom) => (
                      <Link
                        key={otherRoom.id}
                        href={`/room/${otherRoom.id}`}
                        className="flex flex-shrink-0 gap-3 rounded-lg bg-white p-3"
                        style={{ width: '220px', border: '1px solid #F0EFEC' }}
                      >
                        <div
                          className="relative flex-shrink-0 overflow-hidden rounded-md"
                          style={{ width: '56px', height: '42px', backgroundColor: '#E5E3DF' }}
                        >
                          {otherRoom.photo_urls[0] ? (
                            <Image src={otherRoom.photo_urls[0]} alt={otherRoom.name} fill className="object-cover" sizes="56px" quality={85} />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[10px]" style={{ color: '#9CA3AF' }}>No photo</div>
                          )}
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <p className="font-medium text-xs" style={{ color: '#2D3038' }}>{otherRoom.name}</p>
                          <p className="text-sm font-bold tabular-nums" style={{ color: '#2D3038' }}>
                            &pound;{Math.round(otherRoom.rent_pcm)}<span className="text-[10px] font-normal ml-0.5" style={{ color: '#9CA3AF' }}>/mo</span>
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {room.property_postcode && (
              <div className="lg:hidden">
                <Card title="Location">
                  <div className="overflow-hidden rounded-lg" style={{ aspectRatio: '16/9' }}>
                    <iframe
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(room.property_postcode)}&output=embed`}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title={`Map of ${room.property_postcode}`}
                    />
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>
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
