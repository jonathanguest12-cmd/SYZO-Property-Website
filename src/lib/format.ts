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
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
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
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim()
}
