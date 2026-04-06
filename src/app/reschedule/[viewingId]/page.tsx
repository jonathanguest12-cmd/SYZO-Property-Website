import Link from 'next/link'

export default async function ReschedulePage({
  params,
}: {
  params: Promise<{ viewingId: string }>
}) {
  const { viewingId } = await params

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6 text-center">
      <h1 className="text-2xl font-bold text-gray-900">Reschedule Viewing</h1>
      <p className="mt-4 text-gray-600">
        Viewing reference: {viewingId}
      </p>
      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-8">
        <p className="text-gray-500">
          The rescheduling feature is coming soon.
        </p>
      </div>
      <Link
        href="/"
        className="mt-6 inline-block text-sm text-gray-500 hover:text-gray-700"
      >
        &larr; Back to all rooms
      </Link>
    </div>
  )
}
