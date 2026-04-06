import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { fetchProperty, fetchRoomsForProperty } from '@/lib/queries'
import RoomCard from '@/components/RoomCard'

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ cohoRef: string }>
}) {
  const { cohoRef } = await params
  const [property, rooms] = await Promise.all([
    fetchProperty(cohoRef),
    fetchRoomsForProperty(cohoRef),
  ])

  if (!property && rooms.length === 0) notFound()

  const first = rooms[0]
  const propertyName = property?.name ?? first?.property_name ?? cohoRef
  const city = property?.city ?? first?.property_city ?? ''
  const headline = first?.property_headline ?? null
  const amenities = first?.property_amenities ?? []
  const images = first?.property_images ?? []

  // Skip first property image (often exterior drawing), use second
  let mainPhoto: string | null = null
  if (images.length > 1) {
    mainPhoto = images[1].url
  } else if (rooms.some((r) => r.photo_urls.length > 0)) {
    const roomWithPhoto = rooms.find((r) => r.photo_urls.length > 0)!
    mainPhoto = roomWithPhoto.photo_urls[0]
  } else if (images.length === 1) {
    mainPhoto = images[0].url
  } else {
    mainPhoto = property?.photo_url ?? first?.property_photo_url ?? null
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm font-medium mb-6 transition-colors duration-200"
        style={{ color: '#888888' }}
      >
        &larr; Back to all rooms
      </Link>

      {/* Property header */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Photo */}
        <div className="relative w-full overflow-hidden rounded-xl" style={{ aspectRatio: '4/3', backgroundColor: '#F0F0F0' }}>
          {mainPhoto ? (
            <Image
              src={mainPhoto}
              alt={propertyName}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              quality={85}
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center" style={{ color: '#888888' }}>
              No photo
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#2D3038' }}>{propertyName}</h1>
            <p className="text-gray-500">{city}</p>
          </div>

          {headline && (
            <p style={{ color: '#2D3038' }}>{headline}</p>
          )}

          {amenities.length > 0 && (
            <div>
              <h2 className="text-sm font-bold mb-2" style={{ color: '#2D3038' }}>Amenities</h2>
              <div className="flex flex-wrap gap-2">
                {amenities.map((a) => (
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

          {first && (
            <div className="flex gap-4 text-sm" style={{ color: '#888888' }}>
              {first.property_bedrooms != null && (
                <span>{first.property_bedrooms} bed{first.property_bedrooms !== 1 ? 's' : ''}</span>
              )}
              {first.property_bathrooms != null && (
                <span>{first.property_bathrooms} bath{first.property_bathrooms !== 1 ? 's' : ''}</span>
              )}
              <span>{first.property_total_rooms} total rooms</span>
            </div>
          )}
        </div>
      </div>

      {/* Property images gallery — skip first (drawing) */}
      {images.length > 1 && (
        <div className="mt-6">
          <h2 className="text-lg font-bold mb-3" style={{ color: '#2D3038' }}>Photos</h2>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {images.slice(1).map((img, idx) => (
              <div key={idx} className="relative overflow-hidden rounded-xl" style={{ aspectRatio: '4/3', backgroundColor: '#F0F0F0' }}>
                <Image
                  src={img.url}
                  alt={img.title || `Photo ${idx + 1}`}
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

      {/* Available rooms */}
      <div className="mt-8">
        <h2 className="text-lg font-bold mb-4" style={{ color: '#2D3038' }}>
          Available Rooms ({rooms.length})
        </h2>
        {rooms.length === 0 ? (
          <p style={{ color: '#888888' }}>No rooms currently available at this property.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
