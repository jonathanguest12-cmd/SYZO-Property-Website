import Link from 'next/link'
import Image from 'next/image'

export default function Footer() {
  return (
    <footer style={{ backgroundColor: '#1a1a2e' }}>
      <div className="mx-auto max-w-7xl py-12 px-6 md:px-12">
        <div className="flex flex-col items-center gap-8 md:flex-row md:items-start md:justify-between">
          {/* Left: Logo + company */}
          <div className="flex flex-col items-center gap-4 md:items-start">
            <Image
              src="/SYZO-logo.png"
              alt="SYZO"
              width={120}
              height={40}
              style={{ objectFit: 'contain' }}
            />
            <p className="text-sm" style={{ color: '#e2e8f0' }}>
              SYZO Ltd.
            </p>
          </div>

          {/* Right: Address + contact */}
          <div className="flex flex-col items-center gap-4 text-sm md:items-end md:text-right" style={{ color: '#e2e8f0' }}>
            <div>
              <p>Rutland House, Lynch Wood,</p>
              <p>Peterborough, PE2 6PZ</p>
            </div>
            <div className="flex flex-col items-center gap-1 md:items-end">
              <a href="tel:01174504898" className="hover:text-white transition-colors duration-200">
                0117 450 4898
              </a>
              <a href="mailto:hello@syzo.co" className="hover:text-white transition-colors duration-200">
                hello@syzo.co
              </a>
            </div>
            <div className="flex gap-4 text-sm" style={{ color: '#e2e8f0' }}>
              <Link href="/privacy" className="hover:text-white transition-colors duration-200 underline underline-offset-2">
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>

        <div
          className="mt-8 border-t pt-6 text-center text-sm md:text-left"
          style={{ borderColor: 'rgba(255,255,255,0.1)', color: '#e2e8f0' }}
        >
          &copy; 2026 SYZO Ltd. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
