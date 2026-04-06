import Link from 'next/link'

export default function BookingConfirmedPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6 text-center">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl" style={{ color: '#2D3038' }}>
        Booking Confirmed
      </h1>
      <p className="mt-4" style={{ color: '#6B7280' }}>
        Your booking has been confirmed. We will be in touch with next steps.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center justify-center rounded-lg px-6 py-3.5 text-sm font-semibold text-white transition-colors duration-200"
        style={{ backgroundColor: '#2D3038' }}
      >
        Browse More Rooms
      </Link>
    </div>
  )
}
