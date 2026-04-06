/**
 * Shared formatting utilities for the SYZO property website.
 */

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
    // Fix missing space after period followed by capital letter (e.g. "Station.Shops")
    .replace(/\.([A-Z])/g, '. $1')
    // Collapse multiple newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Parse COHO advert HTML into structured sections.
 * Splits on <h4> section headers, removes boilerplate, and cleans up text.
 */
export function parseAdvertDescription(html: string): {
  description: string
  sections: { title: string; content: string }[]
} {
  // Boilerplate patterns to remove
  const boilerplatePatterns = [
    /call,?\s*text,?\s*(?:or\s+)?WhatsApp\s+(?:us\s+)?to\s+book\s+(?:in\s+)?a\s+viewing[^.]*\./gi,
    /(?:call|text|WhatsApp)\s+us\s+to\s+(?:be\s+added|put\s+your\s+name)[^.]*\./gi,
    /Rooms?\s+in\s+this\s+property\s+rarely\s+become\s+available[^.]*\./gi,
    /Contact\s+us\s+today\s+to\s+apply[^.]*\./gi,
    /Brought\s+to\s+the\s+market\s+by\s+SYZO[^.]*\./gi,
  ]

  // SYZO boilerplate section markers — remove everything from these to next section
  const syzoBoilerplateHeaders = [
    'Our homes provide:',
    'What Makes Our House Shares Special?',
    'What makes our house shares special?',
  ]

  // Split HTML on <h4> tags to extract named sections
  const sectionRegex = /<h4[^>]*>(.*?)<\/h4>/gi
  const sectionParts: { title: string; html: string }[] = []
  let lastIndex = 0
  let mainHtml = ''
  let match

  // Reset regex
  const allMatches: { title: string; index: number; endIndex: number }[] = []
  const tempHtml = html
  const regex = /<h4[^>]*>(.*?)<\/h4>/gi
  while ((match = regex.exec(tempHtml)) !== null) {
    allMatches.push({
      title: match[1].replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim(),
      index: match.index,
      endIndex: match.index + match[0].length,
    })
  }

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

  // Remove boilerplate lines
  for (const pattern of boilerplatePatterns) {
    desc = desc.replace(pattern, '')
  }

  // Remove SYZO boilerplate sections (from header to next empty line or end)
  for (const header of syzoBoilerplateHeaders) {
    const headerIdx = desc.indexOf(header)
    if (headerIdx !== -1) {
      // Find the end of this boilerplate block — look for a double newline or known section
      const afterHeader = desc.substring(headerIdx)
      // Remove from header through known boilerplate list items
      const endPatterns = [
        /EPC Rating/,
        /Costs:/,
        /Holding Deposit/,
        /Maximum occupancy/,
        /Pets\s*[&:]/i,
      ]
      let endIdx = desc.length
      for (const ep of endPatterns) {
        const m = afterHeader.match(ep)
        if (m && m.index !== undefined) {
          endIdx = Math.min(endIdx, headerIdx + m.index)
        }
      }
      desc = desc.substring(0, headerIdx) + desc.substring(endIdx)
    }
  }

  // Clean up excess whitespace
  desc = desc.replace(/\n{3,}/g, '\n\n').trim()

  // Process structured sections
  const sections = sectionParts.map((s) => ({
    title: s.title,
    content: stripHtml(s.html),
  })).filter((s) => s.content.length > 0)

  return { description: desc, sections }
}
