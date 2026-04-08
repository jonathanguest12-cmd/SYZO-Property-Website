import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { fetchRoomsForProperty, fetchAllPropertyNames } from '@/lib/queries'
import { roomTypeLabel } from '@/lib/format'

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

export default async function ApplyPropertyPage({
  params,
}: {
  params: Promise<{ cohoRef: string }>
}) {
  const { cohoRef } = await params
  const [rooms, allPropertyNames] = await Promise.all([
    fetchRoomsForProperty(cohoRef),
    fetchAllPropertyNames(),
  ])

  if (rooms.length === 0) notFound()

  const first = rooms[0]
  const propertyName = first.property_name
  const displayName = formatPropertyAddress(propertyName, allPropertyNames)

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 md:px-8 md:py-10">
      <Link
        href={`/property/${cohoRef}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium mb-8 transition-colors duration-200 hover:opacity-70"
        style={{ color: '#6B7280' }}
      >
        &larr; Back to property
      </Link>

      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl" style={{ color: '#2D3038' }}>
          Choose your room
        </h1>
        <p className="mt-2 text-sm" style={{ color: '#9CA3AF' }}>
          Select the room you&apos;d like to apply for at {displayName}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {rooms.map((room) => (
          <Link
            key={room.id}
            href={`/apply/${room.id}`}
            className="flex gap-4 rounded-2xl bg-white p-4 border transition-shadow duration-200 hover:shadow-md"
            style={{ borderColor: '#E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
          >
            <div className="relative flex-shrink-0 overflow-hidden rounded-xl" style={{ width: '120px', height: '90px', backgroundColor: '#E5E3DF' }}>
              {room.photo_urls[0] ? (
                <Image
                  src={room.photo_urls[0]}
                  alt={room.name}
                  fill
                  quality={75}
                  className="object-cover"
                  sizes="120px"
                />
              ) : (
                <div className="flex h-full items-center justify-center" style={{ color: '#9CA3AF' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" /><path d="M9 21V12h6v9" />
                  </svg>
                </div>
              )}
            </div>
            <div className="flex flex-col justify-center gap-1 min-w-0 flex-1">
              <p className="font-semibold text-sm" style={{ color: '#2D3038' }}>{room.name}</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-bold tabular-nums" style={{ color: '#2D3038' }}>&pound;{Math.round(room.rent_pcm)}</span>
                <span className="text-xs" style={{ color: '#9CA3AF' }}>/mo</span>
              </div>
              {room.room_type && (
                <p className="text-xs" style={{ color: '#6B7280' }}>{roomTypeLabel(room.room_type)}</p>
              )}
            </div>
            <div className="flex items-center flex-shrink-0">
              <span className="text-xs font-medium px-3 py-1 rounded-full" style={{ background: '#DCFCE7', color: '#16A34A' }}>
                Apply &rarr;
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
