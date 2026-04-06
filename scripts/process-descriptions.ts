/**
 * Process COHO property descriptions into standardised format using Claude API.
 * Run: npx tsx scripts/process-descriptions.ts
 *
 * Requires ANTHROPIC_API_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY?.replace(/^<|>$/g, '') // strip angle brackets if present

if (!ANTHROPIC_KEY || ANTHROPIC_KEY.includes('your-key') || ANTHROPIC_KEY.length < 20) {
  console.error('ERROR: Set ANTHROPIC_API_KEY in .env.local before running this script.')
  console.error('Get your key from https://console.anthropic.com/settings/keys')
  process.exit(1)
}

const CACHE_PATH = path.resolve(process.cwd(), 'src/data/processed-descriptions.json')

interface ProcessedDescription {
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
  processed_at: string
}

type Cache = Record<string, ProcessedDescription>

function loadCache(): Cache {
  try {
    if (fs.existsSync(CACHE_PATH)) {
      return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'))
    }
  } catch {
    console.warn('Warning: Could not read cache, starting fresh.')
  }
  return {}
}

function saveCache(cache: Cache) {
  fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true })
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2))
}

function stripHtml(html: string): string {
  return html
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n')
    .replace(/<\/?(?:p|div|br|h[1-6]|li|ul|ol)[^>]*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\.([A-Z])/g, '. $1')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function processRoom(
  client: Anthropic,
  room: {
    id: string
    name: string
    rent_pcm: number
    bills_included: boolean
    room_type: string
    additional_info: Record<string, any>
  }
): Promise<ProcessedDescription | null> {
  const rawHtml = room.additional_info?.advertDescription
  if (!rawHtml) return null

  const rawText = stripHtml(rawHtml)
  if (rawText.length < 30) return null

  const prop = room.additional_info?.property ?? {}
  const address = prop.name ?? ''
  const city = prop.majorAreaReference ?? ''
  const roomType = room.room_type === 'doubleRoom' ? 'Double Room' : room.room_type === 'singleRoom' ? 'Single Room' : 'Room'

  const prompt = `You are processing a property listing description for a premium shared living website.
The raw text was written for SpareRoom classified ads and needs to be cleaned up for a professional property website.

Room context:
- Address: ${address}
- City: ${city}
- Rent: £${Math.round(room.rent_pcm)} pcm
- Bills included: ${room.bills_included}
- Room type: ${roomType}

Raw description:
${rawText}

Rewrite this into a standardised JSON format with these sections. Only include sections where you have real information — do NOT invent data:

{
  "property_overview": "2-3 sentences about the property. Location, type of house, what makes it appealing. Written in third person, professional tone. Remove any SpareRoom marketing copy, calls to action, or references to contacting/calling/texting. Remove any contradictions with the room context above (e.g. if bills_included is false, do NOT say bills are included).",

  "room_description": "1-2 sentences specifically about THIS room — what furniture it has, any special features. If no room-specific info exists, set to null.",

  "whats_included": ["Array of strings — specific inclusions like 'All bills included', 'Superfast WiFi', 'Fortnightly professional cleaning', 'Fully furnished'. Only include items that are TRUE based on the room context. If bills_included is false, do NOT include 'All bills included'. Extract real items from the description, don't invent."],

  "local_area": {
    "shops": "Brief info about nearby shops/supermarkets. Null if not mentioned.",
    "transport": "Brief info about nearby stations/airports. Null if not mentioned.",
    "healthcare": "Brief info about nearby hospitals/doctors. Null if not mentioned.",
    "leisure": "Brief info about nearby leisure/entertainment. Null if not mentioned."
  },

  "deposit_info": "Brief info about holding deposit and tenancy deposit. Null if not mentioned."
}

Rules:
- Remove ALL marketing copy: "Don't miss out!", "Contact us today", "Rooms go quickly", "Our homes provide"
- Remove ALL SpareRoom-specific text: "call, text or WhatsApp", "book a viewing", "put your name on a waiting list"
- Remove EPC ratings
- Fix grammar and punctuation
- Write in a professional, warm but not pushy tone
- Do NOT contradict the room context data (especially bills_included)
- Keep it concise
- Return ONLY valid JSON, no markdown, no preamble`

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    // Extract JSON from response (handle potential markdown wrapping)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.warn(`  Warning: No JSON found in response for room ${room.id}`)
      return null
    }

    const parsed = JSON.parse(jsonMatch[0])
    return {
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
      processed_at: new Date().toISOString(),
    }
  } catch (err: any) {
    console.warn(`  Warning: API error for room ${room.id}: ${err.message}`)
    return null
  }
}

async function main() {
  console.log('Loading rooms from Supabase...')
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY)
  const { data: rooms, error } = await sb
    .from('rooms')
    .select('id, name, rent_pcm, bills_included, room_type, additional_info')
    .not('available_from', 'is', null)

  if (error) {
    console.error('Supabase error:', error.message)
    process.exit(1)
  }

  if (!rooms || rooms.length === 0) {
    console.log('No rooms found.')
    process.exit(0)
  }

  // Filter to rooms with descriptions
  const roomsWithDesc = rooms.filter((r: any) => r.additional_info?.advertDescription)
  console.log(`Found ${roomsWithDesc.length} rooms with descriptions (${rooms.length} total).`)

  const cache = loadCache()
  const client = new Anthropic({ apiKey: ANTHROPIC_KEY })

  let processed = 0
  let skipped = 0

  for (let i = 0; i < roomsWithDesc.length; i++) {
    const room = roomsWithDesc[i]
    const propName = room.additional_info?.property?.name ?? room.name

    // Skip if already cached
    if (cache[room.id]) {
      skipped++
      continue
    }

    console.log(`Processing room ${i + 1}/${roomsWithDesc.length}: ${propName} (${room.id.slice(0, 8)})...`)

    // Try up to 2 times
    let result = await processRoom(client, room as any)
    if (!result) {
      console.log('  Retrying...')
      await new Promise((r) => setTimeout(r, 2000))
      result = await processRoom(client, room as any)
    }

    if (result) {
      cache[room.id] = result
      saveCache(cache)
      processed++
      console.log('  Done.')
    } else {
      console.log('  Skipped (no result after retry).')
    }

    // Rate limiting — small delay between API calls
    await new Promise((r) => setTimeout(r, 500))
  }

  console.log(`\nFinished. Processed: ${processed}, Skipped (cached): ${skipped}, Total in cache: ${Object.keys(cache).length}`)
  console.log(`Cache saved to: ${CACHE_PATH}`)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
