'use client'

import { useState } from 'react'

const navLinks = [
  { label: '功能特点', href: '#features' },
  { label: '使用流程', href: '#how-it-works' },
  { label: '常见问题', href: '#faq' },
]

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  const scrollTo = (href: string) => {
    setMenuOpen(false)
    const el = document.querySelector(href)
    el?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2 text-lg font-bold text-gray-800">
          <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          试卷切题助手
        </a>

        <div className="hidden md:flex items-center gap-6">
          {navLinks.map(link => (
            <button key={link.href} onClick={() => scrollTo(link.href)} className="text-sm text-gray-600 hover:text-primary transition-colors">
              {link.label}
            </button>
          ))}
          <button onClick={() => scrollTo('#tools')} className="text-sm bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors">
            开始使用
          </button>
        </div>

        <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3">
          {navLinks.map(link => (
            <button key={link.href} onClick={() => scrollTo(link.href)} className="block w-full text-left text-sm text-gray-600 py-1">
              {link.label}
            </button>
          ))}
          <button onClick={() => scrollTo('#tools')} className="w-full text-sm bg-primary text-white px-4 py-2 rounded-lg">
            开始使用
          </button>
        </div>
      )}
    </nav>
  )
}
