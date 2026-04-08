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
} from '@/lib/format'
import PhotoGallery from '@/components/PhotoGallery'
import ExpandableText from '@/components/ExpandableText'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function formatRoomAddress(propertyName: string, roomName: string): string {
  const stripped = propertyName.replace(/^\d+[-\s]+/, '').trim()
  return `${roomName}, ${stripped}`
}

export async function generateStaticParams() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    || 'https://mtrrxtwisgftkqujfqlr.supabase.co'
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    || 'sb_publishable_eh8vOh14012eMEE1KgLDXA_5XmDjiHU'

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/rooms?select=id&available_from=not.is.null&limit=300`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        cache: 'no-store',
      }
    )

    if (!res.ok) {
      console.error('[generateStaticParams] Supabase fetch failed:', res.status)
      return []
    }

    const rooms = await res.json()
    console.log('[generateStaticParams] pre-building', rooms.length, 'room pages')
    return rooms.map((r: { id: string }) => ({ id: r.id }))
  } catch (err) {
    console.error('[generateStaticParams] error:', err)
    return []
  }
}

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
            <li key={i} className="text-sm leading-relaxed" style={{ color: '#374151' }}>{item}</li>
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
    elements.push(<p key={key++} className="text-sm leading-relaxed" style={{ color: '#374151' }}>{line}</p>)
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
    <div
      className="rounded-2xl bg-white p-6 border"
      style={{
        borderColor: '#E5E7EB',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}
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
  'Bed': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12h20v6H2z" /><path d="M2 18v2" /><path d="M22 18v2" /><path d="M2 12V7a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  'Wardrobe': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="1" /><line x1="12" y1="2" x2="12" y2="22" /><line x1="9" y1="10" x2="9" y2="14" /><line x1="15" y1="10" x2="15" y2="14" />
    </svg>
  ),
  'Drawers': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="10" y1="5" x2="14" y2="5" /><line x1="10" y1="11" x2="14" y2="11" /><line x1="10" y1="17" x2="14" y2="17" />
    </svg>
  ),
  'En-suite': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12h16a1 1 0 0 1 1 1v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3a1 1 0 0 1 1-1z" /><path d="M6 12V5a2 2 0 0 1 2-2h1" /><circle cx="12" cy="8" r="2" />
    </svg>
  ),
  'Sink': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v5" /><path d="M9 7h6" /><path d="M4 14h16" /><path d="M18 14v2a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4v-2" /><path d="M6 14v-3a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3" />
    </svg>
  ),
  'Bills Inclusive': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 8a4 4 0 0 1 8 0c0 3-2 4-2 7" /><path d="M6 15h8" /><path d="M6 19h10" />
    </svg>
  ),
  'Microwave': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="15" rx="2" /><rect x="5" y="7" width="10" height="9" rx="1" /><line x1="18" y1="9" x2="18" y2="9.01" /><line x1="18" y1="12" x2="18" y2="12.01" />
    </svg>
  ),
  'Oven': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="2" width="18" height="20" rx="2" /><line x1="3" y1="8" x2="21" y2="8" /><rect x="6" y="11" width="12" height="8" rx="1" /><line x1="8" y1="5" x2="8" y2="5.01" /><line x1="12" y1="5" x2="12" y2="5.01" />
    </svg>
  ),
  'Desk': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="4" rx="1" /><line x1="4" y1="10" x2="4" y2="20" /><line x1="20" y1="10" x2="20" y2="20" /><line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  ),
  'Chair': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 12V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v7" /><rect x="4" y="12" width="16" height="4" rx="1" /><line x1="6" y1="16" x2="6" y2="21" /><line x1="18" y1="16" x2="18" y2="21" />
    </svg>
  ),
}

const DefaultAmenityIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

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
  const addressTitle = formatRoomAddress(room.property_name, room.name)
  return {
    title: `${addressTitle} - SYZO`,
    description: `${addressTitle}, ${room.property_city}. \u00A3${Math.round(room.rent_pcm)}/month. ${room.bills_included ? 'Bills included.' : 'Bills extra.'}`,
  }
}

export default async function RoomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const room = await resolveRoom(id)
  if (!room) notFound()

  const otherRooms = (await fetchRoomsForProperty(room.property_ref)).filter((r) => r.id !== room.id)

  const availText = formatAvailableFrom(room.available_from)
  const availNow = isAvailableNow(room.available_from)
  const availShort = (() => {
    if (availNow) return 'Available Now'
    const d = new Date(room.available_from)
    return `Available ${d.getDate()}/${d.getMonth() + 1}/${String(d.getFullYear()).slice(2)}`
  })()
  const letting = getLettingDetails(room)
  const galleryPhotos = buildGalleryPhotos(room)

  const hasEnSuite = room.room_amenities.some(
    (a) => a.toLowerCase().includes('en-suite') || a.toLowerCase().includes('ensuite')
  )

  // Read pre-processed descriptions from Supabase (populated by n8n pipeline)
  // Fall back to raw HTML parsing if descriptions haven't been processed yet
  const hasProcessed = !!(room.description_about_property || room.description_about_room)
  const parsed = !hasProcessed && room.advert_description ? parseAdvertDescription(room.advert_description) : null

  const overview = room.description_about_property ?? parsed?.description ?? null
  const roomDesc = room.description_about_room ?? null
  const whatsIncluded: string[] = parsed?.whatsIncluded ?? []
  const localSections = parsed?.sections ?? []
  const hasLocalArea = localSections.length > 0
  const depositInfo = parsed?.depositInfo ?? null

  return (
    <>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">
        <div className="mb-6 pb-6 border-b" style={{ borderColor: '#E5E7EB' }}>
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors duration-200 hover:opacity-70" style={{ color: '#6B7280' }}>
            &larr; Back to all rooms
          </Link>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* LEFT: Photos + Apply + Other Rooms (sticky, fits viewport) */}
          <div className="min-w-0">
            <div className="lg:sticky lg:top-20 flex flex-col gap-5" style={{ maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
              <PhotoGallery photos={galleryPhotos} alt={room.property_name} />

              <div className="hidden lg:flex gap-3 mt-1">
                <Link href={`/apply/${room.id}`} className="flex-1 flex items-center justify-center py-3.5 rounded-full font-semibold text-sm transition-colors hover:opacity-90"
                  style={{ background: '#2D3038', color: '#ffffff' }}>
                  Apply to Rent
                </Link>
                <a href="#ask" className="flex-1 flex items-center justify-center py-3.5 rounded-full border-2 font-semibold text-sm transition-colors hover:bg-gray-50"
                  style={{ background: '#ffffff', borderColor: '#2D3038', color: '#2D3038' }}>
                  Ask a Question
                </a>
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
                        <div className="flex min-w-0 flex-1 justify-between">
                          <div className="flex flex-col gap-0.5 min-w-0 justify-center">
                            <p className="font-semibold text-sm truncate" style={{ color: '#2D3038' }}>{r.name}</p>
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-base font-bold tabular-nums" style={{ color: '#2D3038' }}>&pound;{Math.round(r.rent_pcm)}</span>
                              <span className="text-xs" style={{ color: '#9CA3AF' }}>/mo</span>
                            </div>
                            <span className="inline-flex items-center self-start rounded-full px-1.5 py-0.5 text-[10px] font-semibold" style={r.bills_included ? { backgroundColor: '#F0FAF0', color: '#16A34A' } : { backgroundColor: '#FEF9EF', color: '#B45309' }}>
                              {r.bills_included ? 'Bills inc.' : 'Bills extra'}
                            </span>
                          </div>
                          <div className="flex items-end flex-shrink-0 ml-2">
                            <span className="text-xs font-medium px-3 py-1 rounded-full" style={{ background: '#DCFCE7', color: '#16A34A' }}>View Room &rarr;</span>
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
          <div className="flex flex-col gap-5 min-w-0">
            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl break-words min-w-0" style={{ color: '#2D3038' }}>{formatRoomAddress(room.property_name, room.name)}</h1>
              <p className="mt-1.5 text-sm" style={{ color: '#9CA3AF' }}>
                {room.property_city}, {room.property_postcode}
                {room.room_type && ` \u00B7 ${roomTypeLabel(room.room_type)}`}
                {hasEnSuite && ' \u00B7 En-suite'}
              </p>
            </div>

            {/* 1. Letting Details */}
            <div className="rounded-2xl p-6 border" style={{ background: '#FFFFFF', borderColor: '#E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)' }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold uppercase tracking-[0.1em]" style={{ color: '#9CA3AF' }}>Letting Details</h2>
                <Link
                  href={`/property/${room.property_ref}`}
                  className="text-xs underline underline-offset-2 hover:opacity-70 transition-opacity"
                  style={{ color: '#9CA3AF' }}
                >
                  View property page
                </Link>
              </div>
              {/* Rent */}
              <div className="flex justify-between items-center py-3 border-b" style={{ borderColor: '#F3F4F6' }}>
                <span className="text-sm" style={{ color: '#9CA3AF' }}>Rent</span>
                <span className="text-lg font-bold" style={{ color: '#2D3038' }}>
                  &pound;{Math.round(room.rent_pcm)}
                  <span className="text-sm font-normal ml-1" style={{ color: '#9CA3AF' }}>pcm</span>
                </span>
              </div>
              {/* Deposit */}
              {room.deposit_amount ? (
                <div className="flex justify-between items-center py-3 border-b" style={{ borderColor: '#F3F4F6' }}>
                  <span className="text-sm" style={{ color: '#9CA3AF' }}>Deposit</span>
                  <span className="text-sm font-medium" style={{ color: '#2D3038' }}>
                    &pound;{room.deposit_amount}
                  </span>
                </div>
              ) : room.deposit_type === 'depositReplacementScheme' ? (
                <div className="flex justify-between items-center py-3 border-b" style={{ borderColor: '#F3F4F6' }}>
                  <span className="text-sm" style={{ color: '#9CA3AF' }}>Deposit</span>
                  <span className="text-sm font-medium text-green-600">Zero deposit option &#10003;</span>
                </div>
              ) : null}
              {/* Bills — always included */}
              <div className="flex justify-between items-center py-3 border-b" style={{ borderColor: '#F3F4F6' }}>
                <span className="text-sm" style={{ color: '#9CA3AF' }}>Bills</span>
                <span className="text-sm font-medium text-green-600">Included</span>
              </div>
              {/* Availability */}
              <div className="flex justify-between items-center py-3 border-b" style={{ borderColor: '#F3F4F6' }}>
                <span className="text-sm" style={{ color: '#9CA3AF' }}>Availability</span>
                <span className={`text-sm font-medium ${availNow ? 'text-green-600' : ''}`}
                  style={!availNow ? { color: '#2D3038' } : undefined}>
                  {availNow ? 'Available Now' : availText}
                </span>
              </div>
              {/* Room type */}
              {room.room_type && (
                <div className="flex justify-between items-center py-3 border-b" style={{ borderColor: '#F3F4F6' }}>
                  <span className="text-sm" style={{ color: '#9CA3AF' }}>Room type</span>
                  <span className="text-sm font-medium" style={{ color: '#2D3038' }}>{roomTypeLabel(room.room_type)}{hasEnSuite ? ' (en-suite)' : ''}</span>
                </div>
              )}
              {/* Min. tenancy */}
              {letting.minTenancy && (
                <div className="flex justify-between items-center py-3 border-b" style={{ borderColor: '#F3F4F6' }}>
                  <span className="text-sm" style={{ color: '#9CA3AF' }}>Min. tenancy</span>
                  <span className="text-sm font-medium" style={{ color: '#2D3038' }}>{letting.minTenancy}</span>
                </div>
              )}
              {/* Couples */}
              {letting.couplesWelcome !== null && (
                <div className="flex justify-between items-center py-3 border-b" style={{ borderColor: '#F3F4F6' }}>
                  <span className="text-sm" style={{ color: '#9CA3AF' }}>Couples</span>
                  <span className="text-sm font-medium" style={{ color: '#2D3038' }}>{letting.couplesWelcome ? 'Welcome' : 'Single occupancy only'}</span>
                </div>
              )}
              {/* EPC Rating */}
              {room.epc_rating && (
                <div className="flex justify-between items-center py-3">
                  <span className="text-sm" style={{ color: '#9CA3AF' }}>EPC Rating</span>
                  <span className="text-sm font-semibold px-2 py-0.5 rounded" style={{ background: '#F3F4F6', color: '#374151' }}>
                    {room.epc_rating}
                  </span>
                </div>
              )}
            </div>

            {/* 2. Home Amenities */}
            {room.property_amenities.length > 0 && (
              <Card title="Home Amenities">
                <AmenityGrid amenities={room.property_amenities} />
              </Card>
            )}

            {/* 2b. Room Amenities */}
            {room.room_amenities.length > 0 && (
              <Card title="Room Amenities">
                <AmenityGrid amenities={room.room_amenities} />
              </Card>
            )}

            {/* 2c. The SYZO Promise */}
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

            {/* 3. About This Property */}
            {overview && (
              <Card title="About This Property">
                {hasProcessed ? (
                  <div className="space-y-3">
                    {overview.split('\n\n').filter(p => p.trim()).map((paragraph, i) => (
                      <p key={i} className="text-sm leading-relaxed" style={{ color: '#374151' }}>
                        {paragraph.trim()}
                      </p>
                    ))}
                  </div>
                ) : (
                  <ExpandableText maxHeight={200}><TextBlock text={overview} /></ExpandableText>
                )}
              </Card>
            )}

            {/* 4. About This Room — always show */}
            <Card title="About This Room">
              {roomDesc ? (
                <div className="space-y-3">
                  {roomDesc.split('\n\n').filter(p => p.trim()).map((paragraph, i) => (
                    <p key={i} className="text-sm leading-relaxed" style={{ color: '#374151' }}>
                      {paragraph.trim()}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-sm" style={{ color: '#9CA3AF' }}>
                  Ask us about this room &mdash; we&apos;d love to tell you more.
                </p>
              )}
            </Card>

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
                <div className="space-y-4">
                  {localSections.map((s, i) => <div key={i}><p className="text-sm font-semibold mb-1" style={{ color: '#2D3038' }}>{s.title}</p><TextBlock text={s.content} /></div>)}
                </div>
              </Card>
            )}

            {/* 7. Deposit Information */}
            {depositInfo && (
              <Card title="Deposit Information">
                <TextBlock text={depositInfo} />
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
                        <div className="p-2.5 flex justify-between items-end gap-1">
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <p className="font-semibold text-xs truncate" style={{ color: '#2D3038' }}>{r.name}</p>
                            <p className="text-sm font-bold tabular-nums" style={{ color: '#2D3038' }}>&pound;{Math.round(r.rent_pcm)}<span className="text-[10px] font-normal ml-0.5" style={{ color: '#9CA3AF' }}>/mo</span></p>
                          </div>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: '#DCFCE7', color: '#16A34A' }}>View Room &rarr;</span>
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
            <p className="text-xs font-medium" style={{ color: availNow ? '#16A34A' : '#6B7280' }}>{availShort}</p>
          </div>
          <div className="flex gap-2 flex-1">
            <Link href={`/apply/${room.id}`} className="flex-1 flex items-center justify-center py-3 rounded-full font-semibold text-sm transition-colors hover:opacity-90"
              style={{ background: '#2D3038', color: '#ffffff' }}>
              Apply to Rent
            </Link>
            <a href="#ask" className="flex-1 flex items-center justify-center py-3 rounded-full border-2 font-semibold text-sm transition-colors hover:bg-gray-50"
              style={{ background: '#ffffff', borderColor: '#2D3038', color: '#2D3038' }}>
              Ask a Question
            </a>
          </div>
        </div>
      </div>
    </>
  )
}
