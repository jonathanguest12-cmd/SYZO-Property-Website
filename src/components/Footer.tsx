import Link from 'next/link'

export default function Footer() {
  return (
    <footer style={{ backgroundColor: '#1a1a2e' }}>
      <div className="mx-auto max-w-7xl py-16 px-6 md:px-8">
        <div className="grid gap-10 text-center md:grid-cols-3 md:text-left">
          {/* Brand */}
          <div>
            <p className="text-xl font-bold tracking-[0.08em] text-white">SYZO</p>
            <p className="mt-2 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Premium shared living in the South West.
            </p>
          </div>

          {/* Contact */}
          <div className="flex flex-col gap-2 text-sm" style={{ color: '#e2e8f0' }}>
            <p className="font-semibold text-white">Contact</p>
            <a href="tel:01174504898" className="transition-colors duration-200 hover:text-white" style={{ color: '#e2e8f0' }}>
              0117 450 4898
            </a>
            <a href="mailto:hello@syzo.co" className="transition-colors duration-200 hover:text-white" style={{ color: '#e2e8f0' }}>
              hello@syzo.co
            </a>
            <div className="mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
              <p>Rutland House, Lynch Wood,</p>
              <p>Peterborough, PE2 6PZ</p>
            </div>
          </div>

          {/* Legal */}
          <div className="flex flex-col gap-2 text-sm" style={{ color: '#e2e8f0' }}>
            <p className="font-semibold text-white">Legal</p>
            <Link href="/privacy" className="transition-colors duration-200 hover:text-white" style={{ color: '#e2e8f0' }}>
              Privacy Policy
            </Link>
          </div>
        </div>

        <div
          className="mt-12 border-t pt-6 text-center text-sm"
          style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}
        >
          &copy; 2026 SYZO Ltd. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
