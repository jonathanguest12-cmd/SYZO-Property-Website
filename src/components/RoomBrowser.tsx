'use client'

import { useState, useMemo } from 'react'
import type {
  RoomWithProperty,
  AreaFilter,
  RoomTypeFilter,
  SortOption,
  ViewMode,
} from '@/lib/types'
import FilterPanel from './FilterPanel'
import RoomCard from './RoomCard'
import PropertyCard from './PropertyCard'

interface RoomBrowserProps {
  rooms: RoomWithProperty[]
  initialArea?: AreaFilter
}

export default function RoomBrowser({ rooms, initialArea = 'all' }: RoomBrowserProps) {
  const [area, setArea] = useState<AreaFilter>(initialArea)
  const [roomType, setRoomType] = useState<RoomTypeFilter>('any')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [availableFrom, setAvailableFrom] = useState('')
  const [sort, setSort] = useState<SortOption>('price_asc')
  const [view, setView] = useState<ViewMode>('rooms')

  const filtered = useMemo(() => {
    let result = rooms

    // Area filter
    if (area !== 'all') {
      result = result.filter(
        (r) => r.property_city.toLowerCase() === area.toLowerCase()
      )
    }

    // Room type filter
    if (roomType === 'single') {
      result = result.filter((r) => r.room_type === 'singleRoom')
    } else if (roomType === 'double') {
      result = result.filter((r) => r.room_type === 'doubleRoom')
    }

    // Price range
    if (minPrice) {
      const min = Number(minPrice)
      result = result.filter((r) => r.rent_pcm >= min)
    }
    if (maxPrice) {
      const max = Number(maxPrice)
      result = result.filter((r) => r.rent_pcm <= max)
    }

    // Available from
    if (availableFrom) {
      const fromDate = new Date(availableFrom)
      result = result.filter((r) => new Date(r.available_from) <= fromDate)
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sort) {
        case 'price_asc':
          return a.rent_pcm - b.rent_pcm
        case 'price_desc':
          return b.rent_pcm - a.rent_pcm
        case 'available_soonest':
          return (
            new Date(a.available_from).getTime() -
            new Date(b.available_from).getTime()
          )
        default:
          return 0
      }
    })

    return result
  }, [rooms, area, roomType, minPrice, maxPrice, availableFrom, sort])

  // Group by property for property view
  const propertyGroups = useMemo(() => {
    const map = new Map<string, RoomWithProperty[]>()
    for (const room of filtered) {
      const ref = room.property_ref
      if (!map.has(ref)) map.set(ref, [])
      map.get(ref)!.push(room)
    }
    return map
  }, [filtered])

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Filter bar */}
      <FilterPanel
        area={area}
        onAreaChange={setArea}
        roomType={roomType}
        onRoomTypeChange={setRoomType}
        minPrice={minPrice}
        onMinPriceChange={setMinPrice}
        maxPrice={maxPrice}
        onMaxPriceChange={setMaxPrice}
        availableFrom={availableFrom}
        onAvailableFromChange={setAvailableFrom}
        sort={sort}
        onSortChange={setSort}
      />

      {/* Results bar */}
      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">{filtered.length}</span>{' '}
          room{filtered.length !== 1 ? 's' : ''} available
        </p>

        {/* View toggle */}
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
          <button
            type="button"
            onClick={() => setView('rooms')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              view === 'rooms'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Rooms
          </button>
          <button
            type="button"
            onClick={() => setView('properties')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              view === 'properties'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Properties
          </button>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="mt-12 flex flex-col items-center gap-2 text-center">
          <p className="text-lg font-medium text-gray-900">No rooms match your filters</p>
          <p className="text-sm text-gray-500">Try adjusting your search criteria</p>
        </div>
      ) : view === 'rooms' ? (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </div>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from(propertyGroups.entries()).map(([ref, groupRooms]) => (
            <PropertyCard key={ref} propertyRef={ref} rooms={groupRooms} />
          ))}
        </div>
      )}
    </div>
  )
}
