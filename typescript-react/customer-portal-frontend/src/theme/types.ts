import { SxProps, Theme } from '@mui/material'

export interface CustomStyles {
  customLinkStyling: SxProps<Theme>
}

// Extend the MUI theme type to include customizations for reuse
declare module '@mui/material/styles' {
  interface Theme {
    customStyles: CustomStyles
  }

  interface ThemeOptions {
    customStyles?: CustomStyles
  }
}
