import Anthropic from '@anthropic-ai/sdk'
import { stripHtml } from './format'

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
  context: {
    address: string
    city: string
    rent: number
    billsIncluded: boolean
    roomName: string
    roomType: string
  }
): Promise<ProcessedDescription | null> {
  if (cache.has(roomId)) return cache.get(roomId)!

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

You are writing about ${context.roomName} ONLY at ${context.address}, ${context.city}.

Room context:
- Room: ${context.roomName}
- Room type: ${context.roomType}
- Address: ${context.address}
- City: ${context.city}
- Rent: £${context.rent} pcm
- Bills included: ${context.billsIncluded}

Raw description:
${rawText}

Return ONLY valid JSON:
{
  "property_overview": "2-3 clean sentences about the property. Professional tone. No SpareRoom marketing.",
  "room_description": "2-3 sentences about ${context.roomName} specifically. If the raw text mentions this room, extract that info. If it mentions OTHER rooms at this property, IGNORE those completely. If no specific info about this room exists, write a brief description based on it being a ${context.roomType} in this property. NEVER leave this as just one short sentence.",
  "whats_included": ["Array of truthful inclusions. If bills_included is ${context.billsIncluded ? 'true' : 'false'}, ${context.billsIncluded ? 'you may include bills-related items' : 'do NOT say bills are included'}. Examples: 'Superfast WiFi', 'Professional cleaning', 'Fully furnished'"],
  "local_area": {
    "shops": "Nearby shops or null",
    "transport": "Nearby stations or null",
    "healthcare": "Nearby hospitals/doctors or null",
    "leisure": "Nearby entertainment or null"
  },
  "deposit_info": "Deposit details or null"
}

Rules:
- You are writing about ${context.roomName} ONLY. Ignore info about other rooms.
- NEVER alter, infer, or contradict any factual room data (rent, deposit, bills status).
- Remove ALL marketing copy and SpareRoom text (call/text/WhatsApp, book a viewing, waiting list, contact us).
- Remove EPC ratings.
- room_description must be 2-3 sentences minimum.
- Return ONLY valid JSON, no markdown, no preamble.`
      }]
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
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
