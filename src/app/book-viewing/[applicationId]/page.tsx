import { redirect } from 'next/navigation'
import BookViewingClient, {
  type ApplicationData,
  type SlotData,
} from './BookViewingClient'

// Always render on-demand — slot availability changes quickly.
export const dynamic = 'force-dynamic'
export const revalidate = 0

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mtrrxtwisgftkqujfqlr.supabase.co'

type ApplicationRow = {
  id: string
  tier: 'green' | 'amber' | 'red'
  property_ref: string | null
  property_name: string | null
  full_name: string | null
  email: string | null
  phone: string | null
}

// Today in UK time as YYYY-MM-DD. Uses en-CA because it emits ISO-format.
function ukTodayIso(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' })
}

async function sbGet<T>(path: string, key: string): Promise<T | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
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
  if (!SUPABASE_KEY) {
    console.error('[book-viewing/page] SUPABASE_SECRET_KEY_PARROT is not set')
    redirect('/')
  }

  // Fetch the application. Explicit column list — never SELECT * on PII tables.
  const appRows = await sbGet<ApplicationRow[]>(
    `applications?id=eq.${applicationId}&select=id,tier,property_ref,property_name,full_name,email,phone&limit=1`,
    SUPABASE_KEY
  )
  const application = appRows && appRows[0]
  if (!application || application.tier !== 'green') {
    redirect('/')
  }

  if (!application.property_ref) {
    redirect('/')
  }

  // Check if this applicant already has a booked slot.
  const existingRows = await sbGet<SlotData[]>(
    `viewing_slots?applicant_id=eq.${applicationId}&status=eq.booked&select=id,slot_date,start_time,property_name&limit=1`,
    SUPABASE_KEY
  )
  const existingBooking = (existingRows && existingRows[0]) || null

  // Fetch available slots for this property, today onwards (UK time).
  const today = ukTodayIso()
  const slotRows =
    (await sbGet<SlotData[]>(
      `viewing_slots?property_ref=eq.${encodeURIComponent(
        application.property_ref
      )}&status=eq.available&slot_date=gte.${today}&select=id,slot_date,start_time,property_name&order=slot_date.asc,start_time.asc`,
      SUPABASE_KEY
    )) || []

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
      initialSlots={slotRows}
      existingBooking={existingBooking}
    />
  )
}
