import { redirect } from 'next/navigation'
import BookViewingClient, {
  type ApplicationData,
  type SlotData,
} from './BookViewingClient'

// Always render on-demand — slot availability changes quickly.
export const dynamic = 'force-dynamic'
export const revalidate = 0

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type ApplicationRow = {
  id: string
  tier: 'green' | 'amber' | 'red'
  property_ref: string | null
  property_name: string | null
  full_name: string | null
  email: string | null
  phone: string | null
  cancel_count: number | null
}

type PropertyRow = {
  city: string
}

// Today in UK time as YYYY-MM-DD. Uses en-CA because it emits ISO-format.
function ukTodayIso(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' })
}

async function sbGet<T>(
  path: string,
  key: string,
  baseUrl: string
): Promise<T | null> {
  try {
    const res = await fetch(`${baseUrl}/rest/v1/${path}`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      cache: 'no-store',
    })
    if (!res.ok) {
      console.error('[book-viewing/page] fetch failed:', path, res.status)
      return null
    }
    return (await res.json()) as T
  } catch (err) {
    console.error('[book-viewing/page] fetch error:', path, err)
    return null
  }
}

export default async function BookViewingPage({
  params,
}: {
  params: Promise<{ applicationId: string }>
}) {
  const { applicationId } = await params

  if (!UUID_RE.test(applicationId)) {
    redirect('/')
  }

  const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY_PARROT
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!SUPABASE_KEY || !SUPABASE_URL) {
    console.error(
      '[book-viewing/page] Missing SUPABASE_SECRET_KEY_PARROT or NEXT_PUBLIC_SUPABASE_URL'
    )
    redirect('/')
  }

  // Fetch the application. Explicit column list — never SELECT * on PII tables.
  const appRows = await sbGet<ApplicationRow[]>(
    `applications?id=eq.${applicationId}&select=id,tier,property_ref,property_name,full_name,email,phone,cancel_count&limit=1`,
    SUPABASE_KEY,
    SUPABASE_URL
  )
  const application = appRows && appRows[0]
  if (!application || application.tier !== 'green') {
    redirect('/')
  }

  if (!application.property_ref) {
    redirect('/')
  }

  // Look up the property's city so we can filter slots by city.
  const propertyRows = await sbGet<PropertyRow[]>(
    `properties?coho_reference=eq.${encodeURIComponent(application.property_ref)}&select=city&limit=1`,
    SUPABASE_KEY,
    SUPABASE_URL
  )
  const propertyCity = propertyRows?.[0]?.city?.toLowerCase() || ''

  // Check if this applicant already has a booked slot.
  const existingRows = await sbGet<SlotData[]>(
    `viewing_slots?applicant_id=eq.${applicationId}&status=eq.booked&select=id,slot_date,start_time,property_name&limit=1`,
    SUPABASE_KEY,
    SUPABASE_URL
  )
  const existingBooking = (existingRows && existingRows[0]) || null

  // Fetch available slots for this property's city, today onwards (UK time).
  const today = ukTodayIso()
  const cityFilter = propertyCity
    ? `&city=eq.${encodeURIComponent(propertyCity)}`
    : `&property_ref=eq.${encodeURIComponent(application.property_ref)}`
  const slotRows =
    (await sbGet<SlotData[]>(
      `viewing_slots?status=eq.available&slot_date=gte.${today}${cityFilter}&select=id,slot_date,start_time,property_name&order=slot_date.asc,start_time.asc`,
      SUPABASE_KEY,
      SUPABASE_URL
    )) || []

  // Filter out slots within the next 48 hours — ensures the 24hr reminder
  // (view-03) fires before the viewing, not immediately after booking.
  const minBookableDateTime = new Date(Date.now() + 48 * 60 * 60 * 1000)
  const bookableSlots = slotRows.filter((slot) => {
    // Append 'Z' — Supabase stores times in UTC; explicit suffix avoids
    // drift when the server's local timezone differs (e.g. BST in summer).
    const slotDateTime = new Date(`${slot.slot_date}T${slot.start_time}Z`)
    return slotDateTime > minBookableDateTime
  })

  const isRebook = (application.cancel_count ?? 0) > 0

  const appData: ApplicationData = {
    id: application.id,
    propertyName: application.property_name || 'your room',
    fullName: application.full_name || '',
    email: application.email || '',
    phone: application.phone || '',
  }

  return (
    <BookViewingClient
      application={appData}
      initialSlots={bookableSlots}
      existingBooking={existingBooking}
      isRebook={isRebook}
    />
  )
}
