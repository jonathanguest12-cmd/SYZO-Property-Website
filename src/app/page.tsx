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
        <p className="text-lg font-medium text-gray-900">Unable to load rooms</p>
        <p className="mt-2 text-sm text-gray-500">Please try again later.</p>
      </div>
    )
  }

  return <RoomBrowser rooms={rooms} />
}
