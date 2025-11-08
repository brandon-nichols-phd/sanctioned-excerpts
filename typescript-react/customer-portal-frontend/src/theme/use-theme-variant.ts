import { useMemo } from 'react'
import { createTheme, responsiveFontSizes, Theme } from '@mui/material/styles'
import { getPaletteByMode } from './colors'
import { typography } from './typography'
import getOverrides from './overrides' // <- this is your function
import { customStyles } from './custom'

export type ThemeVariant = 'light' | 'dark'

export const useThemeVariant = (mode: ThemeVariant): Theme => {
  return useMemo(() => {
    // Step 1: Create the base theme
    let baseTheme = createTheme({
      palette: getPaletteByMode(mode),
      typography,
    })

    // Step 2: Inject component overrides using the theme
    baseTheme = createTheme(baseTheme, {
      components: getOverrides(baseTheme),
      customStyles: customStyles(baseTheme),
    })

    return responsiveFontSizes(baseTheme)
  }, [mode])
}
