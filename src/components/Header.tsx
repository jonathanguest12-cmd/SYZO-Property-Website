'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

export default function Header() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className="sticky top-0 z-50 transition-all duration-300"
      style={{
        backgroundColor: scrolled ? 'rgba(247, 246, 243, 0.95)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(45, 48, 56, 0.06)' : '1px solid transparent',
      }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 md:px-8">
        <Link href="/" className="inline-flex items-center">
          <Image
            src="/SYZO-logo.png"
            alt="SYZO"
            width={48}
            height={48}
            priority
            className="h-10 w-auto"
          />
        </Link>
        <nav className="flex items-center gap-8">
          <Link
            href="/"
            className="text-sm font-medium tracking-wide transition-colors duration-200"
            style={{ color: '#2D3038' }}
          >
            Rooms
          </Link>
          <a
            href="tel:01174504898"
            className="text-sm font-medium tracking-wide transition-colors duration-200"
            style={{ color: '#6B7280' }}
          >
            0117 450 4898
          </a>
        </nav>
      </div>
    </header>
  )
}
