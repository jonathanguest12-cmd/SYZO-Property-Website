export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Results bar skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-5 w-32 animate-pulse rounded" style={{ backgroundColor: '#E0E0E0' }} />
        <div className="flex items-center gap-3">
          <div className="h-9 w-40 animate-pulse rounded-full" style={{ backgroundColor: '#E0E0E0' }} />
          <div className="h-9 w-24 animate-pulse rounded-full" style={{ backgroundColor: '#E0E0E0' }} />
        </div>
      </div>

      {/* Card grid skeleton */}
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="overflow-hidden bg-white"
            style={{ borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
          >
            <div className="aspect-[4/3] w-full animate-pulse" style={{ backgroundColor: '#E0E0E0' }} />
            <div className="flex flex-col gap-2 p-4">
              <div className="h-5 w-3/4 animate-pulse rounded" style={{ backgroundColor: '#E0E0E0' }} />
              <div className="h-4 w-1/2 animate-pulse rounded" style={{ backgroundColor: '#E0E0E0' }} />
              <div className="h-6 w-1/3 animate-pulse rounded" style={{ backgroundColor: '#E0E0E0' }} />
              <div className="h-4 w-full animate-pulse rounded" style={{ backgroundColor: '#E0E0E0' }} />
              <div className="flex justify-between items-center pt-2">
                <div className="h-4 w-24 animate-pulse rounded" style={{ backgroundColor: '#E0E0E0' }} />
                <div className="h-8 w-24 animate-pulse rounded-full" style={{ backgroundColor: '#E0E0E0' }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
