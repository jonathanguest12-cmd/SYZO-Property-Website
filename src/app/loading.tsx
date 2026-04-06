export default function Loading() {
  return (
    <>
      {/* Hero skeleton */}
      <div style={{ backgroundColor: '#F7F6F3' }}>
        <div className="mx-auto max-w-7xl px-6 pt-8 pb-12 md:pt-12 md:pb-16 md:px-8">
          <div className="h-3 w-32 animate-pulse rounded" style={{ backgroundColor: '#E5E3DF' }} />
          <div className="mt-3 h-10 w-80 animate-pulse rounded" style={{ backgroundColor: '#E5E3DF' }} />
          <div className="mt-4 h-5 w-96 animate-pulse rounded" style={{ backgroundColor: '#E5E3DF' }} />
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">
        {/* Results bar skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-5 w-32 animate-pulse rounded" style={{ backgroundColor: '#E5E3DF' }} />
          <div className="flex items-center gap-2">
            <div className="h-9 w-36 animate-pulse rounded-lg" style={{ backgroundColor: '#E5E3DF' }} />
            <div className="h-9 w-20 animate-pulse rounded-lg" style={{ backgroundColor: '#E5E3DF' }} />
          </div>
        </div>

        {/* Card grid skeleton */}
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 md:gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="overflow-hidden rounded-xl bg-white"
              style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
            >
              <div className="w-full animate-pulse" style={{ aspectRatio: '16/10', maxHeight: '200px', backgroundColor: '#E5E3DF' }} />
              <div className="flex flex-col gap-3 p-5">
                <div className="h-5 w-3/4 animate-pulse rounded" style={{ backgroundColor: '#E5E3DF' }} />
                <div className="h-4 w-1/2 animate-pulse rounded" style={{ backgroundColor: '#E5E3DF' }} />
                <div className="h-6 w-1/3 animate-pulse rounded" style={{ backgroundColor: '#E5E3DF' }} />
                <div className="flex justify-between items-center pt-3" style={{ borderTop: '1px solid #F0EFEC' }}>
                  <div className="h-4 w-24 animate-pulse rounded" style={{ backgroundColor: '#E5E3DF' }} />
                  <div className="h-4 w-20 animate-pulse rounded" style={{ backgroundColor: '#E5E3DF' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
