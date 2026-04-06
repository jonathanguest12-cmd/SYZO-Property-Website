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
        <p className="text-lg font-medium" style={{ color: '#1a1a2e' }}>Unable to load rooms</p>
        <p className="mt-2 text-sm" style={{ color: '#6b7280' }}>Please try again later.</p>
      </div>
    )
  }

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: '#1a1a2e' }}>
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-28 md:px-8">
          <p className="text-sm font-medium tracking-[0.2em] uppercase" style={{ color: '#c49a6c' }}>
            Premium Shared Living
          </p>
          <h1
            className="mt-4 text-4xl md:text-5xl lg:text-6xl font-normal leading-[1.1] text-white"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Find your room in<br />
            <span style={{ color: '#c49a6c' }}>Plymouth &amp; Newquay</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Beautifully furnished rooms in professionally managed shared houses. One monthly payment, all bills included.
          </p>
        </div>
      </section>

      <RoomBrowser rooms={rooms} />
    </>
  )
}
