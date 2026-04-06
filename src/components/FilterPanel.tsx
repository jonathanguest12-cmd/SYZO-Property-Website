'use client'

import type { AreaFilter, PriceRange, AvailabilityFilter, SortOption } from '@/lib/types'

interface FilterPanelProps {
  area: AreaFilter
  onAreaChange: (v: AreaFilter) => void
  priceRange: PriceRange
  onPriceRangeChange: (v: PriceRange) => void
  availabilityFilter: AvailabilityFilter
  onAvailabilityFilterChange: (v: AvailabilityFilter) => void
  sort: SortOption
  onSortChange: (v: SortOption) => void
}

function PillGroup<T extends string>({
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
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium uppercase tracking-wide" style={{ color: '#888888' }}>
        {label}
      </span>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className="rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200"
            style={
              value === opt.value
                ? { backgroundColor: '#2D3038', color: '#FFFFFF' }
                : { backgroundColor: '#F0F0F0', color: '#666666' }
            }
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
    <div className="flex flex-col gap-5">
      <PillGroup
        label="Area"
        value={props.area}
        onChange={props.onAreaChange}
        options={[
          { value: 'all' as AreaFilter, label: 'All' },
          { value: 'plymouth' as AreaFilter, label: 'Plymouth' },
          { value: 'newquay' as AreaFilter, label: 'Newquay' },
        ]}
      />

      <PillGroup
        label="Price"
        value={props.priceRange}
        onChange={props.onPriceRangeChange}
        options={[
          { value: 'any' as PriceRange, label: 'Any' },
          { value: 'under_450' as PriceRange, label: 'Under \u00A3450' },
          { value: '450_550' as PriceRange, label: '\u00A3450\u2013\u00A3550' },
          { value: '550_650' as PriceRange, label: '\u00A3550\u2013\u00A3650' },
          { value: 'over_650' as PriceRange, label: '\u00A3650+' },
        ]}
      />

      <PillGroup
        label="Availability"
        value={props.availabilityFilter}
        onChange={props.onAvailabilityFilterChange}
        options={[
          { value: 'any' as AvailabilityFilter, label: 'Any' },
          { value: 'now' as AvailabilityFilter, label: 'Available Now' },
          { value: 'within_1_month' as AvailabilityFilter, label: 'Within 1 month' },
          { value: 'within_3_months' as AvailabilityFilter, label: 'Within 3 months' },
        ]}
      />

      {/* Sort */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-wide" style={{ color: '#888888' }}>
          Sort by
        </span>
        <select
          value={props.sort}
          onChange={(e) => props.onSortChange(e.target.value as SortOption)}
          className="w-fit rounded-full border px-4 py-1.5 text-sm font-medium"
          style={{ borderColor: '#F0F0F0', backgroundColor: '#FFFFFF', color: '#2D3038' }}
        >
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
          <option value="available_soonest">Available soonest</option>
        </select>
      </div>
    </div>
  )
}
