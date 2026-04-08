export interface RoomRow {
  id: string
  property_id: string | null
  coho_reference: string
  name: string
  rent_pcm: number
  room_type: string // 'doubleRoom' | 'singleRoom' | 'notApplicableOrNull'
  status: string
  available_from: string | null
  spareroom_listing_id: string | null
  photo_urls: string[]
  bills_included: boolean
  broadband_included: boolean
  room_description: string | null
  house_rules: string | null
  additional_info: Record<string, any>
  description_about_property: string | null
  description_about_room: string | null
  descriptions_processed_at: string | null
  deposit_type: string | null  // "cashDeposit" | "depositReplacementScheme" | null
  deposit_amount: number | null
}

export interface PropertyRow {
  id: string
  coho_reference: string
  name: string
  address: string
  postcode: string
  city: string
  area: string
  total_rooms: number
  occupied_rooms: number
  photo_url: string | null
  active: boolean
}

/** Enriched room with property data extracted from additional_info */
export interface RoomWithProperty {
  id: string
  coho_reference: string
  name: string
  rent_pcm: number
  room_type: string
  available_from: string
  photo_urls: string[]
  bills_included: boolean
  broadband_included: boolean
  room_description: string | null
  // Advert data from additional_info
  advert_title: string | null
  advert_description: string | null
  // Property data (from additional_info.property)
  property_ref: string
  property_name: string
  property_city: string
  property_postcode: string
  property_amenities: string[]
  property_photo_url: string | null
  property_total_rooms: number
  property_pets_allowed: boolean | null
  property_smoking_allowed: boolean | null
  property_bedrooms: number | null
  property_bathrooms: number | null
  property_headline: string | null
  property_images: { url: string; title: string }[]
  // Room amenities from additional_info
  room_amenities: string[]
  spareroom_listing_id: string | null
  /** Raw COHO additional_info JSONB for detail page fields */
  additional_info: Record<string, any>
  /** Pre-processed description from n8n/Claude pipeline */
  description_about_property: string | null
  description_about_room: string | null
  descriptions_processed_at: string | null
  deposit_type: string | null  // "cashDeposit" | "depositReplacementScheme" | null
  deposit_amount: number | null
}

export type AreaFilter = 'all' | 'plymouth' | 'newquay'
export type PriceRange = 'any' | 'under_450' | '450_550' | '550_650' | 'over_650'
export type AvailabilityFilter = 'any' | 'now' | 'within_1_month' | 'within_3_months'
export type SortOption = 'price_asc' | 'price_desc' | 'available_soonest'
export type ViewMode = 'rooms' | 'properties'
