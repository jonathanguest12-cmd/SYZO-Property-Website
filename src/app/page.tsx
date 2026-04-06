import { fetchAllRooms } from '@/lib/queries'
import RoomBrowser from '@/components/RoomBrowser'

export default async function HomePage() {
  const rooms = await fetchAllRooms()

  return <RoomBrowser rooms={rooms} />
}
