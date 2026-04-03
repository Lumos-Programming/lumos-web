'use client'

import * as React from 'react'
import { type ThemeProviderProps } from 'next-themes'

// next-themes 0.4.x renders a <script> via React.createElement, which triggers
// a console warning in React 19. We re-implement the provider to avoid it.

interface ThemeContextValue {
  theme: string
  setTheme: (value: string | ((prev: string) => string)) => void
  resolvedTheme: string
  themes: string[]
  systemTheme: 'light' | 'dark' | undefined
  forcedTheme: string | undefined
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined)

export function ThemeProvider({
  children,
  attribute = 'class',
  defaultTheme = 'system',
  enableSystem = true,
  disableTransitionOnChange = false,
  storageKey = 'theme',
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<string>(() => {
    if (typeof window === 'undefined') return defaultTheme
    try {
      return localStorage.getItem(storageKey) || defaultTheme
    } catch {
      return defaultTheme
    }
  })

  const [systemThemeState, setSystemThemeState] = React.useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  const resolvedTheme = theme !== 'system' ? theme : systemThemeState

  const setTheme = React.useCallback((value: string | ((prev: string) => string)) => {
    setThemeState((prev) => {
      const next = typeof value === 'function' ? value(prev) : value
      try { localStorage.setItem(storageKey, next) } catch {}
      return next
    })
  }, [storageKey])

  // Apply theme to <html>
  React.useEffect(() => {
    const root = document.documentElement

    if (attribute === 'class') {
      root.classList.remove('light', 'dark')
      root.classList.add(resolvedTheme)
    } else if (typeof attribute === 'string') {
      root.setAttribute(attribute, resolvedTheme)
    }
    root.style.colorScheme = resolvedTheme

    if (disableTransitionOnChange) {
      const style = document.createElement('style')
      style.appendChild(document.createTextNode('*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;transition:none!important}'))
      document.head.appendChild(style)
      window.getComputedStyle(document.body)
      setTimeout(() => document.head.removeChild(style), 1)
    }
  }, [resolvedTheme, attribute, disableTransitionOnChange])

  // Listen for system theme changes
  React.useEffect(() => {
    if (!enableSystem) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => { setSystemThemeState(e.matches ? 'dark' : 'light') }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [enableSystem])

  // Listen for storage changes (cross-tab sync)
  React.useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === storageKey) setThemeState(e.newValue || defaultTheme)
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [storageKey, defaultTheme])

  const value = React.useMemo(() => ({
    theme,
    setTheme,
    resolvedTheme,
    themes: enableSystem ? ['light', 'dark', 'system'] : ['light', 'dark'],
    systemTheme: systemThemeState,
    forcedTheme: undefined,
  }), [theme, setTheme, resolvedTheme, enableSystem, systemThemeState])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
