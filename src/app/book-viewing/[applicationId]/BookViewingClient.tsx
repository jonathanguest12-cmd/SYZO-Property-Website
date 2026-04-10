'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export interface ApplicationData {
  id: string
  propertyName: string
  fullName: string
  email: string
  phone: string
}

export interface SlotData {
  id: string
  slot_date: string // YYYY-MM-DD
  start_time: string // HH:MM:SS
  property_name: string
}

interface Props {
  application: ApplicationData
  initialSlots: SlotData[]
  existingBooking: SlotData | null
}

type View = 'calendar' | 'confirming' | 'submitting' | 'confirmed'

function stripHouseNumber(name: string): string {
  return name.replace(/^\d+[-\s]+/, '').trim()
}

function formatDayLabel(dateStr: string): string {
  // dateStr is YYYY-MM-DD. Parse as local date to avoid UTC-rollback on e.g. 13 Apr.
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, (m || 1) - 1, d || 1)
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function formatTimeLabel(timeStr: string): string {
  // timeStr is HH:MM:SS.
  const [hStr, mStr] = timeStr.split(':')
  const h = Number(hStr)
  const m = Number(mStr)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  const mm = m.toString().padStart(2, '0')
  return `${hour12}:${mm} ${period}`
}

function formatLongDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, (m || 1) - 1, d || 1)
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

interface DayGroup {
  date: string
  label: string
  slots: SlotData[]
}

function groupByDay(slots: SlotData[]): DayGroup[] {
  const map = new Map<string, SlotData[]>()
  for (const s of slots) {
    const arr = map.get(s.slot_date) || []
    arr.push(s)
    map.set(s.slot_date, arr)
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, arr]) => ({
      date,
      label: formatDayLabel(date),
      slots: arr.sort((a, b) => a.start_time.localeCompare(b.start_time)),
    }))
}

export default function BookViewingClient({
  application,
  initialSlots,
  existingBooking,
}: Props) {
  const router = useRouter()
  const [view, setView] = useState<View>(
    existingBooking ? 'confirmed' : 'calendar'
  )
  const [selectedSlot, setSelectedSlot] = useState<SlotData | null>(null)
  const [confirmedSlot, setConfirmedSlot] = useState<SlotData | null>(
    existingBooking
  )
  const [error, setError] = useState<string | null>(null)

  const dayGroups = useMemo(() => groupByDay(initialSlots), [initialSlots])
  const cleanProperty = stripHouseNumber(application.propertyName)

  async function handleConfirm() {
    if (!selectedSlot) return
    setError(null)
    setView('submitting')

    try {
      const res = await fetch('/api/book-viewing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: application.id,
          slotId: selectedSlot.id,
        }),
      })
      const data = await res.json().catch(() => ({}))

      if (res.status === 429 || data?.error === 'rate_limited') {
        setError(
          'Too many booking attempts. Please wait a few minutes and try again.'
        )
        setView('confirming')
        return
      }

      if (data?.success === true && data?.slot) {
        setConfirmedSlot(data.slot as SlotData)
        setView('confirmed')
        return
      }

      if (data?.error === 'slot_taken') {
        setError('Sorry, this slot was just taken. Please choose another time.')
        setSelectedSlot(null)
        setView('calendar')
        router.refresh()
        return
      }

      if (data?.error === 'already_booked' && data?.slot) {
        setConfirmedSlot(data.slot as SlotData)
        setView('confirmed')
        return
      }

      setError('Booking failed. Please try again.')
      setView('confirming')
    } catch {
      setError('Booking failed. Please try again.')
      setView('confirming')
    }
  }

  // ----- Confirmed view -----
  if (view === 'confirmed' && confirmedSlot) {
    return (
      <ConfirmedView
        slot={confirmedSlot}
        propertyNameLabel={cleanProperty}
      />
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      {/* Header */}
      <div className="mb-6">
        <p
          className="text-xs font-semibold uppercase tracking-[0.08em]"
          style={{ color: '#9CA3AF' }}
        >
          Book a viewing
        </p>
        <h1
          className="mt-2 text-2xl font-bold tracking-tight md:text-3xl"
          style={{ color: '#2D3038' }}
        >
          {cleanProperty}
        </h1>
      </div>

      <div
        className="rounded-2xl bg-white p-6 sm:p-8 border"
        style={{
          borderColor: '#E5E7EB',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}
      >
        {error && (
          <div
            className="mb-6 rounded-lg px-4 py-3 text-sm"
            style={{ backgroundColor: '#FEF2F2', color: '#B91C1C' }}
          >
            {error}
          </div>
        )}

        {/* Confirming panel */}
        {(view === 'confirming' || view === 'submitting') && selectedSlot && (
          <ConfirmPanel
            slot={selectedSlot}
            propertyNameLabel={cleanProperty}
            application={application}
            submitting={view === 'submitting'}
            onConfirm={handleConfirm}
            onBack={() => {
              setError(null)
              setView('calendar')
            }}
          />
        )}

        {/* Calendar view */}
        {view === 'calendar' && dayGroups.length > 0 && (
          <div>
            <p
              className="mb-6 text-sm leading-relaxed"
              style={{ color: '#6B7280' }}
            >
              Choose a time that works for you. Viewings last 15 minutes.
            </p>
            <div className="flex flex-col gap-6">
              {dayGroups.map((day) => (
                <DayCard
                  key={day.date}
                  day={day}
                  onPick={(slot) => {
                    setSelectedSlot(slot)
                    setView('confirming')
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* No slots fallback */}
        {view === 'calendar' && dayGroups.length === 0 && (
          <NoSlotsFallback application={application} />
        )}
      </div>

      <div className="mt-6 text-center">
        <Link
          href="/"
          className="text-sm font-medium transition-colors duration-200 hover:opacity-70"
          style={{ color: '#9CA3AF' }}
        >
          &larr; Back to rooms
        </Link>
      </div>
    </div>
  )
}

function DayCard({
  day,
  onPick,
}: {
  day: DayGroup
  onPick: (slot: SlotData) => void
}) {
  return (
    <div>
      <h2
        className="mb-3 text-sm font-semibold"
        style={{ color: '#2D3038' }}
      >
        {day.label}
      </h2>
      <div className="flex flex-wrap gap-2">
        {day.slots.map((slot) => (
          <button
            key={slot.id}
            type="button"
            onClick={() => onPick(slot)}
            className="rounded-full border px-4 py-2 text-sm font-medium transition-all duration-150 hover:border-current hover:shadow-sm"
            style={{
              borderColor: '#E5E7EB',
              color: '#2D3038',
              backgroundColor: '#FFFFFF',
            }}
          >
            {formatTimeLabel(slot.start_time)}
          </button>
        ))}
      </div>
    </div>
  )
}

function ConfirmPanel({
  slot,
  propertyNameLabel,
  application,
  submitting,
  onConfirm,
  onBack,
}: {
  slot: SlotData
  propertyNameLabel: string
  application: ApplicationData
  submitting: boolean
  onConfirm: () => void
  onBack: () => void
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        disabled={submitting}
        className="mb-4 inline-flex items-center gap-1 text-xs font-medium transition-colors duration-200 hover:opacity-70 disabled:opacity-40"
        style={{ color: '#9CA3AF' }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back
      </button>

      <h2
        className="text-xl font-semibold tracking-tight md:text-2xl"
        style={{ color: '#2D3038' }}
      >
        Confirm your viewing
      </h2>

      <dl className="mt-6 flex flex-col gap-4 text-sm">
        <Row label="Date">{formatLongDate(slot.slot_date)}</Row>
        <Row label="Time">{formatTimeLabel(slot.start_time)}</Row>
        <Row label="Property">{propertyNameLabel}</Row>
      </dl>

      <div
        className="mt-6 rounded-xl border p-4"
        style={{ borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' }}
      >
        <p
          className="text-xs font-semibold uppercase tracking-[0.08em] mb-2"
          style={{ color: '#6B7280' }}
        >
          Your details
        </p>
        <p className="text-sm" style={{ color: '#2D3038' }}>
          {application.fullName}
        </p>
        <p className="text-sm" style={{ color: '#6B7280' }}>
          {application.email}
        </p>
        <p className="text-sm" style={{ color: '#6B7280' }}>
          {application.phone}
        </p>
      </div>

      <button
        type="button"
        onClick={onConfirm}
        disabled={submitting}
        className="mt-8 w-full inline-flex items-center justify-center rounded-full px-8 py-3.5 text-sm font-semibold text-white transition-colors duration-200 hover:opacity-90 disabled:opacity-60"
        style={{ backgroundColor: '#2D3038' }}
      >
        {submitting ? 'Booking\u2026' : 'Confirm Booking'}
      </button>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt
        className="text-xs font-semibold uppercase tracking-[0.08em]"
        style={{ color: '#6B7280' }}
      >
        {label}
      </dt>
      <dd
        className="text-sm text-right"
        style={{ color: '#2D3038' }}
      >
        {children}
      </dd>
    </div>
  )
}

function ConfirmedView({
  slot,
  propertyNameLabel,
}: {
  slot: SlotData
  propertyNameLabel: string
}) {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
      <div
        className="rounded-2xl bg-white p-8 sm:p-12 border"
        style={{
          borderColor: '#E5E7EB',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}
      >
        <div
          className="mx-auto flex items-center justify-center rounded-full"
          style={{ width: 72, height: 72, backgroundColor: '#DCFCE7' }}
        >
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#15803D"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h1
          className="mt-6 text-2xl font-bold tracking-tight md:text-3xl text-center"
          style={{ color: '#2D3038' }}
        >
          Your viewing is confirmed.
        </h1>

        <dl className="mt-8 flex flex-col gap-4 text-sm mx-auto max-w-sm">
          <Row label="Date">{formatLongDate(slot.slot_date)}</Row>
          <Row label="Time">{formatTimeLabel(slot.start_time)}</Row>
          <Row label="Property">{propertyNameLabel}</Row>
        </dl>

        <p
          className="mt-8 text-sm leading-relaxed text-center mx-auto max-w-md"
          style={{ color: '#6B7280' }}
        >
          You&rsquo;ll receive a WhatsApp message 24 hours before to confirm
          your availability. Please reply to lock in your viewing.
        </p>

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full px-8 py-3.5 text-sm font-semibold text-white transition-colors duration-200 hover:opacity-90"
            style={{ backgroundColor: '#2D3038' }}
          >
            Back to rooms
          </Link>
        </div>
      </div>
    </div>
  )
}

function NoSlotsFallback({ application }: { application: ApplicationData }) {
  return (
    <div>
      <h2
        className="text-xl font-semibold tracking-tight"
        style={{ color: '#2D3038' }}
      >
        No viewing slots available
      </h2>
      <p
        className="mt-3 text-sm leading-relaxed"
        style={{ color: '#6B7280' }}
      >
        No viewing slots are currently available. We&rsquo;ll be in touch when a
        slot opens up using the details from your application.
      </p>
      <div
        className="mt-6 rounded-xl border p-4"
        style={{ borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' }}
      >
        <p
          className="text-xs font-semibold uppercase tracking-[0.08em] mb-2"
          style={{ color: '#6B7280' }}
        >
          Your details
        </p>
        <p className="text-sm" style={{ color: '#2D3038' }}>
          {application.fullName}
        </p>
        <p className="text-sm" style={{ color: '#6B7280' }}>
          {application.email}
        </p>
        <p className="text-sm" style={{ color: '#6B7280' }}>
          {application.phone}
        </p>
      </div>
    </div>
  )
}
