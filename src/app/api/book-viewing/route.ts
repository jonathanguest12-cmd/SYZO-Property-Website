import { NextRequest, NextResponse } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// UUID v4 (case-insensitive).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mtrrxtwisgftkqujfqlr.supabase.co'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// 3 booking attempts per application per hour. Keyed by applicationId, not IP,
// so a single green applicant can't hammer the claim endpoint.
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '1h'),
  analytics: true,
  prefix: 'book-viewing',
})

type ApplicationRow = {
  id: string
  tier: 'green' | 'amber' | 'red'
}

type SlotRow = {
  id: string
  slot_date: string
  start_time: string
  property_name: string
}

function bad(msg: string, status = 400) {
  return NextResponse.json({ success: false, error: msg }, { status })
}

export async function POST(req: NextRequest) {
  const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY_PARROT
  if (!SUPABASE_KEY) {
    console.error('[book-viewing] SUPABASE_SECRET_KEY_PARROT is not set')
    return bad('Booking unavailable. Please try again.', 500)
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return bad('Invalid request body')
  }
  if (!body || typeof body !== 'object') return bad('Invalid request body')

  const { applicationId, slotId } = body as Record<string, unknown>
  if (typeof applicationId !== 'string' || !UUID_RE.test(applicationId)) {
    return bad('Invalid application id')
  }
  if (typeof slotId !== 'string' || !UUID_RE.test(slotId)) {
    return bad('Invalid slot id')
  }

  // Rate limit by applicationId — 3 booking attempts per hour. Fails open
  // if Upstash is misconfigured so a broken cache doesn't block bookings.
  try {
    const { success } = await ratelimit.limit(`book:${applicationId}`)
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'rate_limited' },
        { status: 429 }
      )
    }
  } catch (err) {
    console.error('[book-viewing] Rate limit check failed:', err)
  }

  const sbHeaders = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  } as const

  // 1. Validate the application exists and is green-tier.
  // Explicit column select — never SELECT * on the PII-bearing applications table.
  let application: ApplicationRow | null = null
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/applications?id=eq.${applicationId}&select=id,tier&limit=1`,
      { headers: sbHeaders, cache: 'no-store' }
    )
    if (!res.ok) {
      console.error('[book-viewing] app lookup failed:', res.status)
      return bad('Booking unavailable. Please try again.', 500)
    }
    const rows = (await res.json()) as ApplicationRow[]
    if (Array.isArray(rows) && rows[0]) application = rows[0]
  } catch (err) {
    console.error('[book-viewing] app lookup error:', err)
    return bad('Booking unavailable. Please try again.', 500)
  }

  if (!application) return bad('Application not found', 404)
  if (application.tier !== 'green') {
    return bad('Not eligible for booking', 403)
  }

  // 2. Already-booked check: if this applicant has any booked slot, refuse.
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/viewing_slots?applicant_id=eq.${applicationId}&status=eq.booked&select=id,slot_date,start_time,property_name&limit=1`,
      { headers: sbHeaders, cache: 'no-store' }
    )
    if (res.ok) {
      const rows = (await res.json()) as SlotRow[]
      if (Array.isArray(rows) && rows[0]) {
        return NextResponse.json({
          success: false,
          error: 'already_booked',
          slot: rows[0],
        })
      }
    }
  } catch (err) {
    console.error('[book-viewing] existing booking check error:', err)
  }

  // 3. Atomic claim — PATCH with a status=eq.available guard.
  // PostgREST matches rows that satisfy BOTH filters, so if another request
  // already flipped the row to 'booked', the update affects zero rows and
  // the returning array is empty. This is the "single UPDATE ... RETURNING"
  // the brief calls for, implemented via PostgREST's filtered PATCH.
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/viewing_slots?id=eq.${slotId}&status=eq.available&select=id,slot_date,start_time,property_name`,
      {
        method: 'PATCH',
        headers: { ...sbHeaders, Prefer: 'return=representation' },
        body: JSON.stringify({
          status: 'booked',
          applicant_id: applicationId,
        }),
      }
    )
    if (!res.ok) {
      console.error('[book-viewing] claim PATCH failed:', res.status)
      return bad('Booking failed. Please try again.', 500)
    }
    const rows = (await res.json()) as SlotRow[]
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ success: false, error: 'slot_taken' })
    }
    return NextResponse.json({ success: true, slot: rows[0] })
  } catch (err) {
    console.error('[book-viewing] claim error:', err)
    return bad('Booking failed. Please try again.', 500)
  }
}
