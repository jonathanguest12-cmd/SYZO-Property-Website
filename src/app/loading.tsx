export default function Loading() {
  return (
    <>
      {/* Hero skeleton */}
      <div style={{ backgroundColor: '#1a1a2e' }}>
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-28 md:px-8">
          <div className="h-4 w-40 animate-pulse rounded" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
          <div className="mt-4 h-12 w-80 animate-pulse rounded" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
          <div className="mt-6 h-5 w-96 animate-pulse rounded" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8">
        {/* Results bar skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-5 w-32 animate-pulse rounded" style={{ backgroundColor: '#e8e4df' }} />
          <div className="flex items-center gap-3">
            <div className="h-9 w-40 animate-pulse rounded-full" style={{ backgroundColor: '#e8e4df' }} />
            <div className="h-9 w-24 animate-pulse rounded-full" style={{ backgroundColor: '#e8e4df' }} />
          </div>
        </div>

        {/* Card grid skeleton */}
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 md:gap-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl"
              style={{ backgroundColor: '#ffffff', border: '1px solid #e8e4df' }}
            >
              <div className="w-full animate-pulse" style={{ aspectRatio: '4/3', maxHeight: '200px', backgroundColor: '#e8e4df' }} />
              <div className="flex flex-col gap-2 p-5">
                <div className="h-5 w-3/4 animate-pulse rounded" style={{ backgroundColor: '#e8e4df' }} />
                <div className="h-4 w-1/2 animate-pulse rounded" style={{ backgroundColor: '#e8e4df' }} />
                <div className="h-7 w-1/3 animate-pulse rounded" style={{ backgroundColor: '#e8e4df' }} />
                <div className="flex justify-between items-center pt-2">
                  <div className="h-4 w-24 animate-pulse rounded" style={{ backgroundColor: '#e8e4df' }} />
                  <div className="h-4 w-20 animate-pulse rounded" style={{ backgroundColor: '#e8e4df' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
