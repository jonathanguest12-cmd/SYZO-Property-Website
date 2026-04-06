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
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#6B7280' }}>
            Premium Shared Living
          </p>
          <h1
            className="mt-3 text-3xl font-bold leading-tight tracking-tight md:text-5xl lg:text-[3.5rem]"
            style={{ color: '#2D3038' }}
          >
            Rooms to rent across<br />
            the South West
          </h1>
          <p className="mt-4 max-w-lg text-base leading-relaxed md:text-lg" style={{ color: '#6B7280' }}>
            Beautifully furnished rooms in professionally managed shared houses.
          </p>
        </div>
      </section>

      <RoomBrowser rooms={rooms} />
    </>
  )
}
