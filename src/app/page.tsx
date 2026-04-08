import { Suspense } from 'react'
import { fetchAllRooms } from '@/lib/queries'
import RoomBrowser from '@/components/RoomBrowser'

export default async function HomePage() {
  let rooms
  try {
    rooms = await fetchAllRooms()
  } catch (error) {
    console.error('Failed to fetch rooms:', error)
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <p className="text-lg font-medium" style={{ color: '#2D3038' }}>Unable to load rooms</p>
        <p className="mt-2 text-sm" style={{ color: '#6B7280' }}>Please try again later.</p>
      </div>
    )
  }

  return (
    <>
      {/* Hero */}
      <section className="relative" style={{ backgroundColor: '#F7F6F3' }}>
        <div className="mx-auto max-w-7xl px-6 pt-8 pb-12 md:pt-12 md:pb-16 md:px-8">
          <h1
            className="text-4xl font-extrabold leading-tight tracking-tight md:text-6xl lg:text-[4rem]"
            style={{ color: '#2D3038' }}
          >
            Premium shared living<br />
            across the South West.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed md:text-lg md:whitespace-nowrap" style={{ color: '#6B7280' }}>
            Beautifully furnished rooms in professionally managed houses.
          </p>
        </div>
      </section>

      <Suspense>
        <RoomBrowser rooms={rooms} />
      </Suspense>
    </>
  )
}
