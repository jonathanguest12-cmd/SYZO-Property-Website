'use client'

import { useState, useMemo } from 'react'
import type {
  RoomWithProperty,
  AreaFilter,
  PriceRange,
  AvailabilityFilter,
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

function matchesPriceRange(rent: number, range: PriceRange): boolean {
  switch (range) {
    case 'any':
      return true
    case 'under_450':
      return rent < 450
    case '450_550':
      return rent >= 450 && rent <= 550
    case '550_650':
      return rent >= 550 && rent <= 650
    case 'over_650':
      return rent > 650
    default:
      return true
  }
}

function matchesAvailability(dateStr: string, filter: AvailabilityFilter): boolean {
  if (filter === 'any') return true
  const date = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  if (filter === 'now') {
    return date <= now
  }

  const cutoff = new Date(now)
  if (filter === 'within_1_month') {
    cutoff.setMonth(cutoff.getMonth() + 1)
  } else if (filter === 'within_3_months') {
    cutoff.setMonth(cutoff.getMonth() + 3)
  }
  return date <= cutoff
}

export default function RoomBrowser({ rooms, initialArea = 'all' }: RoomBrowserProps) {
  const [area, setArea] = useState<AreaFilter>(initialArea)
  const [priceRange, setPriceRange] = useState<PriceRange>('any')
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>('any')
  const [sort, setSort] = useState<SortOption>('price_asc')
  const [view, setView] = useState<ViewMode>('rooms')
  const [showFilters, setShowFilters] = useState(false)

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (area !== 'all') count++
    if (priceRange !== 'any') count++
    if (availabilityFilter !== 'any') count++
    return count
  }, [area, priceRange, availabilityFilter])

  const filtered = useMemo(() => {
    let result = rooms

    if (area !== 'all') {
      result = result.filter(
        (r) => r.property_city.toLowerCase() === area.toLowerCase()
      )
    }

    result = result.filter((r) => matchesPriceRange(r.rent_pcm, priceRange))
    result = result.filter((r) => matchesAvailability(r.available_from, availabilityFilter))

    result = [...result].sort((a, b) => {
      switch (sort) {
        case 'price_asc':
          return Number(a.rent_pcm) - Number(b.rent_pcm)
        case 'price_desc':
          return Number(b.rent_pcm) - Number(a.rent_pcm)
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
  }, [rooms, area, priceRange, availabilityFilter, sort])

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
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">
      {/* Controls bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* City filter pills */}
          <div className="hidden sm:inline-flex rounded-lg p-0.5" style={{ backgroundColor: '#EEEDEA' }}>
            {([['all', 'All'], ['plymouth', 'Plymouth'], ['newquay', 'Newquay']] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setArea(value as AreaFilter)}
                className="rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200 cursor-pointer"
                style={
                  area === value
                    ? { backgroundColor: '#ffffff', color: '#2D3038', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }
                    : { color: '#6B7280' }
                }
              >
                {label}
              </button>
            ))}
          </div>
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold"
            style={{ background: '#DCFCE7', color: '#16A34A' }}
          >
            {view === 'properties'
              ? `${propertyGroups.size} propert${propertyGroups.size !== 1 ? 'ies' : 'y'} available`
              : `${filtered.length} room${filtered.length !== 1 ? 's' : ''} available`}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div
            className="inline-flex rounded-lg p-0.5"
            style={{ backgroundColor: '#EEEDEA' }}
          >
            <button
              type="button"
              onClick={() => setView('rooms')}
              className="rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200 cursor-pointer"
              style={
                view === 'rooms'
                  ? { backgroundColor: '#ffffff', color: '#2D3038', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }
                  : { color: '#6B7280' }
              }
            >
              Rooms
            </button>
            <button
              type="button"
              onClick={() => setView('properties')}
              className="rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200 cursor-pointer"
              style={
                view === 'properties'
                  ? { backgroundColor: '#ffffff', color: '#2D3038', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }
                  : { color: '#6B7280' }
              }
            >
              Properties
            </button>
          </div>

          {/* Filters toggle */}
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all duration-200 cursor-pointer"
            style={
              showFilters || activeFilterCount > 0
                ? { backgroundColor: '#2D3038', color: '#ffffff' }
                : { backgroundColor: '#EEEDEA', color: '#6B7280' }
            }
          >
            Filters
            {activeFilterCount > 0 && (
              <span
                className="inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#ffffff' }}
              >
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div
          className="mt-4 rounded-xl bg-white p-5"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        >
          <FilterPanel
            area={area}
            onAreaChange={setArea}
            priceRange={priceRange}
            onPriceRangeChange={setPriceRange}
            availabilityFilter={availabilityFilter}
            onAvailabilityFilterChange={setAvailabilityFilter}
            sort={sort}
            onSortChange={setSort}
          />
        </div>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-2 text-center">
          <p className="text-lg font-semibold" style={{ color: '#2D3038' }}>No rooms match your filters</p>
          <p className="text-sm" style={{ color: '#9CA3AF' }}>Try adjusting your search criteria</p>
        </div>
      ) : view === 'rooms' ? (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 md:gap-6">
          {filtered.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 md:gap-6">
          {Array.from(propertyGroups.entries()).map(([ref, groupRooms]) => (
            <PropertyCard key={ref} propertyRef={ref} rooms={groupRooms} />
          ))}
        </div>
      )}
    </div>
  )
}
