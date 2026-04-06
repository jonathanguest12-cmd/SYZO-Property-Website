export default function RoomLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">
      {/* Back link skeleton */}
      <div className="h-5 w-32 animate-pulse rounded mb-6" style={{ backgroundColor: '#E5E3DF' }} />

      {/* Photo gallery skeleton */}
      <div className="mx-auto max-w-4xl">
        <div className="w-full animate-pulse rounded-xl" style={{ aspectRatio: '3/2', maxHeight: '500px', backgroundColor: '#E5E3DF' }} />
        <div className="mt-3 flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse rounded-lg" style={{ width: '72px', height: '52px', backgroundColor: '#E5E3DF' }} />
          ))}
        </div>
      </div>

      {/* Content skeleton */}
      <div className="mt-8 grid gap-8 lg:grid-cols-12">
        <div className="flex flex-col gap-5 lg:col-span-7">
          <div>
            <div className="h-8 w-3/4 animate-pulse rounded" style={{ backgroundColor: '#E5E3DF' }} />
            <div className="mt-2 h-5 w-1/2 animate-pulse rounded" style={{ backgroundColor: '#E5E3DF' }} />
          </div>

          {/* Letting details card skeleton */}
          <div className="rounded-xl bg-white p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="h-4 w-32 animate-pulse rounded mb-4" style={{ backgroundColor: '#E5E3DF' }} />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex justify-between py-3">
                <div className="h-4 w-16 animate-pulse rounded" style={{ backgroundColor: '#E5E3DF' }} />
                <div className="h-4 w-24 animate-pulse rounded" style={{ backgroundColor: '#E5E3DF' }} />
              </div>
            ))}
          </div>

          {/* Description card skeleton */}
          <div className="rounded-xl bg-white p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="h-4 w-32 animate-pulse rounded mb-4" style={{ backgroundColor: '#E5E3DF' }} />
            <div className="flex flex-col gap-2">
              <div className="h-4 w-full animate-pulse rounded" style={{ backgroundColor: '#E5E3DF' }} />
              <div className="h-4 w-full animate-pulse rounded" style={{ backgroundColor: '#E5E3DF' }} />
              <div className="h-4 w-2/3 animate-pulse rounded" style={{ backgroundColor: '#E5E3DF' }} />
            </div>
          </div>
        </div>

        {/* Sidebar skeleton */}
        <div className="lg:col-span-5">
          <div className="rounded-xl bg-white p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="h-9 w-32 animate-pulse rounded mb-3" style={{ backgroundColor: '#E5E3DF' }} />
            <div className="h-4 w-24 animate-pulse rounded mb-3" style={{ backgroundColor: '#E5E3DF' }} />
            <div className="h-4 w-32 animate-pulse rounded mb-4" style={{ backgroundColor: '#E5E3DF' }} />
            <div className="h-12 w-full animate-pulse rounded-lg" style={{ backgroundColor: '#E5E3DF' }} />
          </div>
        </div>
      </div>
    </div>
  )
}
