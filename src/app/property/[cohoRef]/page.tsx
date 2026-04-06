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

  // Use property data from first room's additional_info if property table row exists
  const first = rooms[0]
  const propertyName = property?.name ?? first?.property_name ?? cohoRef
  const city = property?.city ?? first?.property_city ?? ''
  const headline = first?.property_headline ?? null
  const amenities = first?.property_amenities ?? []
  const images = first?.property_images ?? []
  const mainPhoto =
    property?.photo_url ?? first?.property_photo_url ?? null

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        &larr; Back to all rooms
      </Link>

      {/* Property header */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Photo */}
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-gray-100">
          {mainPhoto ? (
            <Image
              src={mainPhoto}
              alt={propertyName}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-400">
              No photo
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{propertyName}</h1>
            <p className="text-gray-500">{city}</p>
          </div>

          {headline && (
            <p className="text-gray-700">{headline}</p>
          )}

          {amenities.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-900 mb-2">Amenities</h2>
              <div className="flex flex-wrap gap-1.5">
                {amenities.map((a) => (
                  <span
                    key={a}
                    className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700"
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {first && (
            <div className="flex gap-4 text-sm text-gray-600">
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

      {/* Property images gallery */}
      {images.length > 1 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Photos</h2>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((img, idx) => (
              <div key={idx} className="relative aspect-[4/3] overflow-hidden rounded-lg bg-gray-100">
                <Image
                  src={img.url}
                  alt={img.title || `Photo ${idx + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available rooms */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Available Rooms ({rooms.length})
        </h2>
        {rooms.length === 0 ? (
          <p className="text-gray-500">No rooms currently available at this property.</p>
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
