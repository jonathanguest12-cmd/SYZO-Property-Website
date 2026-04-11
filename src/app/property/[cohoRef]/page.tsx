export const revalidate = 3600

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { fetchProperty, fetchRoomsForProperty, fetchAllPropertyNames } from '@/lib/queries'
import type { RoomWithProperty } from '@/lib/types'
import { isAvailableNow } from '@/lib/format'
import PhotoGallery from '@/components/PhotoGallery'
import RoomCard from '@/components/RoomCard'
import RoomActions from '@/components/RoomActions'
import { buildPropertySystemPrompt } from '@/lib/chatbot'

export async function generateStaticParams() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    || 'https://mtrrxtwisgftkqujfqlr.supabase.co'
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    || 'sb_publishable_eh8vOh14012eMEE1KgLDXA_5XmDjiHU'

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/rooms?select=additional_info&available_from=not.is.null&limit=300`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        cache: 'no-store',
      }
    )

    if (!res.ok) return []

    const rooms = await res.json()
    const refs = rooms
      .map((r: any) => r.additional_info?.property?.reference)
      .filter(Boolean)
    const uniqueRefs = [...new Set<string>(refs)]
    console.log('[generateStaticParams] pre-building', uniqueRefs.length, 'property pages')
    return uniqueRefs.map((ref) => ({ cohoRef: ref }))
  } catch (err) {
    console.error('[generateStaticParams] property pages error:', err)
    return []
  }
}

/* ─── Shared UI components (matching room page) ─── */

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl bg-white p-6 border"
      style={{ borderColor: '#E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
    >
      <h2 className="text-sm font-semibold uppercase tracking-[0.1em] mb-5" style={{ color: '#6B7280' }}>{title}</h2>
      {children}
    </div>
  )
}

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  'Wifi (Broadband)': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><circle cx="12" cy="20" r="1" fill="currentColor" />
    </svg>
  ),
  'Wifi (Fibre/Cable)': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><circle cx="12" cy="20" r="1" fill="currentColor" />
    </svg>
  ),
  'Washing machine': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="2" width="18" height="20" rx="2" /><circle cx="12" cy="13" r="5" /><circle cx="12" cy="13" r="2" /><line x1="7" y1="5" x2="7" y2="5.01" /><line x1="10" y1="5" x2="10" y2="5.01" />
    </svg>
  ),
  'Tumble dryer': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="2" width="18" height="20" rx="2" /><circle cx="12" cy="13" r="5" /><path d="M9.5 11c1 1.5 3.5 1.5 5 0" /><line x1="7" y1="5" x2="7" y2="5.01" /><line x1="10" y1="5" x2="10" y2="5.01" />
    </svg>
  ),
  'Dishwasher': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="2" width="18" height="20" rx="2" /><line x1="3" y1="7" x2="21" y2="7" /><line x1="12" y1="4" x2="12" y2="4.01" /><circle cx="12" cy="14" r="3" />
    </svg>
  ),
  'Fridge Freezer': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" /><line x1="4" y1="10" x2="20" y2="10" /><line x1="8" y1="6" x2="8" y2="8" /><line x1="8" y1="14" x2="8" y2="17" />
    </svg>
  ),
  'TV': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="18" x2="12" y2="21" />
    </svg>
  ),
  'TV Licence': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="18" x2="12" y2="21" />
    </svg>
  ),
  'Living room': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 11V8a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v3" /><path d="M2 11v4a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" /><line x1="6" y1="17" x2="6" y2="20" /><line x1="18" y1="17" x2="18" y2="20" />
    </svg>
  ),
  'Garden': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22V10" /><path d="M6 13c0-3.3 2.7-6 6-6s6 2.7 6 6" /><path d="M3 17c0-2.2 1.8-4 4-4h10c2.2 0 4 1.8 4 4" /><line x1="12" y1="2" x2="12" y2="6" /><path d="M9 3l3 3 3-3" />
    </svg>
  ),
  'Parking (Permit Required)': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l1.5-4.5A2 2 0 0 1 6.4 5h11.2a2 2 0 0 1 1.9 1.5L21 11" /><path d="M1 11h22v6a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-6z" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" />
    </svg>
  ),
  'Off-road parking': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l1.5-4.5A2 2 0 0 1 6.4 5h11.2a2 2 0 0 1 1.9 1.5L21 11" /><path d="M1 11h22v6a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-6z" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" />
    </svg>
  ),
  'Outdoor seating': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 18h16" /><path d="M4 14h16" /><path d="M6 14V9a6 6 0 0 1 12 0v5" /><line x1="6" y1="18" x2="6" y2="22" /><line x1="18" y1="18" x2="18" y2="22" />
    </svg>
  ),
  'Clothes line': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="2" y1="6" x2="22" y2="6" /><path d="M6 6v8l3-2 3 2V6" /><path d="M14 6v8l3-2 3 2V6" />
    </svg>
  ),
  'Bills Inclusive': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 8a4 4 0 0 1 8 0c0 3-2 4-2 7" /><path d="M6 15h8" /><path d="M6 19h10" />
    </svg>
  ),
}

const DefaultAmenityIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

function AmenityGrid({ amenities }: { amenities: string[] }) {
  return (
    <div className="grid grid-cols-1 gap-y-4 sm:grid-cols-2 sm:gap-y-5 gap-x-4">
      {amenities.map((amenity, i) => (
        <div key={i} className="flex items-center gap-2.5">
          <span className="w-5 h-5 flex-shrink-0" style={{ color: '#16A34A' }}>
            {AMENITY_ICONS[amenity] ?? DefaultAmenityIcon}
          </span>
          <span className="text-sm" style={{ color: '#4B5563' }}>{amenity}</span>
        </div>
      ))}
    </div>
  )
}

const SYZO_PROMISES = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
      </svg>
    ),
    title: 'One Monthly Payment',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    title: 'Zero Deposit Option',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1" fill="currentColor"/>
      </svg>
    ),
    title: 'Lightning Fast WiFi',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
      </svg>
    ),
    title: 'Fast Response Maintenance',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    title: 'Exceptional Tenant Service',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 7a5 5 0 0 0-10 0v10"/><path d="M6 11h9"/><path d="M6 17h12"/>
      </svg>
    ),
    title: 'Bills Inclusive',
  },
]

/* ─── Address formatting ─── */

function formatPropertyAddress(propertyName: string, allPropertyNames: string[]): string {
  const stripped = propertyName.replace(/^\d+[-\s]+/, '').trim()
  const siblings = allPropertyNames.filter(
    (p) => p.replace(/^\d+[-\s]+/, '').trim() === stripped
  )
  if (siblings.length <= 1) return stripped
  const sorted = [...siblings].sort()
  const index = sorted.indexOf(propertyName)
  return `Property ${index + 1}, ${stripped}`
}

/* ─── Gallery builder ─── */

function buildPropertyGallery(rooms: RoomWithProperty[]): { url: string; title: string }[] {
  const first = rooms[0]
  if (!first) return []

  // Property images, sorted so .png illustration is first
  const propImages = [...(first.property_images ?? [])].sort((a, b) => {
    const aIsPng = a.title?.toLowerCase().endsWith('.png')
    const bIsPng = b.title?.toLowerCase().endsWith('.png')
    if (aIsPng && !bIsPng) return -1
    if (!aIsPng && bIsPng) return 1
    return 0
  })

  // Add room photos after property images
  const roomPhotos: { url: string; title: string }[] = []
  for (const r of rooms) {
    for (const url of r.photo_urls ?? []) {
      roomPhotos.push({ url, title: r.name })
    }
  }

  const all = [...propImages, ...roomPhotos]
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

/* ─── Metadata ─── */

export async function generateMetadata({ params }: { params: Promise<{ cohoRef: string }> }): Promise<Metadata> {
  const { cohoRef } = await params
  const [property, rooms, allPropertyNames] = await Promise.all([
    fetchProperty(cohoRef),
    fetchRoomsForProperty(cohoRef),
    fetchAllPropertyNames(),
  ])
  const first = rooms[0]
  const propertyName = property?.name ?? first?.property_name ?? cohoRef
  const displayName = formatPropertyAddress(propertyName, allPropertyNames)
  const city = property?.city ?? first?.property_city ?? ''
  return {
    title: `${displayName} - SYZO`,
    description: `${displayName}, ${city}. ${rooms.length} room${rooms.length !== 1 ? 's' : ''} available.`,
  }
}

/* ─── Page ─── */

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ cohoRef: string }>
}) {
  const { cohoRef } = await params
  const [property, rooms, allPropertyNames] = await Promise.all([
    fetchProperty(cohoRef),
    fetchRoomsForProperty(cohoRef),
    fetchAllPropertyNames(),
  ])

  if (!property && rooms.length === 0) notFound()

  const first = rooms[0]
  const propertyName = property?.name ?? first?.property_name ?? cohoRef
  const displayName = formatPropertyAddress(propertyName, allPropertyNames)
  const city = property?.city ?? first?.property_city ?? ''
  const postcode = property?.postcode ?? first?.property_postcode ?? ''
  const amenities = first?.property_amenities ?? []
  const aboutProperty = first?.description_about_property ?? null
  const epcRating = first?.epc_rating ?? null
  const totalRooms = first?.property_total_rooms ?? rooms.length
  const availableRooms = rooms.length
  const rentMin = rooms.length > 0 ? Math.round(Math.min(...rooms.map(r => r.rent_pcm))) : 0

  const galleryPhotos = buildPropertyGallery(rooms)

  const chatSystemPrompt = buildPropertySystemPrompt(
    propertyName,
    city,
    postcode,
    amenities,
    aboutProperty,
    rooms.map(r => ({ name: r.name, rent_pcm: r.rent_pcm, room_type: r.room_type, available_from: r.available_from })),
    epcRating
  )
  const chatGreeting = `Hi! I can answer questions about ${displayName}. We currently have ${availableRooms} room${availableRooms !== 1 ? 's' : ''} available. What would you like to know?`

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-6 pb-6 border-b" style={{ borderColor: '#E5E7EB' }}>
        <Link href="/?view=properties" className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors duration-200 hover:opacity-70" style={{ color: '#6B7280' }}>
          &larr; Back to all properties
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* LEFT: Photos + CTA (sticky) */}
        <div className="min-w-0">
          <div className="lg:sticky lg:top-20 flex flex-col gap-5" style={{ maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
            <PhotoGallery photos={galleryPhotos} alt={displayName} />

            <div className="hidden lg:block mt-1">
              <RoomActions
                roomId=""
                applyHref={`/apply-property/${cohoRef}`}
                systemPrompt={chatSystemPrompt}
                greeting={chatGreeting}
                roomName="this property"
                propertyName={propertyName}
                propertyRef={cohoRef}
                suggestions={[
                  'What rooms are available?',
                  'What are the prices?',
                  'When can I move in?',
                  'Tell me about deposits',
                  'Are bills included?',
                  'Something else',
                ]}
              />
            </div>
          </div>
        </div>

        {/* RIGHT: Content cards */}
        <div className="flex flex-col gap-5 min-w-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl" style={{ color: '#2D3038' }}>{displayName}</h1>
            <p className="mt-1.5 text-sm" style={{ color: '#9CA3AF' }}>
              {city}{postcode ? `, ${postcode}` : ''}
            </p>
          </div>

          {/* Property Details */}
          <div className="rounded-2xl p-6 border" style={{ background: '#FFFFFF', borderColor: '#E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)' }}>
            <h2 className="text-sm font-semibold uppercase tracking-[0.1em] mb-3" style={{ color: '#9CA3AF' }}>Property Details</h2>
            {/* Total rooms */}
            <div className="flex justify-between items-center py-3 border-b" style={{ borderColor: '#F3F4F6' }}>
              <span className="text-sm" style={{ color: '#9CA3AF' }}>Total rooms</span>
              <span className="text-sm font-medium" style={{ color: '#2D3038' }}>{totalRooms}</span>
            </div>
            {/* Rent range */}
            {rooms.length > 0 && (
              <div className="flex justify-between items-center py-3 border-b" style={{ borderColor: '#F3F4F6' }}>
                <span className="text-sm" style={{ color: '#9CA3AF' }}>Rent from</span>
                <span className="text-lg font-bold" style={{ color: '#2D3038' }}>&pound;{rentMin}<span className="text-sm font-normal ml-1" style={{ color: '#9CA3AF' }}>pcm</span></span>
              </div>
            )}
            {/* Available now */}
            <div className="flex justify-between items-center py-3 border-b" style={{ borderColor: '#F3F4F6' }}>
              <span className="text-sm" style={{ color: '#9CA3AF' }}>Available now</span>
              <span className="text-sm font-medium text-green-600">{availableRooms} room{availableRooms !== 1 ? 's' : ''}</span>
            </div>
            {/* Bills */}
            <div className="flex justify-between items-center py-3 border-b" style={{ borderColor: '#F3F4F6' }}>
              <span className="text-sm" style={{ color: '#9CA3AF' }}>Bills</span>
              <span className="text-sm font-medium text-green-600">Included</span>
            </div>
            {/* EPC */}
            {epcRating && (
              <div className="flex justify-between items-center py-3">
                <span className="text-sm" style={{ color: '#9CA3AF' }}>EPC Rating</span>
                <span className="text-sm font-semibold px-2 py-0.5 rounded" style={{ background: '#F3F4F6', color: '#374151' }}>{epcRating}</span>
              </div>
            )}
          </div>

          {/* Home Amenities */}
          {amenities.length > 0 && (
            <Card title="Home Amenities">
              <AmenityGrid amenities={amenities} />
            </Card>
          )}

          {/* The SYZO Promise */}
          <Card title="The SYZO Promise">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
              {SYZO_PROMISES.map((promise, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <span className="flex-shrink-0" style={{ color: '#16A34A' }}>
                    {promise.icon}
                  </span>
                  <p className="text-sm font-medium" style={{ color: '#6B7280' }}>
                    {promise.title}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {/* About This Property */}
          {aboutProperty && (
            <Card title="About This Property">
              <div className="space-y-3">
                {aboutProperty.split('\n\n').filter(p => p.trim()).map((paragraph, i) => (
                  <p key={i} className="text-sm leading-relaxed" style={{ color: '#374151' }}>
                    {paragraph.trim()}
                  </p>
                ))}
              </div>
            </Card>
          )}

          {/* Location Map */}
          {postcode && (
            <Card title="Location">
              <div className="overflow-hidden rounded-lg" style={{ aspectRatio: '16/9' }}>
                <iframe
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(postcode)}&output=embed`}
                  width="100%" height="100%" style={{ border: 0 }}
                  loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                  title={`Map of ${postcode}`}
                />
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Available Rooms — full width below grid */}
      <div className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-[0.1em] mb-4" style={{ color: '#9CA3AF' }}>
          Available Rooms ({availableRooms})
        </h2>
        {rooms.length === 0 ? (
          <p className="text-sm" style={{ color: '#9CA3AF' }}>No rooms currently available at this property.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 md:gap-6">
            {rooms.map((room) => (
              <RoomCard key={room.id} room={room} allPropertyNames={allPropertyNames} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
