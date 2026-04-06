import Link from 'next/link'
import Image from 'next/image'

export default function Header() {
  return (
    <header className="sticky top-0 z-50" style={{ backgroundColor: '#2D3038' }}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center">
          <Image
            src="/SYZO-logo.png"
            alt="SYZO"
            width={100}
            height={32}
            priority
            className="h-8 w-auto"
          />
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium">
          <Link
            href="/"
            className="transition-colors duration-200"
            style={{ color: 'rgba(255,255,255,0.7)' }}
            onMouseEnter={undefined}
          >
            Browse Rooms
          </Link>
        </nav>
      </div>
    </header>
  )
}
