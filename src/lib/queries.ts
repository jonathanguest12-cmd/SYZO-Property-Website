import { createServerSupabaseClient } from './supabase-server'
import type { Property, Room, RoomWithProperty } from './types'

/**
 * Maps a raw room row (with nested properties relation) to a flat RoomWithProperty.
 */
function mapRoomWithProperty(row: Record<string, unknown>): RoomWithProperty {
  const property = row.properties as Record<string, unknown>
  return {
    id: row.id as string,
    property_id: row.property_id as string,
    coho_reference: row.coho_reference as string,
    rent: row.rent as number,
    payment_frequency: row.payment_frequency as string,
    room_size: row.room_size as string,
    bills_inclusive: row.bills_inclusive as string,
    available_from: row.available_from as string,
    deposit_amount_required: row.deposit_amount_required as number,
    guarantor_required: row.guarantor_required as boolean,
    advert_title: row.advert_title as string,
    advert_description: row.advert_description as string,
    amenities: row.amenities as string[],
    images: row.images as { url: string }[],
    spareroom_listing_id: row.spareroom_listing_id as string | null,
    additional_info: row.additional_info as Record<string, unknown>,
    address_line1: property.address_line1 as string,
    address_city: property.address_city as string,
    address_postcode: property.address_postcode as string,
    pets_allowed: property.pets_allowed as boolean,
    smoking_allowed: property.smoking_allowed as boolean,
    property_coho_ref: property.coho_reference as string,
  }
}

const ROOM_WITH_PROPERTY_SELECT = `
  *,
  properties!inner(
    coho_reference,
    address_line1,
    address_city,
    address_postcode,
    pets_allowed,
    smoking_allowed
  )
`

/**
 * Fetch all rooms that have an available_from date, joined with property data.
 */
export async function fetchAllRooms(): Promise<RoomWithProperty[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('rooms')
    .select(ROOM_WITH_PROPERTY_SELECT)
    .not('available_from', 'is', null)

  if (error) throw error
  return (data ?? []).map(mapRoomWithProperty)
}

/**
 * Fetch a single property by its coho_reference.
 */
export async function fetchProperty(cohoRef: string): Promise<Property | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('coho_reference', cohoRef)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // not found
    throw error
  }
  return data as Property
}

/**
 * Fetch all available rooms for a given property ID.
 */
export async function fetchRoomsForProperty(propertyId: string): Promise<Room[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('property_id', propertyId)
    .not('available_from', 'is', null)

  if (error) throw error
  return (data ?? []) as Room[]
}

/**
 * Fetch a single room by UUID, with property data.
 */
export async function fetchRoomById(roomId: string): Promise<RoomWithProperty | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('rooms')
    .select(ROOM_WITH_PROPERTY_SELECT)
    .eq('id', roomId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return mapRoomWithProperty(data as Record<string, unknown>)
}

/**
 * Fetch a room by its SpareRoom listing ID, with property data.
 */
export async function fetchRoomBySpareRoomId(listingId: string): Promise<RoomWithProperty | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('rooms')
    .select(ROOM_WITH_PROPERTY_SELECT)
    .eq('spareroom_listing_id', listingId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return mapRoomWithProperty(data as Record<string, unknown>)
}

/**
 * Count available rooms, optionally filtered by city.
 */
export async function fetchAvailableRoomCount(city?: string): Promise<number> {
  const supabase = await createServerSupabaseClient()
  let query = supabase
    .from('rooms')
    .select('*, properties!inner(address_city)', { count: 'exact', head: true })
    .not('available_from', 'is', null)

  if (city) {
    query = query.ilike('properties.address_city', city)
  }

  const { count, error } = await query

  if (error) throw error
  return count ?? 0
}

/**
 * Insert a stale link lead record.
 * NOTE: Column names may need adjustment based on actual leads table schema.
 */
export async function insertStaleLinkLead(listingId: string, city?: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('leads')
    .insert({
      source: 'spareroom',
      status: 'stale_link',
      spareroom_listing_id: listingId,
      city: city ?? null,
    })

  if (error) throw error
}
