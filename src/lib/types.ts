export interface Property {
  id: string
  coho_reference: string
  address_line1: string
  address_city: string
  address_postcode: string
  pets_allowed: boolean
  smoking_allowed: boolean
  property_type: string
  number_of_bedrooms: number
  number_of_bathrooms: number
  total_rooms: number
  rooms_occupied: number
  headline_description: string
  amenities: string[]
  additional_info: Record<string, unknown>
}

export interface Room {
  id: string
  property_id: string
  coho_reference: string
  rent: number
  payment_frequency: string
  room_size: string
  bills_inclusive: string
  available_from: string
  deposit_amount_required: number
  guarantor_required: boolean
  advert_title: string
  advert_description: string
  amenities: string[]
  images: { url: string }[]
  spareroom_listing_id: string | null
  additional_info: Record<string, unknown>
}

export interface RoomWithProperty extends Room {
  address_line1: string
  address_city: string
  address_postcode: string
  pets_allowed: boolean
  smoking_allowed: boolean
  property_coho_ref: string
}

export type AreaFilter = 'all' | 'plymouth' | 'newquay'
export type RoomTypeFilter = 'any' | 'single' | 'double'
export type SortOption = 'price_asc' | 'price_desc' | 'available_soonest'
export type ViewMode = 'rooms' | 'properties'
