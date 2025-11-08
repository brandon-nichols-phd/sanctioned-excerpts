import React, { createContext, useContext, useMemo, useState, ReactNode } from 'react'
import { ThemeProvider, CssBaseline, Theme } from '@mui/material'
import { useThemeVariant } from './use-theme-variant'

export type ThemeVariant = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  mode: ThemeVariant
  toggleMode: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export const useAppTheme = () => {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('ThemeProvider not found.')
  return ctx
}

export const AppThemeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<ThemeVariant>('light')
  const theme = useThemeVariant(mode)

  const value = useMemo(
    () => ({
      theme,
      mode,
      toggleMode: () => setMode((prev) => (prev === 'light' ? 'dark' : 'light')),
    }),
    [mode, theme]
  )
  return (
    <ThemeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  )
}
