import Link from 'next/link'

export default function Footer() {
  return (
    <footer style={{ backgroundColor: '#2D3038' }}>
      <div className="mx-auto max-w-7xl px-6 py-16 md:px-8">
        {/* Top section */}
        <div className="grid gap-12 md:grid-cols-12">
          {/* Brand */}
          <div className="md:col-span-5">
            <p className="text-2xl font-bold tracking-[0.06em] text-white">SYZO</p>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Premium shared living in Plymouth and Newquay. Beautifully furnished rooms in professionally managed houses.
            </p>
          </div>

          {/* Contact */}
          <div className="md:col-span-4">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-white">Contact</p>
            <div className="mt-4 flex flex-col gap-2.5 text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
              <a
                href="tel:01174504898"
                className="transition-colors duration-200 hover:text-white"
              >
                0117 450 4898
              </a>
              <a
                href="mailto:hello@syzo.co"
                className="transition-colors duration-200 hover:text-white"
              >
                hello@syzo.co
              </a>
              <div className="mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                <p>Rutland House, Lynch Wood,</p>
                <p>Peterborough, PE2 6PZ</p>
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="md:col-span-3">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-white">Legal</p>
            <div className="mt-4 flex flex-col gap-2.5 text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
              <Link href="/privacy" className="transition-colors duration-200 hover:text-white">
                Privacy Policy
              </Link>
              <a href="https://www.syzo.co" target="_blank" rel="noopener noreferrer" className="transition-colors duration-200 hover:text-white">
                syzo.co
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="mt-14 border-t pt-6 text-sm"
          style={{ borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)' }}
        >
          &copy; {new Date().getFullYear()} SYZO Ltd. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
