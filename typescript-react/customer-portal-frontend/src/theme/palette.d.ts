import { PaletteOptions } from '@mui/material/styles'
import { ExtendedColorPalette } from './colors'

declare module '@mui/material/styles' {
  type palette = PaletteOptions & ExtendedColorPalette
}
