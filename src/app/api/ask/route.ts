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
    // Silently fail — don't break the chat
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

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: systemPrompt,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    })

    const content =
      response.content[0].type === 'text'
        ? response.content[0].text
        : "Sorry, I couldn't generate a response. Please try again."

    const messageCount = messages.filter(
      (m: { role: string }) => m.role === 'user'
    ).length
    logSession(
      sessionId,
      roomId,
      propertyRef,
      roomName,
      propertyName,
      messages,
      messageCount
    )

    return NextResponse.json({ content, remaining })
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
