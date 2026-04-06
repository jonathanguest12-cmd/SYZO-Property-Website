export default function PropertyLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="h-5 w-32 animate-pulse rounded mb-6" style={{ backgroundColor: '#E0E0E0' }} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="aspect-[4/3] w-full animate-pulse" style={{ borderRadius: '12px', backgroundColor: '#E0E0E0' }} />
        <div className="flex flex-col gap-4">
          <div className="h-8 w-3/4 animate-pulse rounded" style={{ backgroundColor: '#E0E0E0' }} />
          <div className="h-5 w-1/3 animate-pulse rounded" style={{ backgroundColor: '#E0E0E0' }} />
          <div className="h-20 w-full animate-pulse rounded" style={{ backgroundColor: '#E0E0E0' }} />
        </div>
      </div>

      <div className="mt-8">
        <div className="h-7 w-48 animate-pulse rounded mb-4" style={{ backgroundColor: '#E0E0E0' }} />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="overflow-hidden bg-white" style={{ borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <div className="aspect-[4/3] w-full animate-pulse" style={{ backgroundColor: '#E0E0E0' }} />
              <div className="flex flex-col gap-2 p-4">
                <div className="h-4 w-3/4 animate-pulse rounded" style={{ backgroundColor: '#E0E0E0' }} />
                <div className="h-6 w-1/2 animate-pulse rounded" style={{ backgroundColor: '#E0E0E0' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
