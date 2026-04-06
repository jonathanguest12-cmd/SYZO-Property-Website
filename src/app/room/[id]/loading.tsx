export default function RoomLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back link skeleton */}
      <div className="h-5 w-32 animate-pulse rounded mb-6" style={{ backgroundColor: '#E0E0E0' }} />

      {/* Photo gallery skeleton */}
      <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
        <div className="aspect-[4/3] w-full animate-pulse" style={{ borderRadius: '12px', backgroundColor: '#E0E0E0' }} />
        <div className="hidden lg:grid lg:grid-cols-1 lg:grid-rows-2 gap-3">
          <div className="aspect-[4/3] w-full animate-pulse" style={{ borderRadius: '12px', backgroundColor: '#E0E0E0' }} />
          <div className="aspect-[4/3] w-full animate-pulse" style={{ borderRadius: '12px', backgroundColor: '#E0E0E0' }} />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="mt-8 grid gap-8 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-6">
          <div>
            <div className="h-8 w-3/4 animate-pulse rounded" style={{ backgroundColor: '#E0E0E0' }} />
            <div className="mt-2 h-5 w-1/2 animate-pulse rounded" style={{ backgroundColor: '#E0E0E0' }} />
          </div>

          {/* Key details grid skeleton */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 animate-pulse" style={{ borderRadius: '12px', backgroundColor: '#E0E0E0' }} />
            ))}
          </div>

          {/* Description skeleton */}
          <div className="flex flex-col gap-2">
            <div className="h-6 w-40 animate-pulse rounded" style={{ backgroundColor: '#E0E0E0' }} />
            <div className="h-4 w-full animate-pulse rounded" style={{ backgroundColor: '#E0E0E0' }} />
            <div className="h-4 w-full animate-pulse rounded" style={{ backgroundColor: '#E0E0E0' }} />
            <div className="h-4 w-2/3 animate-pulse rounded" style={{ backgroundColor: '#E0E0E0' }} />
          </div>
        </div>

        {/* Sidebar skeleton */}
        <div className="hidden lg:block">
          <div className="h-48 animate-pulse" style={{ borderRadius: '12px', backgroundColor: '#E0E0E0' }} />
        </div>
      </div>
    </div>
  )
}
