import Link from 'next/link'

export default async function ReschedulePage({
  params,
}: {
  params: Promise<{ viewingId: string }>
}) {
  const { viewingId } = await params

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6 text-center">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl" style={{ color: '#2D3038' }}>
        Reschedule Viewing
      </h1>
      <p className="mt-4 text-sm" style={{ color: '#9CA3AF' }}>
        Viewing reference: {viewingId}
      </p>
      <div
        className="mt-8 rounded-xl bg-white p-8"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
      >
        <p style={{ color: '#6B7280' }}>
          The rescheduling feature is coming soon.
        </p>
      </div>
      <Link
        href="/"
        className="mt-6 inline-block text-sm font-medium transition-colors duration-200 hover:opacity-70"
        style={{ color: '#6B7280' }}
      >
        &larr; Back to all rooms
      </Link>
    </div>
  )
}
