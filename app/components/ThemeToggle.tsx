'use client'

import React, { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
    setMounted(true)
  }, [])

  function toggleTheme() {
    const nextDark = !isDark
    setIsDark(nextDark)
    if (nextDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('pulseedu-theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('pulseedu-theme', 'light')
    }
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Disable dark mode' : 'Enable dark mode'}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold transition cursor-pointer shadow-xs"
    >
      {mounted ? (
        isDark ? (
          <Sun className="w-3.5 h-3.5 text-amber-400" />
        ) : (
          <Moon className="w-3.5 h-3.5 text-indigo-600" />
        )
      ) : (
        <Moon className="w-3.5 h-3.5 text-slate-400" />
      )}
      <span className="hidden sm:inline">{mounted && isDark ? 'Light Mode' : 'Dark Mode'}</span>
    </button>
  )
}
