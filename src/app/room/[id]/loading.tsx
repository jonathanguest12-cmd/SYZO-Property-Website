export default function RoomLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8">
      {/* Back link skeleton */}
      <div className="h-5 w-32 animate-pulse rounded mb-6" style={{ backgroundColor: '#e8e4df' }} />

      {/* Photo gallery skeleton */}
      <div className="mx-auto max-w-4xl">
        <div className="w-full animate-pulse rounded-2xl" style={{ aspectRatio: '3/2', maxHeight: '500px', backgroundColor: '#e8e4df' }} />
        <div className="mt-3 flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse rounded-lg" style={{ width: '64px', height: '64px', backgroundColor: '#e8e4df' }} />
          ))}
        </div>
      </div>

      {/* Content skeleton */}
      <div className="mt-8 grid gap-8 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-7">
          <div>
            <div className="h-9 w-3/4 animate-pulse rounded" style={{ backgroundColor: '#e8e4df' }} />
            <div className="mt-2 h-5 w-1/2 animate-pulse rounded" style={{ backgroundColor: '#e8e4df' }} />
          </div>

          {/* Letting details card skeleton */}
          <div className="rounded-xl p-6" style={{ backgroundColor: '#ffffff', border: '1px solid #e8e4df' }}>
            <div className="h-6 w-40 animate-pulse rounded mb-4" style={{ backgroundColor: '#e8e4df' }} />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex justify-between py-3">
                <div className="h-4 w-16 animate-pulse rounded" style={{ backgroundColor: '#e8e4df' }} />
                <div className="h-4 w-24 animate-pulse rounded" style={{ backgroundColor: '#e8e4df' }} />
              </div>
            ))}
          </div>

          {/* Description card skeleton */}
          <div className="rounded-xl p-6" style={{ backgroundColor: '#ffffff', border: '1px solid #e8e4df' }}>
            <div className="h-6 w-40 animate-pulse rounded mb-4" style={{ backgroundColor: '#e8e4df' }} />
            <div className="flex flex-col gap-2">
              <div className="h-4 w-full animate-pulse rounded" style={{ backgroundColor: '#e8e4df' }} />
              <div className="h-4 w-full animate-pulse rounded" style={{ backgroundColor: '#e8e4df' }} />
              <div className="h-4 w-2/3 animate-pulse rounded" style={{ backgroundColor: '#e8e4df' }} />
            </div>
          </div>
        </div>

        {/* Sidebar skeleton */}
        <div className="lg:col-span-5">
          <div className="rounded-xl p-6" style={{ backgroundColor: '#ffffff', border: '1px solid #e8e4df' }}>
            <div className="h-10 w-32 animate-pulse rounded mb-3" style={{ backgroundColor: '#e8e4df' }} />
            <div className="h-4 w-24 animate-pulse rounded mb-3" style={{ backgroundColor: '#e8e4df' }} />
            <div className="h-4 w-32 animate-pulse rounded mb-4" style={{ backgroundColor: '#e8e4df' }} />
            <div className="h-12 w-full animate-pulse rounded-xl" style={{ backgroundColor: '#e8e4df' }} />
          </div>
        </div>
      </div>
    </div>
  )
}
