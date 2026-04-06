'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

export default function Header() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 80)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      {/* Static logo — part of page flow */}
      <div className="px-6 pt-6 md:px-8">
        <div className="mx-auto max-w-7xl">
          <Link href="/" className="inline-flex items-center">
            <Image
              src="/SYZO-logo.png"
              alt="SYZO"
              width={56}
              height={56}
              priority
              className="h-14 w-auto"
            />
          </Link>
        </div>
      </div>

      {/* Sticky header — fades in on scroll */}
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-opacity duration-300"
        style={{
          opacity: scrolled ? 1 : 0,
          pointerEvents: scrolled ? 'auto' : 'none',
          backgroundColor: 'rgba(26, 26, 46, 0.95)',
          backdropFilter: 'blur(4px)',
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center px-6 py-3 md:px-8">
          <Link href="/" className="inline-flex items-center">
            <Image
              src="/SYZO-logo.png"
              alt="SYZO"
              width={32}
              height={32}
              className="h-8 w-auto"
            />
          </Link>
        </div>
      </header>
    </>
  )
}
