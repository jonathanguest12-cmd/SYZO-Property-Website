import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '1h'),
  analytics: true,
})

const SUPABASE_URL = 'https://mtrrxtwisgftkqujfqlr.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY_PARROT || ''

const AVAILABILITY_KEYWORDS = [
  'available', 'availability', 'when can i move', 'move in',
  'still free', 'still available', 'vacant', 'taken',
  'when is it', 'how soon', 'start date', 'move date',
]

function isAvailabilityQuestion(message: string): boolean {
  const lower = message.toLowerCase()
  return AVAILABILITY_KEYWORDS.some((kw) => lower.includes(kw))
}

async function getLiveAvailability(roomId: string | null): Promise<string | null> {
  if (!roomId) return null
  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL
    const key = SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

    const res = await fetch(
      `${supabaseUrl}/rest/v1/rooms?select=available_from&id=eq.${roomId}`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
        cache: 'no-store',
      }
    )

    if (!res.ok) return null
    const data = await res.json()
    if (!data?.[0]) return null

    const availableFrom = data[0].available_from
    if (!availableFrom) return 'not currently available'

    const date = new Date(availableFrom)
    const now = new Date()

    if (date <= now) {
      return 'available now'
    }
    return `available from ${date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })}`
  } catch {
    return null
  }
}

async function logSession(
  sessionId: string,
  roomId: string | null,
  propertyRef: string | null,
  roomName: string,
  propertyName: string,
  messages: object[],
  messageCount: number
) {
  if (!SUPABASE_KEY) return
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/chatbot_sessions?id=eq.${sessionId}`,
      {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          messages,
          message_count: messageCount,
          updated_at: new Date().toISOString(),
        }),
      }
    ).catch(() => null)

    if (!res || res.status === 404 || messageCount === 1) {
      await fetch(`${SUPABASE_URL}/rest/v1/chatbot_sessions`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          id: sessionId,
          room_id: roomId,
          property_ref: propertyRef,
          room_name: roomName,
          property_name: propertyName,
          messages,
          message_count: messageCount,
        }),
      }).catch(() => null)
    }
  } catch {
    // Silently fail
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      messages,
      systemPrompt,
      sessionId,
      roomId,
      propertyRef,
      roomName,
      propertyName,
    } = body

    const identifier = `chatbot:${sessionId}`
    const { success, remaining } = await ratelimit.limit(identifier)

    if (!success) {
      return NextResponse.json(
        {
          content:
            "You've reached the message limit for this session. Please click Apply to Rent to speak directly with our lettings team.",
          rateLimited: true,
        },
        { status: 429 }
      )
    }

    const lastUserMessage =
      messages[messages.length - 1]?.content || ''

    // Enrich system prompt with live availability if relevant
    let enrichedSystemPrompt = systemPrompt
    if (isAvailabilityQuestion(lastUserMessage) && roomId) {
      const liveAvailability = await getLiveAvailability(roomId)
      if (liveAvailability) {
        enrichedSystemPrompt = systemPrompt.replace(
          /AVAILABILITY:.*$/m,
          `AVAILABILITY: ${liveAvailability}`
        )
      }
    }

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: enrichedSystemPrompt,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    })

    const content =
      response.content[0].type === 'text'
        ? response.content[0].text
        : "Sorry, I couldn't generate a response. Please try again."

    // Generate follow-up suggestions (non-blocking, best-effort)
    const userMessageCount = messages.filter(
      (m: { role: string }) => m.role === 'user'
    ).length

    let followUps: string[] = []
    if (userMessageCount === 1) {
      try {
        const followUpRes = await client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 100,
          system:
            'You generate short follow-up questions a property tenant might ask. Return exactly 3 questions as a JSON array of strings. No other text.',
          messages: [
            {
              role: 'user',
              content: `The user asked: "${lastUserMessage}"
Claude answered: "${content}"
Context: ${systemPrompt.slice(0, 500)}

Generate 3 short follow-up questions they might want to ask next. Keep each under 8 words. Return as JSON array only.`,
            },
          ],
        })

        const followUpText =
          followUpRes.content[0].type === 'text'
            ? followUpRes.content[0].text.trim()
            : '[]'
        const clean = followUpText
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim()
        followUps = JSON.parse(clean)
        if (!Array.isArray(followUps)) followUps = []
        followUps = followUps.slice(0, 3)
      } catch {
        followUps = []
      }
    }

    // Log session (non-blocking)
    logSession(
      sessionId,
      roomId,
      propertyRef,
      roomName,
      propertyName,
      messages,
      userMessageCount
    )

    return NextResponse.json({ content, remaining, followUps })
  } catch (err) {
    console.error('Ask API error:', err)
    return NextResponse.json(
      {
        content:
          "Sorry, I'm having trouble right now. Please click Apply to Rent to speak with our team.",
      },
      { status: 500 }
    )
  }
}
