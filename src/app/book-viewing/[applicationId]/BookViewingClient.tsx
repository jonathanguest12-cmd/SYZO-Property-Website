'use client'

import { useEffect, useMemo, useState } from 'react'
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
  isRebook?: boolean
}

type View = 'calendar' | 'confirming' | 'submitting' | 'confirmed'

// ---------------------------------------------------------------------------
// Date / time formatting helpers
// ---------------------------------------------------------------------------

function formatTimeLabel(timeStr: string): string {
  const [hStr, mStr] = timeStr.split(':')
  const h = Number(hStr)
  const m = Number(mStr)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`
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

function formatDayHeader(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, (m || 1) - 1, d || 1)
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function toDateKey(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

// ---------------------------------------------------------------------------
// Month calendar grid builder
// ---------------------------------------------------------------------------

interface CalendarDay {
  date: number
  key: string // YYYY-MM-DD
  inMonth: boolean
  available: boolean
  past: boolean
}

function buildMonthGrid(year: number, month: number, availableDates: Set<string>, todayKey: string): CalendarDay[] {
  const firstDay = new Date(year, month, 1)
  // Monday = 0 offset (ISO week)
  let startDow = firstDay.getDay() - 1
  if (startDow < 0) startDow = 6

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days: CalendarDay[] = []

  // Padding from previous month
  const prevMonthDays = new Date(year, month, 0).getDate()
  for (let i = startDow - 1; i >= 0; i--) {
    const d = prevMonthDays - i
    const pm = month === 0 ? 11 : month - 1
    const py = month === 0 ? year - 1 : year
    const key = toDateKey(py, pm, d)
    days.push({ date: d, key, inMonth: false, available: false, past: true })
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const key = toDateKey(year, month, d)
    days.push({
      date: d,
      key,
      inMonth: true,
      available: availableDates.has(key),
      past: key < todayKey,
    })
  }

  // Padding from next month (fill to complete last week row)
  const remaining = 7 - (days.length % 7)
  if (remaining < 7) {
    const nm = month === 11 ? 0 : month + 1
    const ny = month === 11 ? year + 1 : year
    for (let d = 1; d <= remaining; d++) {
      const key = toDateKey(ny, nm, d)
      days.push({ date: d, key, inMonth: false, available: false, past: false })
    }
  }

  return days
}

const WEEKDAY_HEADERS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function BookViewingClient({
  application,
  initialSlots,
  existingBooking,
  isRebook = false,
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

  // Group slots by date
  const slotsByDate = useMemo(() => {
    const map = new Map<string, SlotData[]>()
    for (const s of initialSlots) {
      const arr = map.get(s.slot_date) || []
      arr.push(s)
      map.set(s.slot_date, arr)
    }
    // Sort times within each date
    for (const arr of map.values()) {
      arr.sort((a, b) => a.start_time.localeCompare(b.start_time))
    }
    return map
  }, [initialSlots])

  const availableDates = useMemo(
    () => new Set(slotsByDate.keys()),
    [slotsByDate]
  )

  const sortedDates = useMemo(
    () => [...availableDates].sort(),
    [availableDates]
  )

  const firstAvailableDate = sortedDates[0] || ''

  // Mobile detection — on mobile, calendar shows first, times panel
  // appears only after a date is tapped.
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const [selectedDate, setSelectedDate] = useState<string>('')
  const [isMobileTimesVisible, setIsMobileTimesVisible] = useState(false)

  // On desktop, auto-select the first available date so the times panel
  // renders immediately. On mobile, start with nothing selected so the
  // calendar takes the full screen until the user taps a date.
  useEffect(() => {
    if (!isMobile && !selectedDate && firstAvailableDate) {
      setSelectedDate(firstAvailableDate)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, firstAvailableDate])

  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    if (firstAvailableDate) {
      const [y, m] = firstAvailableDate.split('-').map(Number)
      return new Date(y, m - 1, 1)
    }
    return new Date()
  })

  const activeDaySlots = slotsByDate.get(selectedDate) || []

  const todayKey = useMemo(() => {
    const now = new Date()
    return toDateKey(now.getFullYear(), now.getMonth(), now.getDate())
  }, [])

  const monthGrid = useMemo(
    () =>
      buildMonthGrid(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        availableDates,
        todayKey
      ),
    [currentMonth, availableDates, todayKey]
  )

  function navigateMonth(delta: number) {
    setCurrentMonth((prev) => {
      const next = new Date(prev.getFullYear(), prev.getMonth() + delta, 1)
      return next
    })
  }

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
        propertyNameLabel={application.propertyName}
      />
    )
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      {isRebook && (
        <div
          className="mb-4 mx-auto max-w-5xl rounded-xl px-4 py-3 text-sm leading-relaxed"
          style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}
        >
          Your previous viewing was cancelled. Please select a new time
          below&nbsp;&mdash; your details are already saved.
        </div>
      )}

      <div
        className={`rounded-2xl overflow-hidden ${
          view === 'confirming' || view === 'submitting'
            ? ''
            : 'bg-white border'
        }`}
        style={
          view === 'confirming' || view === 'submitting'
            ? {}
            : { borderColor: '#E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }
        }
      >
        {error && (
          <div
            className="px-6 py-3 text-sm"
            style={{ backgroundColor: '#FEF2F2', color: '#B91C1C' }}
          >
            {error}
          </div>
        )}

        {/* Confirming panel */}
        {(view === 'confirming' || view === 'submitting') && selectedSlot && (
          <div className="p-8 max-w-md mx-auto">
            <ConfirmPanel
              slot={selectedSlot}
              propertyNameLabel={application.propertyName}
              application={application}
              submitting={view === 'submitting'}
              onConfirm={handleConfirm}
              onBack={() => {
                setError(null)
                setView('calendar')
              }}
            />
          </div>
        )}

        {/* Calendar view */}
        {view === 'calendar' && sortedDates.length > 0 && (
          <div className="flex flex-col md:flex-row">
            {/* Left: Info + Calendar. On mobile, hidden when times are showing. */}
            <div
              className={`flex-1 p-6 sm:p-8 border-b md:border-b-0 md:border-r ${
                isMobile && isMobileTimesVisible ? 'hidden' : 'block'
              }`}
              style={{ borderColor: '#E5E7EB' }}
            >
              {/* Room info header */}
              <div className="mb-6">
                <h1
                  className="text-xl font-bold tracking-tight md:text-2xl"
                  style={{ color: '#2D3038' }}
                >
                  {application.propertyName}
                </h1>
                <div className="mt-3 flex flex-col gap-1.5 text-sm" style={{ color: '#6B7280' }}>
                  <div className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    30 minutes
                  </div>
                </div>
              </div>

              <p
                className="mb-5 text-sm font-semibold"
                style={{ color: '#2D3038' }}
              >
                Select a date &amp; time
              </p>

              {/* Month calendar */}
              <div>
                {/* Month header with arrows */}
                <div className="flex items-center justify-between mb-4">
                  <button
                    type="button"
                    onClick={() => navigateMonth(-1)}
                    className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                    aria-label="Previous month"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2D3038" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                  </button>
                  <span className="text-sm font-semibold" style={{ color: '#2D3038' }}>
                    {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                  </span>
                  <button
                    type="button"
                    onClick={() => navigateMonth(1)}
                    className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                    aria-label="Next month"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2D3038" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                </div>

                {/* Weekday headers */}
                <div className="grid grid-cols-7 mb-1">
                  {WEEKDAY_HEADERS.map((d) => (
                    <div
                      key={d}
                      className="text-center text-[11px] font-semibold tracking-wide py-1"
                      style={{ color: '#9CA3AF' }}
                    >
                      {d}
                    </div>
                  ))}
                </div>

                {/* Day grid */}
                <div className="grid grid-cols-7">
                  {monthGrid.map((day, i) => {
                    const isSelected = day.key === selectedDate
                    const isClickable = day.inMonth && day.available && !day.past

                    return (
                      <button
                        key={`${day.key}-${i}`}
                        type="button"
                        disabled={!isClickable}
                        onClick={() => {
                          if (isClickable) {
                            setSelectedDate(day.key)
                            if (isMobile) setIsMobileTimesVisible(true)
                          }
                        }}
                        className="flex items-center justify-center py-2"
                        style={{ minHeight: '40px' }}
                      >
                        <span
                          className="flex items-center justify-center rounded-full text-sm font-medium transition-colors"
                          style={{
                            width: '36px',
                            height: '36px',
                            backgroundColor: isSelected && isClickable
                              ? '#1C1C1A'
                              : isClickable
                              ? 'transparent'
                              : 'transparent',
                            color: isSelected && isClickable
                              ? '#FFFFFF'
                              : !day.inMonth
                              ? '#D1D5DB'
                              : day.past || !day.available
                              ? '#D1D5DB'
                              : '#2D3038',
                            cursor: isClickable ? 'pointer' : 'default',
                            fontWeight: isClickable ? 600 : 400,
                          }}
                          onMouseEnter={(e) => {
                            if (isClickable && !isSelected) {
                              e.currentTarget.style.backgroundColor = '#F3F4F6'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (isClickable && !isSelected) {
                              e.currentTarget.style.backgroundColor = 'transparent'
                            }
                          }}
                        >
                          {day.date}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <p className="mt-4 text-xs" style={{ color: '#9CA3AF' }}>
                UK, Ireland, Lisbon Time
              </p>
            </div>

            {/* Right: Time slots for selected date.
                Desktop: always visible when a date is selected.
                Mobile: hidden until user taps a date, then full-screen. */}
            {selectedDate && activeDaySlots.length > 0 && (
              <div
                className={`p-6 sm:p-8 overflow-y-auto ${
                  isMobile ? 'w-full' : 'w-72'
                } ${isMobileTimesVisible ? '' : 'hidden md:block'}`}
                style={{ maxHeight: isMobile ? 'none' : '520px' }}
              >
                {isMobile && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileTimesVisible(false)
                      setSelectedDate('')
                    }}
                    className="mb-5 flex items-center gap-1.5 text-sm cursor-pointer"
                    style={{ color: '#6B7280' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                    Back to dates
                  </button>
                )}
                <h2
                  className="text-sm font-semibold mb-4"
                  style={{ color: '#2D3038' }}
                >
                  {formatDayHeader(selectedDate)}
                </h2>
                <div className="flex flex-col gap-2">
                  {activeDaySlots.map((slot) => (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => {
                        setSelectedSlot(slot)
                        setView('confirming')
                      }}
                      className="flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-semibold text-left transition-all duration-150"
                      style={{
                        borderColor: '#E5E7EB',
                        color: '#2D3038',
                        backgroundColor: '#FFFFFF',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#1C1C1A'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#E5E7EB'
                      }}
                    >
                      <span
                        className="inline-block rounded-full shrink-0"
                        style={{
                          width: '8px',
                          height: '8px',
                          backgroundColor: '#22C55E',
                        }}
                      />
                      {formatTimeLabel(slot.start_time)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* No slots fallback */}
        {view === 'calendar' && sortedDates.length === 0 && (
          <div className="p-6 sm:p-8">
            <NoSlotsFallback application={application} />
          </div>
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

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

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
    <div
      className="rounded-2xl bg-white p-8 border"
      style={{
        borderColor: '#E5E7EB',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      }}
    >
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        disabled={submitting}
        className="mb-4 inline-flex items-center gap-1 text-xs font-medium transition-colors duration-200 hover:opacity-70 disabled:opacity-40 cursor-pointer"
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

      <dl className="mt-6 flex flex-col text-sm">
        <div className="flex justify-between gap-4 py-3 border-b" style={{ borderColor: '#F3F4F6' }}>
          <dt className="text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: '#9CA3AF' }}>Date</dt>
          <dd className="text-sm font-medium text-right" style={{ color: '#2D3038' }}>{formatLongDate(slot.slot_date)}</dd>
        </div>
        <div className="flex justify-between gap-4 py-3 border-b" style={{ borderColor: '#F3F4F6' }}>
          <dt className="text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: '#9CA3AF' }}>Time</dt>
          <dd className="text-sm font-medium text-right" style={{ color: '#2D3038' }}>{formatTimeLabel(slot.start_time)}</dd>
        </div>
        <div className="flex justify-between gap-4 py-3">
          <dt className="text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: '#9CA3AF' }}>Property</dt>
          <dd className="text-sm font-medium text-right" style={{ color: '#2D3038' }}>{propertyNameLabel}</dd>
        </div>
      </dl>

      <div
        className="mt-6 rounded-xl border p-4"
        style={{ borderColor: '#E5E7EB', backgroundColor: '#FFFFFF' }}
      >
        <p
          className="text-xs font-semibold uppercase tracking-[0.08em] mb-2"
          style={{ color: '#9CA3AF' }}
        >
          Your details
        </p>
        <p className="text-sm font-medium" style={{ color: '#2D3038' }}>
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
        className="mt-8 w-full inline-flex items-center justify-center rounded-full px-8 py-3.5 text-sm font-semibold text-white transition-colors duration-200 hover:opacity-90 disabled:opacity-60 cursor-pointer"
        style={{ backgroundColor: '#2D3038' }}
      >
        {submitting ? 'Booking\u2026' : 'Confirm Viewing'}
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
