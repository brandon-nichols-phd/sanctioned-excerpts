import { TypographyVariantsOptions } from '@mui/material/styles'

export const typography: TypographyVariantsOptions = {
  fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  h1: {
    fontSize: '2.25rem',
    fontWeight: 500,
  },
  h2: {
    fontSize: '1.75rem',
    fontWeight: 500,
  },
  h3: {
    fontSize: '1.5rem',
    fontWeight: 500,
  },
  body1: {
    fontSize: '1rem',
    lineHeight: 1.5,
  },
  button: {
    textTransform: 'none' as const,
    fontWeight: 600,
  },
}
