import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { fetchAllRooms, fetchAllPropertyNames } from '@/lib/queries'
import RoomBrowser from '@/components/RoomBrowser'
import type { AreaFilter } from '@/lib/types'

const validCities: Record<string, AreaFilter> = {
  plymouth: 'plymouth',
  newquay: 'newquay',
}

export function generateStaticParams() {
  return [{ city: 'plymouth' }, { city: 'newquay' }]
}

export default async function CityPage({
  params,
}: {
  params: Promise<{ city: string }>
}) {
  const { city } = await params
  const areaFilter = validCities[city.toLowerCase()]
  if (!areaFilter) notFound()

  const [rooms, allPropertyNames] = await Promise.all([
    fetchAllRooms(),
    fetchAllPropertyNames(),
  ])

  return (
    <Suspense>
      <RoomBrowser
        rooms={rooms}
        allPropertyNames={allPropertyNames}
        initialArea={areaFilter}
        initialView="rooms"
      />
    </Suspense>
  )
}
