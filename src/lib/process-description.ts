import Anthropic from '@anthropic-ai/sdk'
import { stripHtml } from './format'

// Simple in-memory cache (resets on server restart, which is fine)
const cache = new Map<string, ProcessedDescription>()

export interface ProcessedDescription {
  property_overview: string | null
  room_description: string | null
  whats_included: string[]
  local_area: {
    shops: string | null
    transport: string | null
    healthcare: string | null
    leisure: string | null
  }
  deposit_info: string | null
}

export async function processDescription(
  roomId: string,
  rawHtml: string,
  context: { address: string; city: string; rent: number; billsIncluded: boolean }
): Promise<ProcessedDescription | null> {
  // Check cache first
  if (cache.has(roomId)) return cache.get(roomId)!

  // Skip if no API key or no description
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || !rawHtml) return null

  const rawText = stripHtml(rawHtml)
  if (rawText.length < 30) return null

  try {
    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `Process this property listing for a premium shared living website.

Room context:
- Address: ${context.address}
- City: ${context.city}
- Rent: £${context.rent} pcm
- Bills included: ${context.billsIncluded}

Raw description:
${rawText}

Return ONLY valid JSON with this structure:
{
  "property_overview": "2-3 clean sentences about the property. Professional tone. No SpareRoom marketing. No contradictions with bills status above.",
  "room_description": "1-2 sentences about THIS specific room if info exists, otherwise null.",
  "whats_included": ["Array of truthful inclusions. If bills NOT included, do NOT say bills included. Examples: 'Superfast WiFi', 'Professional cleaning', 'Fully furnished'"],
  "local_area": {
    "shops": "Nearby shops or null",
    "transport": "Nearby stations/airports or null",
    "healthcare": "Nearby hospitals/doctors or null",
    "leisure": "Nearby entertainment or null"
  },
  "deposit_info": "Deposit details or null"
}

Rules:
- Remove ALL marketing: "Don't miss out!", "Contact us today", "Rooms go quickly"
- Remove ALL SpareRoom text: "call, text or WhatsApp", "book a viewing", "put your name on a waiting list", "Contact us to apply"
- Remove EPC ratings
- Fix grammar and punctuation
- Do NOT contradict bills_included status
- Return ONLY valid JSON, no markdown, no preamble`
      }]
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    // Strip any markdown code fences
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim()
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    const parsed = JSON.parse(jsonMatch[0])
    const result: ProcessedDescription = {
      property_overview: parsed.property_overview || null,
      room_description: parsed.room_description || null,
      whats_included: Array.isArray(parsed.whats_included) ? parsed.whats_included : [],
      local_area: {
        shops: parsed.local_area?.shops || null,
        transport: parsed.local_area?.transport || null,
        healthcare: parsed.local_area?.healthcare || null,
        leisure: parsed.local_area?.leisure || null,
      },
      deposit_info: parsed.deposit_info || null,
    }

    cache.set(roomId, result)
    return result
  } catch (error) {
    console.error('Description processing failed for room', roomId, error instanceof Error ? error.message : error)
    return null
  }
}
