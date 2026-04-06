import Link from 'next/link'
import Image from 'next/image'

export default function Footer() {
  return (
    <footer style={{ backgroundColor: '#2D3038', color: '#FFFFFF' }}>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2">
          {/* Left column: Logo + company info */}
          <div className="flex flex-col gap-4">
            <Image
              src="/SYZO-logo.png"
              alt="SYZO"
              width={100}
              height={32}
              className="h-8 w-auto"
            />
            <div className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
              <p>Rutland House, Lynch Wood,</p>
              <p>Peterborough, PE2 6PZ</p>
            </div>
          </div>

          {/* Right column: Contact + legal */}
          <div className="flex flex-col gap-4 md:items-end">
            <div className="flex flex-col gap-1 text-sm md:text-right" style={{ color: 'rgba(255,255,255,0.6)' }}>
              <a href="tel:01174504898" className="hover:text-white transition-colors duration-200">
                0117 450 4898
              </a>
              <a href="mailto:hello@syzo.co" className="hover:text-white transition-colors duration-200">
                hello@syzo.co
              </a>
            </div>
            <div className="flex gap-4 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
              <Link href="/privacy" className="hover:text-white transition-colors duration-200">
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>

        <div
          className="mt-8 border-t pt-6 text-sm"
          style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}
        >
          &copy; 2026 SYZO Ltd. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
