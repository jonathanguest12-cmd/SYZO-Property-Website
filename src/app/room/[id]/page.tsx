export const revalidate = 3600 // ISR: cache pages for 1 hour

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
  stripHtml,
} from '@/lib/format'
import { processDescription } from '@/lib/process-description'
import PhotoGallery from '@/components/PhotoGallery'
import ExpandableText from '@/components/ExpandableText'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <h2 className="text-sm font-semibold uppercase tracking-[0.1em] mb-4" style={{ color: '#9CA3AF' }}>{title}</h2>
      {children}
    </div>
  )
}

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

function buildGalleryPhotos(room: RoomWithProperty): { url: string; title: string }[] {
  const roomPhotos = (room.photo_urls ?? []).map((url) => ({ url, title: 'Room' }))
  const propImages = room.property_images ?? []
  const propertyPhotos = propImages.filter((img) => !isIllustrationPhoto(img.title || ''))
  const all = [...roomPhotos, ...propertyPhotos]
  const seen = new Set<string>()
  return all.filter((p) => {
    const filename = p.url.split('/').pop() || p.url
    if (seen.has(p.url) || seen.has(filename)) return false
    seen.add(p.url)
    seen.add(filename)
    if (/thumb|small|150x|100x/i.test(p.url)) return false
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

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const room = await resolveRoom(id)
  if (!room) return { title: 'Room Not Found - SYZO' }
  return {
    title: `${room.property_name} - SYZO`,
    description: `Room at ${room.property_name}, ${room.property_city}. \u00A3${Math.round(room.rent_pcm)}/month. ${room.bills_included ? 'Bills included.' : 'Bills extra.'}`,
  }
}

export default async function RoomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const room = await resolveRoom(id)
  if (!room) notFound()

  const otherRooms = (await fetchRoomsForProperty(room.property_ref)).filter((r) => r.id !== room.id)

  const availText = formatAvailableFrom(room.available_from)
  const availNow = isAvailableNow(room.available_from)
  const letting = getLettingDetails(room)
  const galleryPhotos = buildGalleryPhotos(room)

  const hasEnSuite = room.room_amenities.some(
    (a) => a.toLowerCase().includes('en-suite') || a.toLowerCase().includes('ensuite')
  )

  // Process description: try Claude API first, fall back to raw parsing
  const processed = room.advert_description
    ? await processDescription(room.id, room.advert_description, {
        address: room.property_name,
        city: room.property_city,
        rent: Math.round(room.rent_pcm),
        billsIncluded: room.bills_included,
        roomName: room.name || 'this room',
        roomType: roomTypeLabel(room.room_type),
      })
    : null

  // Fall back to raw parsing if Claude API didn't return results
  const parsed = !processed && room.advert_description ? parseAdvertDescription(room.advert_description) : null

  // Unified content from whichever source
  const overview = processed?.property_overview ?? parsed?.description ?? null
  const roomDesc = processed?.room_description ?? null
  const whatsIncluded: string[] = processed?.whats_included ?? parsed?.whatsIncluded ?? []
  const localArea = processed?.local_area ?? null
  const localSections = parsed?.sections ?? []
  const hasLocalArea = localArea ? (localArea.shops || localArea.transport || localArea.healthcare || localArea.leisure) : localSections.length > 0
  const depositInfo = processed?.deposit_info ?? parsed?.depositInfo ?? null

  return (
    <>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium mb-6 transition-colors duration-200 hover:opacity-70" style={{ color: '#6B7280' }}>
          &larr; Back to all rooms
        </Link>

        <div className="grid gap-8 lg:grid-cols-12">
          {/* LEFT: Photos + Apply + Other Rooms (sticky, fits viewport) */}
          <div className="lg:col-span-7">
            <div className="lg:sticky lg:top-20 flex flex-col gap-5" style={{ maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
              <PhotoGallery photos={galleryPhotos} alt={room.property_name} />

              <div className="hidden lg:block mt-1">
                <Link href={`/apply/${room.id}`} className="btn-primary w-full inline-flex items-center justify-center rounded-lg px-6 py-3.5 text-base font-semibold text-white">
                  Apply to Rent
                </Link>
              </div>

              {/* Other rooms — compact cards */}
              {otherRooms.length > 0 && (
                <div className="hidden lg:block mt-4">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.1em] mb-3" style={{ color: '#9CA3AF' }}>
                    Other Rooms at {room.property_name}
                  </h3>
                  <div className="flex flex-col gap-2">
                    {otherRooms.map((r) => (
                      <Link key={r.id} href={`/room/${r.id}`} className="flex gap-3 rounded-lg bg-white p-2.5 transition-shadow duration-200 hover:shadow-md" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                        <div className="relative flex-shrink-0 overflow-hidden rounded-md" style={{ width: '100px', height: '75px', backgroundColor: '#E5E3DF' }}>
                          {r.photo_urls[0] ? (
                            <Image src={r.photo_urls[0]} alt={r.name} fill quality={75} className="object-cover" sizes="100px" loading="lazy" />
                          ) : (
                            <div className="flex h-full items-center justify-center" style={{ color: '#9CA3AF' }}>
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" /><path d="M9 21V12h6v9" /></svg>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-0.5 min-w-0 justify-center">
                          <p className="font-semibold text-sm truncate" style={{ color: '#2D3038' }}>{r.name}</p>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-base font-bold tabular-nums" style={{ color: '#2D3038' }}>&pound;{Math.round(r.rent_pcm)}</span>
                            <span className="text-xs" style={{ color: '#9CA3AF' }}>/mo</span>
                            <span className="ml-auto inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold" style={r.bills_included ? { backgroundColor: '#F0FAF0', color: '#16A34A' } : { backgroundColor: '#FEF9EF', color: '#B45309' }}>
                              {r.bills_included ? 'Bills inc.' : 'Bills extra'}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Content cards */}
          <div className="flex flex-col gap-5 lg:col-span-5">
            <div>
              <div className="flex items-end justify-between gap-4">
                <h1 className="text-2xl font-bold tracking-tight md:text-3xl" style={{ color: '#2D3038' }}>{room.property_name}</h1>
                <Link
                  href={`/property/${room.property_ref}`}
                  className="flex-shrink-0 text-sm underline underline-offset-2 transition-colors duration-200 hover:opacity-70 pb-0.5"
                  style={{ color: '#9CA3AF' }}
                >
                  View property page
                </Link>
              </div>
              <p className="mt-1.5 text-sm" style={{ color: '#9CA3AF' }}>
                {room.property_city}, {room.property_postcode}
                {room.room_type && ` \u00B7 ${roomTypeLabel(room.room_type)}`}
                {hasEnSuite && ' \u00B7 En-suite'}
              </p>
            </div>

            {/* 1. Letting Details */}
            <Card title="Letting Details">
              <div className="flex flex-col divide-y" style={{ borderColor: '#F0EFEC' }}>
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm" style={{ color: '#6B7280' }}>Rent</span>
                  <span className="text-xl font-bold tabular-nums" style={{ color: '#2D3038' }}>&pound;{Math.round(room.rent_pcm)}<span className="text-sm font-normal ml-1" style={{ color: '#9CA3AF' }}>pcm</span></span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm" style={{ color: '#6B7280' }}>Bills</span>
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold" style={room.bills_included ? { backgroundColor: '#F0FAF0', color: '#16A34A' } : { backgroundColor: '#FEF9EF', color: '#B45309' }}>
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
                    <span className="text-sm font-medium" style={{ color: '#2D3038' }}>{roomTypeLabel(room.room_type)}{hasEnSuite ? ' (en-suite)' : ''}</span>
                  </div>
                )}
                {letting.minTenancy && (
                  <div className="flex items-center justify-between py-3">
                    <span className="text-sm" style={{ color: '#6B7280' }}>Min. tenancy</span>
                    <span className="text-sm font-medium" style={{ color: '#2D3038' }}>{letting.minTenancy}</span>
                  </div>
                )}
                {letting.couplesWelcome !== null && (
                  <div className="flex items-center justify-between py-3">
                    <span className="text-sm" style={{ color: '#6B7280' }}>Couples</span>
                    <span className="text-sm font-medium" style={{ color: '#2D3038' }}>{letting.couplesWelcome ? 'Welcome' : 'Single occupancy only'}</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm" style={{ color: '#6B7280' }}>Available</span>
                  <span className="text-sm font-semibold" style={{ color: availNow ? '#16A34A' : '#6B7280' }}>{availText}</span>
                </div>
              </div>
            </Card>

            {/* 2. Property Features (green pills) */}
            {room.property_amenities.length > 0 && (
              <Card title="Property Features">
                <div className="flex flex-wrap gap-2">
                  {room.property_amenities.map((a) => (
                    <span key={a} className="inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium" style={{ backgroundColor: '#ECFDF5', color: '#047857' }}>{a}</span>
                  ))}
                </div>
              </Card>
            )}

            {/* 3. About This Property */}
            {overview && (
              <Card title="About This Property">
                {processed ? (
                  <p className="text-sm leading-relaxed" style={{ color: '#6B7280' }}>{overview}</p>
                ) : (
                  <ExpandableText maxHeight={200}><TextBlock text={overview} /></ExpandableText>
                )}
              </Card>
            )}

            {/* 4. About This Room (Claude-processed only) */}
            {roomDesc && (
              <Card title="About This Room">
                <p className="text-sm leading-relaxed" style={{ color: '#6B7280' }}>{roomDesc}</p>
              </Card>
            )}

            {/* 5. What's Included */}
            {whatsIncluded.length > 0 && (
              <Card title="What&apos;s Included">
                <ul className="space-y-2">
                  {whatsIncluded.map((item, i) => <CheckItem key={i} text={item} />)}
                </ul>
              </Card>
            )}

            {/* 6. Local Area */}
            {hasLocalArea && (
              <Card title="Local Area">
                {localArea ? (
                  <div className="space-y-4">
                    {localArea.shops && <div><p className="text-sm font-semibold mb-1" style={{ color: '#2D3038' }}>Shops &amp; Leisure</p><p className="text-sm leading-relaxed" style={{ color: '#6B7280' }}>{localArea.shops}</p></div>}
                    {localArea.transport && <div><p className="text-sm font-semibold mb-1" style={{ color: '#2D3038' }}>Transport</p><p className="text-sm leading-relaxed" style={{ color: '#6B7280' }}>{localArea.transport}</p></div>}
                    {localArea.healthcare && <div><p className="text-sm font-semibold mb-1" style={{ color: '#2D3038' }}>Healthcare</p><p className="text-sm leading-relaxed" style={{ color: '#6B7280' }}>{localArea.healthcare}</p></div>}
                    {localArea.leisure && <div><p className="text-sm font-semibold mb-1" style={{ color: '#2D3038' }}>Leisure</p><p className="text-sm leading-relaxed" style={{ color: '#6B7280' }}>{localArea.leisure}</p></div>}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {localSections.map((s, i) => <div key={i}><p className="text-sm font-semibold mb-1" style={{ color: '#2D3038' }}>{s.title}</p><TextBlock text={s.content} /></div>)}
                  </div>
                )}
              </Card>
            )}

            {/* 7. Deposit Information */}
            {depositInfo && (
              <Card title="Deposit Information">
                {processed ? (
                  <p className="text-sm leading-relaxed" style={{ color: '#6B7280' }}>{depositInfo}</p>
                ) : (
                  <TextBlock text={depositInfo} />
                )}
              </Card>
            )}

            {/* 8. House Rules */}
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

            {/* 9. Location Map (last card) */}
            {room.property_postcode && (
              <Card title="Location">
                <div className="overflow-hidden rounded-lg" style={{ aspectRatio: '16/9' }}>
                  <iframe
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(room.property_postcode)}&output=embed`}
                    width="100%" height="100%" style={{ border: 0 }}
                    loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                    title={`Map of ${room.property_postcode}`}
                  />
                </div>
              </Card>
            )}

            {/* Mobile: Other rooms */}
            {otherRooms.length > 0 && (
              <div className="lg:hidden">
                <Card title={`Other Rooms at ${room.property_name}`}>
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {otherRooms.map((r) => (
                      <Link key={r.id} href={`/room/${r.id}`} className="flex-shrink-0 overflow-hidden rounded-lg" style={{ width: '200px', border: '1px solid #F0EFEC' }}>
                        <div className="relative w-full" style={{ height: '100px', backgroundColor: '#E5E3DF' }}>
                          {r.photo_urls[0] ? <Image src={r.photo_urls[0]} alt={r.name} fill quality={75} className="object-cover" sizes="200px" loading="lazy" /> : null}
                        </div>
                        <div className="p-2.5">
                          <p className="font-semibold text-xs" style={{ color: '#2D3038' }}>{r.name}</p>
                          <p className="text-sm font-bold tabular-nums" style={{ color: '#2D3038' }}>&pound;{Math.round(r.rent_pcm)}<span className="text-[10px] font-normal ml-0.5" style={{ color: '#9CA3AF' }}>/mo</span></p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white p-4 lg:hidden" style={{ boxShadow: '0 -1px 8px rgba(0,0,0,0.06)' }}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xl font-bold tabular-nums" style={{ color: '#2D3038' }}>&pound;{Math.round(room.rent_pcm)}<span className="text-sm font-normal ml-1" style={{ color: '#9CA3AF' }}>/mo</span></p>
            <p className="text-xs font-medium" style={{ color: availNow ? '#16A34A' : '#6B7280' }}>{availText}</p>
          </div>
          <Link href={`/apply/${room.id}`} className="inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold text-white" style={{ backgroundColor: '#2D3038' }}>Apply to Rent</Link>
        </div>
      </div>
    </>
  )
}
