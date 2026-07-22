'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'

const links = [
  { name: 'Home', href: '/' },
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Docs', href: '/docs/api' },
  { name: 'Support', href: '/support/diagnostics' },
  { name: 'Extension', href: '/chrome-extension' },
]

export default function PublicHeader() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      <header className="sticky top-0 z-50 bg-[#0a0a0f]/90 backdrop-blur-md border-b border-white/[0.05]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <span className="text-lg font-black tracking-tight text-white select-none">
              STAGE
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold">
            {links.map((link) => {
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`transition-colors duration-200 ${
                    isActive ? 'text-purple-400 font-black' : 'text-white/50 hover:text-white'
                  }`}
                >
                  {link.name}
                </Link>
              )
            })}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-black text-xs transition-all shadow-lg shadow-purple-900/20"
            >
              Open Dashboard
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden p-2 rounded-lg bg-white/[0.03] border border-white/5 text-white/50 hover:text-white transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 pt-16">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <nav className="relative bg-[#0c0c0e] border-b border-white/[0.06] flex flex-col px-6 py-5 gap-4">
            {links.map((link) => {
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`text-sm font-bold py-2 transition-colors ${
                    isActive ? 'text-purple-400' : 'text-white/60 hover:text-white'
                  }`}
                >
                  {link.name}
                </Link>
              )
            })}
            <Link
              href="/dashboard"
              onClick={() => setMobileOpen(false)}
              className="mt-2 px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs text-center transition-all"
            >
              Open Dashboard
            </Link>
          </nav>
        </div>
      )}
    </>
  )
}
