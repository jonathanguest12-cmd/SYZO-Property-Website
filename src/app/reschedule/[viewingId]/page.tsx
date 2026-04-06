import Link from 'next/link'

export default async function ReschedulePage({
  params,
}: {
  params: Promise<{ viewingId: string }>
}) {
  const { viewingId } = await params

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6 text-center">
      <h1
        className="text-3xl font-normal"
        style={{ color: '#1a1a2e', fontFamily: 'var(--font-display)' }}
      >
        Reschedule Viewing
      </h1>
      <p className="mt-4" style={{ color: '#6b7280' }}>
        Viewing reference: {viewingId}
      </p>
      <div
        className="mt-8 rounded-xl p-8"
        style={{ backgroundColor: '#ffffff', border: '1px solid #e8e4df' }}
      >
        <p style={{ color: '#6b7280' }}>
          The rescheduling feature is coming soon.
        </p>
      </div>
      <Link
        href="/"
        className="mt-6 inline-block text-sm transition-colors duration-200"
        style={{ color: '#6b7280' }}
      >
        &larr; Back to all rooms
      </Link>
    </div>
  )
}
