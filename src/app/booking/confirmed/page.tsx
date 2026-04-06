import Link from 'next/link'

export default function BookingConfirmedPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6 text-center">
      <h1 className="text-2xl font-bold text-gray-900">Booking Confirmed</h1>
      <p className="mt-4 text-gray-600">
        Your booking has been confirmed. We will be in touch with next steps.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center justify-center rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-700"
      >
        Browse More Rooms
      </Link>
    </div>
  )
}
