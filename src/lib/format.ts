/**
 * Shared formatting utilities for the SYZO property website.
 */

/**
 * Display name for a property, disambiguated when multiple properties share
 * the same road. Used by the room detail page, the property detail page,
 * and the RoomCard / PropertyCard components so every surface renders the
 * same string for the same underlying property.
 *
 *   single on the road   → "Radnor Place"
 *   multiple on the road → "Property 1, Radnor Place" / "Property 2, Radnor Place"
 *
 * The caller must pass the full list of property names from Supabase
 * (fetchAllPropertyNames) — not a subset derived from currently-loaded
 * rooms — otherwise the numbering will drift when filters hide siblings.
 */
export function buildPropertyDisplayName(
  propertyName: string,
  allPropertyNames: string[],
): string {
  const stripped = propertyName.replace(/^\d+[-\s]+/, '').trim()
  const siblings = allPropertyNames.filter(
    (p) => p.replace(/^\d+[-\s]+/, '').trim() === stripped
  )
  if (siblings.length <= 1) return stripped
  const sorted = [...siblings].sort()
  const index = sorted.indexOf(propertyName)
  return `Property ${index + 1}, ${stripped}`
}

export function formatAvailableFrom(value: string | null | undefined): string {
  if (!value) return 'Available Now'
  const lower = value.toLowerCase()
  if (lower.includes('available now') || lower.includes('it is available')) {
    return 'Available Now'
  }
  const date = new Date(value)
  if (!isNaN(date.getTime())) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (date <= today) return 'Available Now'
    return `Available from ${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
  }
  return value.replace(/!/g, '').trim()
}

export function isAvailableNow(value: string | null | undefined): boolean {
  return formatAvailableFrom(value) === 'Available Now'
}

export function roomTypeLabel(roomType: string): string {
  if (roomType === 'doubleRoom') return 'Double Room'
  if (roomType === 'singleRoom') return 'Single Room'
  return 'Room'
}

export function stripHtml(html: string): string {
  return html
    // Insert newlines before block elements so paragraph text doesn't concatenate
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n')
    .replace(/<\/?(?:p|div|br|h[1-6]|li|ul|ol)[^>]*>/gi, '\n')
    // Strip remaining tags
    .replace(/<[^>]*>/g, '')
    // Decode entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    // Fix missing space after period followed by capital letter
    .replace(/\.([A-Z])/g, '. $1')
    // Collapse multiple newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Illustration/drawing detection for first property photo */
const ILLUSTRATION_PATTERNS = /chatgpt|drawing|clip2comic|cartoon|sketch|illustration|thumbnail|ai.?generat/i

export function isIllustrationPhoto(title: string): boolean {
  return ILLUSTRATION_PATTERNS.test(title)
}

export interface ParsedDescription {
  description: string
  whatsIncluded: string[]
  depositInfo: string
  sections: { title: string; content: string }[]
}

/**
 * Parse COHO advert HTML into structured sections.
 */
export function parseAdvertDescription(html: string): ParsedDescription {
  // Boilerplate patterns to remove
  const boilerplatePatterns = [
    /call,?\s*text,?\s*(?:or\s+)?WhatsApp\s+(?:us\s+)?to\s+book\s+(?:in\s+)?a\s+viewing[^.]*\./gi,
    /(?:call|text|WhatsApp)\s+us\s+to\s+(?:be\s+added|put\s+your\s+name)[^.]*\./gi,
    /Rooms?\s+in\s+this\s+property\s+rarely\s+become\s+available[^.]*\./gi,
    /Contact\s+us\s+today\s+to\s+apply[^.]*\./gi,
    /Brought\s+to\s+the\s+market\s+by\s+SYZO[^.]*\./gi,
  ]

  // Split HTML on <h4> tags to extract named sections
  const allMatches: { title: string; index: number; endIndex: number }[] = []
  const regex = /<h4[^>]*>(.*?)<\/h4>/gi
  let match
  while ((match = regex.exec(html)) !== null) {
    allMatches.push({
      title: match[1].replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim(),
      index: match.index,
      endIndex: match.index + match[0].length,
    })
  }

  let mainHtml = ''
  const sectionParts: { title: string; html: string }[] = []

  if (allMatches.length === 0) {
    mainHtml = html
  } else {
    mainHtml = html.substring(0, allMatches[0].index)
    for (let i = 0; i < allMatches.length; i++) {
      const start = allMatches[i].endIndex
      const end = i + 1 < allMatches.length ? allMatches[i + 1].index : html.length
      sectionParts.push({
        title: allMatches[i].title,
        html: html.substring(start, end),
      })
    }
  }

  // Process main description
  let desc = stripHtml(mainHtml)

  // Remove boilerplate
  for (const pattern of boilerplatePatterns) {
    desc = desc.replace(pattern, '')
  }

  // Extract "What's Included" bullet items
  const whatsIncluded: string[] = []
  const includesHeaders = [
    'Our homes provide:',
    'What Makes Our House Shares Special?',
    'What makes our house shares special?',
  ]

  for (const header of includesHeaders) {
    const headerIdx = desc.indexOf(header)
    if (headerIdx === -1) continue

    const afterHeader = desc.substring(headerIdx + header.length)
    // Collect lines until we hit a known section boundary
    const endPatterns = [/EPC Rat/i, /Costs:/i, /Holding Deposit/i, /Maximum occupancy/i, /Pets\s*[&:]/i, /Tenancy Deposit/i]
    let endOffset = afterHeader.length
    for (const ep of endPatterns) {
      const m = afterHeader.match(ep)
      if (m?.index !== undefined) endOffset = Math.min(endOffset, m.index)
    }

    const block = afterHeader.substring(0, endOffset)
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
    for (const line of lines) {
      const clean = line.replace(/^[-~\u2022\u2013]\s*/, '').trim()
      if (clean && clean.length > 5 && !clean.endsWith(':')) {
        whatsIncluded.push(clean)
      }
    }

    // Remove from desc: header + extracted block
    desc = desc.substring(0, headerIdx) + desc.substring(headerIdx + header.length + endOffset)
  }

  // Extract deposit info
  let depositInfo = ''
  const depositMatch = desc.match(/(Holding [Dd]eposit:[\s\S]*?)(?=\n\n|$)/)
  if (depositMatch) {
    // Grab from "Holding Deposit" through "Tenancy Deposit" section
    const startIdx = desc.indexOf(depositMatch[0])
    const remaining = desc.substring(startIdx)
    // Find a good cutoff - end of deposit info
    const cutPatterns = [/\n\n(?!.*[Dd]eposit)/]
    let endIdx = remaining.length
    // Just take everything from Holding Deposit to end of description (it's usually at the end)
    depositInfo = remaining.trim()
    desc = desc.substring(0, startIdx).trim()
  }

  // Remove EPC Rating lines, Costs: header, and leftover boilerplate
  desc = desc.replace(/EPC\s+Rating?:?\s*\w*/gi, '')
  desc = desc.replace(/\bCosts:\s*/gi, '')
  desc = desc.replace(/Maximum occupancy:[^\n]*/gi, '')
  desc = desc.replace(/Pets\s*&\s*children:[^\n]*/gi, '')

  // Clean up
  desc = desc.replace(/\n{3,}/g, '\n\n').trim()
  depositInfo = depositInfo.replace(/\n{3,}/g, '\n\n').trim()
  // Remove EPC from deposit info too
  depositInfo = depositInfo.replace(/EPC\s+Rating?:?\s*\w*/gi, '').replace(/\n{3,}/g, '\n\n').trim()

  // Process h4 sections
  const sections = sectionParts.map((s) => ({
    title: s.title,
    content: stripHtml(s.html),
  })).filter((s) => s.content.length > 0)

  return { description: desc, whatsIncluded, depositInfo, sections }
}
