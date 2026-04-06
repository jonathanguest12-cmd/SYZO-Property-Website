'use client'

import type { AreaFilter, RoomTypeFilter, SortOption } from '@/lib/types'

interface FilterPanelProps {
  area: AreaFilter
  onAreaChange: (v: AreaFilter) => void
  roomType: RoomTypeFilter
  onRoomTypeChange: (v: RoomTypeFilter) => void
  minPrice: string
  onMinPriceChange: (v: string) => void
  maxPrice: string
  onMaxPriceChange: (v: string) => void
  availableFrom: string
  onAvailableFromChange: (v: string) => void
  sort: SortOption
  onSortChange: (v: SortOption) => void
}

function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        {label}
      </span>
      <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              value === opt.value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function FilterPanel(props: FilterPanelProps) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <ToggleGroup
        label="Area"
        value={props.area}
        onChange={props.onAreaChange}
        options={[
          { value: 'all' as AreaFilter, label: 'All' },
          { value: 'plymouth' as AreaFilter, label: 'Plymouth' },
          { value: 'newquay' as AreaFilter, label: 'Newquay' },
        ]}
      />

      <ToggleGroup
        label="Room Type"
        value={props.roomType}
        onChange={props.onRoomTypeChange}
        options={[
          { value: 'any' as RoomTypeFilter, label: 'Any' },
          { value: 'single' as RoomTypeFilter, label: 'Single' },
          { value: 'double' as RoomTypeFilter, label: 'Double' },
        ]}
      />

      {/* Price range */}
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Price (pcm)
        </span>
        <div className="flex items-center gap-1">
          <input
            type="number"
            placeholder="Min"
            value={props.minPrice}
            onChange={(e) => props.onMinPriceChange(e.target.value)}
            className="w-20 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm"
          />
          <span className="text-gray-400">-</span>
          <input
            type="number"
            placeholder="Max"
            value={props.maxPrice}
            onChange={(e) => props.onMaxPriceChange(e.target.value)}
            className="w-20 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm"
          />
        </div>
      </div>

      {/* Available from */}
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Available from
        </span>
        <input
          type="date"
          value={props.availableFrom}
          onChange={(e) => props.onAvailableFromChange(e.target.value)}
          className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm"
        />
      </div>

      {/* Sort */}
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Sort by
        </span>
        <select
          value={props.sort}
          onChange={(e) => props.onSortChange(e.target.value as SortOption)}
          className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm"
        >
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
          <option value="available_soonest">Available soonest</option>
        </select>
      </div>
    </div>
  )
}
