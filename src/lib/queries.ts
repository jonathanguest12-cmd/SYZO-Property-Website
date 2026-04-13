import { createServerSupabaseClient } from './supabase-server'
import type { RoomRow, PropertyRow, RoomWithProperty } from './types'

/**
 * Extract property data from additional_info and flatten into RoomWithProperty.
 */
export function mapRoomToRoomWithProperty(row: RoomRow): RoomWithProperty {
  const prop = row.additional_info?.property ?? {}
  const roomAmenities = row.additional_info?.amenities ?? []

  // Main property photo: prefer prop.image, fall back to first in prop.images
  const images: { url: string; title: string }[] = Array.isArray(prop.images)
    ? prop.images
    : []
  const mainImage = prop.image?.url ?? (images.length > 0 ? images[0].url : null)

  return {
    id: row.id,
    coho_reference: row.coho_reference,
    name: row.name,
    rent_pcm: Number(row.rent_pcm),
    room_type: row.room_type,
    available_from: row.available_from!,
    photo_urls: row.photo_urls ?? [],
    bills_included: row.bills_included,
    broadband_included: row.broadband_included,
    room_description: row.room_description,
    property_ref: prop.reference ?? '',
    property_name: prop.name ?? '',
    property_city: prop.majorAreaReference ?? '',
    property_postcode: prop.postcode ?? '',
    property_amenities: Array.isArray(prop.amenities) ? prop.amenities : [],
    property_photo_url: mainImage,
    property_total_rooms: prop.totalRooms ?? 0,
    property_pets_allowed: prop.petsAllowed ?? null,
    property_smoking_allowed: prop.smokingAllowed ?? null,
    property_bedrooms: prop.numberOfBedrooms ?? null,
    property_bathrooms: prop.numberOfBathrooms ?? null,
    property_headline: prop.headlineDescription ?? null,
    property_images: images,
    room_amenities: Array.isArray(roomAmenities) ? roomAmenities : [],
    spareroom_listing_id: row.spareroom_listing_id,
    advert_title: row.additional_info?.advertTitle ?? null,
    advert_description: row.additional_info?.advertDescription ?? null,
    additional_info: row.additional_info ?? {},
    description_about_property: row.description_about_property ?? null,
    description_about_room: row.description_about_room ?? null,
    descriptions_processed_at: row.descriptions_processed_at ?? null,
    deposit_type: row.deposit_type ?? null,
    deposit_amount: row.deposit_amount ?? null,
    epc_rating: row.epc_rating ?? null,
  }
}

/**
 * Fetch all rooms that have an available_from date.
 */
export async function fetchAllRooms(): Promise<RoomWithProperty[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .not('available_from', 'is', null)
    .order('rent_pcm', { ascending: true })
    .limit(500)

  if (error) throw error
  return (data ?? []).map((row) => mapRoomToRoomWithProperty(row as RoomRow))
}

/**
 * Fetch a single property by its coho_reference.
 */
export async function fetchProperty(cohoRef: string): Promise<PropertyRow | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('coho_reference', cohoRef)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data as PropertyRow
}

/**
 * Fetch all available rooms for a given property reference.
 * Since property_id is NULL, we fetch all available rooms and filter
 * by additional_info.property.reference on the client.
 */
export async function fetchRoomsForProperty(propertyRef: string): Promise<RoomWithProperty[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .not('available_from', 'is', null)
    .order('rent_pcm', { ascending: true })
    .limit(500)

  if (error) throw error

  return (data ?? [])
    .map((row) => mapRoomToRoomWithProperty(row as RoomRow))
    .filter((room) => room.property_ref === propertyRef)
}

/**
 * Fetch a single room by UUID, enriched with property data.
 */
export async function fetchRoomById(roomId: string): Promise<RoomWithProperty | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return mapRoomToRoomWithProperty(data as RoomRow)
}

/**
 * Fetch a room by its SpareRoom listing ID.
 */
export async function fetchRoomBySpareRoomId(
  listingId: string
): Promise<RoomWithProperty | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('spareroom_listing_id', listingId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return mapRoomToRoomWithProperty(data as RoomRow)
}

/**
 * Count available rooms, optionally filtered by city.
 * Uses additional_info->property->>majorAreaReference for city filtering.
 */
export async function fetchAvailableRoomCount(city?: string): Promise<number> {
  const supabase = await createServerSupabaseClient()

  if (city) {
    // Fetch all available rooms and filter by city from additional_info
    const { data, error } = await supabase
      .from('rooms')
      .select('additional_info')
      .not('available_from', 'is', null)
      .limit(500)

    if (error) throw error

    return (data ?? []).filter((row: any) => {
      const rowCity = row.additional_info?.property?.majorAreaReference ?? ''
      return rowCity.toLowerCase() === city.toLowerCase()
    }).length
  }

  const { count, error } = await supabase
    .from('rooms')
    .select('*', { count: 'exact', head: true })
    .not('available_from', 'is', null)

  if (error) throw error
  return count ?? 0
}

/**
 * Fetch all distinct property names from available rooms.
 */
export async function fetchAllPropertyNames(): Promise<string[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('rooms')
    .select('additional_info')
    .not('available_from', 'is', null)
    .limit(500)

  if (error) throw error

  const names = (data ?? [])
    .map((row: any) => row.additional_info?.property?.name as string | undefined)
    .filter((n): n is string => !!n)
  return [...new Set(names)]
}

/**
 * Insert a stale link lead record. Best-effort — silently fails.
 */
export async function insertStaleLinkLead(
  listingId: string,
  city?: string
): Promise<void> {
  try {
    const supabase = await createServerSupabaseClient()
    await supabase.from('leads').insert({
      source: 'spareroom',
      status: 'stale_link',
      spareroom_listing_id: listingId,
      city: city ?? null,
    })
  } catch {
    // Silently fail — the leads table may have constraints we can't satisfy
  }
}
