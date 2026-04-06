import Link from 'next/link'
import Image from 'next/image'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 py-4 px-6 md:px-12" style={{ backgroundColor: '#1a1a2e' }}>
      <div className="mx-auto flex max-w-7xl items-center">
        <Link href="/" className="flex items-center">
          <Image
            src="/SYZO-logo.png"
            alt="SYZO"
            width={48}
            height={48}
            priority
            className="h-12 w-auto"
          />
        </Link>
      </div>
    </header>
  )
}
