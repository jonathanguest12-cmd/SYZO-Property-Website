import Link from 'next/link'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-2xl font-bold tracking-tight text-gray-900">
          SYZO
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium">
          <Link
            href="/"
            className="text-gray-900 hover:text-gray-600 transition-colors"
          >
            Browse Rooms
          </Link>
          <span className="text-gray-400 cursor-default">About</span>
        </nav>
      </div>
    </header>
  )
}
