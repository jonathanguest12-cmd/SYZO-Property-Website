import { NextRequest, NextResponse } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { scoreApplication, type IncomeBracket, type ScreeningAnswers } from '@/lib/scoring'

const SUPABASE_URL = 'https://mtrrxtwisgftkqujfqlr.supabase.co'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1h'),
  analytics: true,
  prefix: 'apply-submit',
})

function clientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return req.headers.get('x-real-ip') || 'unknown'
}

// UUID v4 (case-insensitive). roomId must match this before we touch the DB.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const VALID_INCOME: IncomeBracket[] = ['under_low', 'low', 'medium', 'high']
const VALID_WHO_MOVING_IN = ['Just me', 'Me and my partner', 'Me and family']
const VALID_MOVE_IN = ['Within 4 weeks', '1\u20133 months', '3+ months']
const VALID_EMPLOYMENT = ['Employed', 'Self-employed', 'Student', 'Unemployed']
const VALID_LENGTH_OF_STAY = ['12+ months', '6\u201312 months', 'Under 6 months']

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status })
}

export async function POST(req: NextRequest) {
  const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY_PARROT
  if (!SUPABASE_KEY) {
    console.error('[submit] SUPABASE_SECRET_KEY_PARROT is not set')
    return bad('Submission failed. Please try again.', 500)
  }

  // Rate limit: 5 submissions per IP per hour. Spam protection without
  // blocking legitimate retries. Falls open if Upstash is misconfigured.
  try {
    const { success } = await ratelimit.limit(`submit:${clientIp(req)}`)
    if (!success) {
      return NextResponse.json(
        { error: 'Too many applications. Please try again later.' },
        { status: 429 }
      )
    }
  } catch (err) {
    console.error('[submit] Rate limit check failed:', err)
    // Fail-open: allow request through if rate-limit infra is down.
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return bad('Invalid request body')
  }

  if (!body || typeof body !== 'object') return bad('Invalid request body')

  const {
    answers,
    contact,
    roomId,
    roomName,
    propertyName,
    propertyRef,
    rentPcm,
  } = body as Record<string, unknown>

  // ---------- Room data ----------
  if (typeof roomId !== 'string' || !UUID_RE.test(roomId)) {
    return bad('Invalid room id')
  }
  if (typeof rentPcm !== 'number' || !Number.isFinite(rentPcm) || rentPcm <= 0) {
    return bad('Invalid room data')
  }
  const roomNameSafe = typeof roomName === 'string' ? roomName.slice(0, 200) : ''
  const propertyNameSafe = typeof propertyName === 'string' ? propertyName.slice(0, 200) : ''
  const propertyRefSafe = typeof propertyRef === 'string' ? propertyRef.slice(0, 200) : ''

  // ---------- Contact ----------
  if (!contact || typeof contact !== 'object') return bad('Contact details required')
  const c = contact as Record<string, unknown>
  const fullName = typeof c.fullName === 'string' ? c.fullName.trim() : ''
  const email = typeof c.email === 'string' ? c.email.trim().toLowerCase() : ''
  const phone = typeof c.phone === 'string' ? c.phone.trim() : ''

  if (!fullName || fullName.length > 200) return bad('Full name required')
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return bad('Valid email required')
  }
  if (!phone || phone.length > 50) return bad('Phone required')

  // ---------- Answers ----------
  if (!answers || typeof answers !== 'object') return bad('Answers required')
  const a = answers as Record<string, unknown>

  if (typeof a.whoMovingIn !== 'string' || !VALID_WHO_MOVING_IN.includes(a.whoMovingIn)) {
    return bad('Invalid answer: whoMovingIn')
  }
  if (typeof a.moveInTimeline !== 'string' || !VALID_MOVE_IN.includes(a.moveInTimeline)) {
    return bad('Invalid answer: moveInTimeline')
  }
  if (typeof a.employmentStatus !== 'string' || !VALID_EMPLOYMENT.includes(a.employmentStatus)) {
    return bad('Invalid answer: employmentStatus')
  }
  if (typeof a.monthlyIncome !== 'string' || !VALID_INCOME.includes(a.monthlyIncome as IncomeBracket)) {
    return bad('Invalid answer: monthlyIncome')
  }
  if (typeof a.smokes !== 'boolean') return bad('Invalid answer: smokes')
  if (typeof a.hasPets !== 'boolean') return bad('Invalid answer: hasPets')
  if (typeof a.lengthOfStay !== 'string' || !VALID_LENGTH_OF_STAY.includes(a.lengthOfStay)) {
    return bad('Invalid answer: lengthOfStay')
  }
  if (typeof a.adverseCredit !== 'boolean') return bad('Invalid answer: adverseCredit')
  if (a.hasGuarantor !== null && typeof a.hasGuarantor !== 'boolean') {
    return bad('Invalid answer: hasGuarantor')
  }

  const screening: ScreeningAnswers = {
    whoMovingIn: a.whoMovingIn,
    moveInTimeline: a.moveInTimeline,
    employmentStatus: a.employmentStatus,
    monthlyIncome: a.monthlyIncome as IncomeBracket,
    smokes: a.smokes,
    hasPets: a.hasPets,
    lengthOfStay: a.lengthOfStay,
    adverseCredit: a.adverseCredit,
    hasGuarantor: a.hasGuarantor as boolean | null,
    rentPcm,
  }

  const result = scoreApplication(screening)

  // Save every application regardless of tier. Best-effort: if Supabase fails,
  // we still return success to the applicant (logged server-side for follow-up).
  try {
    const supabaseRes = await fetch(`${SUPABASE_URL}/rest/v1/applications`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        room_id: roomId,
        room_name: roomNameSafe,
        property_name: propertyNameSafe,
        property_ref: propertyRefSafe,
        rent_pcm: rentPcm,
        who_moving_in: screening.whoMovingIn,
        move_in_timeline: screening.moveInTimeline,
        employment_status: screening.employmentStatus,
        monthly_income: screening.monthlyIncome,
        smokes: screening.smokes,
        has_pets: screening.hasPets,
        length_of_stay: screening.lengthOfStay,
        adverse_credit: screening.adverseCredit,
        has_guarantor: screening.hasGuarantor,
        full_name: fullName,
        email,
        phone,
        score: result.score,
        tier: result.tier,
        red_reason: result.redReason,
      }),
    })

    if (!supabaseRes.ok) {
      const detail = await supabaseRes.text().catch(() => '')
      console.error('[submit] Supabase save failed:', supabaseRes.status, detail)
    }
  } catch (err) {
    console.error('[submit] Supabase request error:', err)
  }

  // Return tier ONLY. Never expose score, percentage, flags, or red_reason.
  return NextResponse.json({ tier: result.tier })
}
