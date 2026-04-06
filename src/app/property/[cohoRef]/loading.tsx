export default function PropertyLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8">
      <div className="h-5 w-32 animate-pulse rounded mb-6" style={{ backgroundColor: '#e8e4df' }} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="w-full animate-pulse rounded-2xl" style={{ aspectRatio: '4/3', backgroundColor: '#e8e4df' }} />
        <div className="flex flex-col gap-4">
          <div className="h-9 w-3/4 animate-pulse rounded" style={{ backgroundColor: '#e8e4df' }} />
          <div className="h-5 w-1/3 animate-pulse rounded" style={{ backgroundColor: '#e8e4df' }} />
          <div className="h-20 w-full animate-pulse rounded" style={{ backgroundColor: '#e8e4df' }} />
        </div>
      </div>

      <div className="mt-10">
        <div className="h-8 w-48 animate-pulse rounded mb-4" style={{ backgroundColor: '#e8e4df' }} />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 md:gap-8">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl"
              style={{ backgroundColor: '#ffffff', border: '1px solid #e8e4df' }}
            >
              <div className="w-full animate-pulse" style={{ aspectRatio: '4/3', maxHeight: '200px', backgroundColor: '#e8e4df' }} />
              <div className="flex flex-col gap-2 p-5">
                <div className="h-4 w-3/4 animate-pulse rounded" style={{ backgroundColor: '#e8e4df' }} />
                <div className="h-7 w-1/2 animate-pulse rounded" style={{ backgroundColor: '#e8e4df' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
